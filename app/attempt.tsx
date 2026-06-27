import { useEffect, useState } from "react"
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { supabase } from "@/lib/supabase"
import { getArticle, getPartTitles, getAllQuestions, STANDARD_PART_TITLES } from "@/lib/data"

interface AttemptDetail {
  article_id: string | null
  kind: string
  score: number
  total_points: number
  finished_at: string
  total_seconds: number | null
  expected_seconds: number | null
}

interface AnswerRow {
  part_number: number
  is_correct: boolean
  points_earned: number
}

interface PartStat {
  title: string
  correct: number
  total: number
  earned: number
  possible: number
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatSeconds(s: number): string {
  const totalMinutes = Math.floor(s / 60)
  const sec = s % 60

  // Less than 1 minute: show seconds only
  if (totalMinutes === 0) return `${sec} 秒`

  // Less than 1 hour: show minutes (and seconds if non-zero)
  if (totalMinutes < 60) {
    if (sec === 0) return `${totalMinutes} 分`
    return `${totalMinutes} 分 ${sec} 秒`
  }

  // 1 hour or more: show hours and minutes
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  // Less than 24 hours
  if (hours < 24) {
    if (mins === 0) return `${hours} 小時`
    return `${hours} 小時 ${mins} 分`
  }

  // 24 hours or more: show days and hours
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0) return `${days} 天`
  return `${days} 天 ${remainingHours} 小時`
}

function timeDelta(total: number, expected: number): { label: string; color: string; bg: string } {
  const diff = total - expected
  const absDiff = Math.abs(diff)

  // Less than 1 minute difference: on time
  if (absDiff < 60) return { label: "準時完成", color: "text-slate-500", bg: "bg-slate-50" }

  // Format the difference appropriately
  const diffMinutes = Math.floor(absDiff / 60)

  if (diffMinutes < 60) {
    // Less than 1 hour: show in minutes
    if (diff > 0) return { label: `超時 ${diffMinutes} 分`, color: "text-red-500", bg: "bg-red-50" }
    return { label: `快 ${diffMinutes} 分`, color: "text-amber-600", bg: "bg-amber-50" }
  }

  // 1 hour or more: show in hours
  const diffHours = Math.floor(diffMinutes / 60)
  const remainingMins = diffMinutes % 60
  const hourLabel = remainingMins > 0 ? `${diffHours} 小時 ${remainingMins} 分` : `${diffHours} 小時`

  if (diff > 0) return { label: `超時 ${hourLabel}`, color: "text-red-500", bg: "bg-red-50" }
  return { label: `快 ${hourLabel}`, color: "text-amber-600", bg: "bg-amber-50" }
}

export default function AttemptScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null)
  const [partStats, setPartStats] = useState<PartStat[]>([])

  useEffect(() => {
    async function load() {
      // Fetch session
      const { data: att, error: attErr } = await supabase
        .from("exercise_sessions")
        .select("article_id, kind, score, total_points, finished_at, total_seconds, expected_seconds")
        .eq("id", id)
        .single()

      if (attErr || !att) {
        setLoading(false)
        return
      }
      setAttempt(att as AttemptDetail)

      // Fetch answers
      const { data: answers, error: ansErr } = await supabase
        .from("exercise_answers")
        .select("question_id, is_correct, points_earned")
        .eq("session_id", id)

      if (ansErr) {
        setLoading(false)
        return
      }

      // Branch by kind to determine question source
      if (att.kind === "dse-training") {
        // DSE training: skip part breakdown (multi-article)
        setLoading(false)
        return
      }

      if (att.kind === "revision") {
        // Revision: skip part breakdown (cross-article mistakes)
        setLoading(false)
        return
      }

      if (att.kind === "weight-training") {
        // Weight training: join with cross_article_questions
        const questionIds = (answers || []).map(a => a.question_id).filter(Boolean)
        if (questionIds.length === 0) {
          setLoading(false)
          return
        }

        const { data: questions, error: qErr } = await supabase
          .from("cross_article_questions")
          .select("id, part, points")
          .in("id", questionIds)

        if (qErr) {
          setLoading(false)
          return
        }

        // Build question map
        const questionMap = new Map((questions || []).map(q => [String(q.id), q]))

        // Group answers by part (7 or 8)
        const grouped: Record<number, { correct: number; total: number; earned: number; possible: number }> = {}
        for (const a of (answers || [])) {
          const q = questionMap.get(String(a.question_id))
          if (!q) continue

          const part = q.part
          if (!grouped[part]) grouped[part] = { correct: 0, total: 0, earned: 0, possible: 0 }
          grouped[part].total++
          if (a.is_correct) grouped[part].correct++
          grouped[part].earned += a.points_earned
          grouped[part].possible += q.points || 1
        }

        // Build part stats with hardcoded titles for part 7 and 8
        const partTitles: Record<number, string> = {
          7: "第 7 部分：一詞多義",
          8: "第 8 部分：綜合題型",
        }

        setPartStats(
          Object.keys(grouped)
            .map(Number)
            .sort()
            .map((part) => ({
              title: partTitles[part] ?? `第 ${part} 部分`,
              ...grouped[part],
            }))
        )

        setLoading(false)
        return
      }

      // Article quiz: join with questions table (current logic)
      if (!att.article_id) {
        setLoading(false)
        return
      }

      const { data: questions, error: qErr } = await supabase
        .from("questions")
        .select("id, part, points")
        .eq("article_id", att.article_id)
        .eq("status", "published")

      if (qErr) {
        setLoading(false)
        return
      }

      // Build question map: id -> part
      const questionMap = new Map((questions || []).map(q => [String(q.id), q]))

      // Group answers by part
      const grouped: Record<number, { correct: number; total: number; earned: number }> = {}
      for (const a of (answers || [])) {
        const q = questionMap.get(String(a.question_id))
        if (!q) continue // Skip if question not found

        const part = q.part
        if (!grouped[part]) grouped[part] = { correct: 0, total: 0, earned: 0 }
        grouped[part].total++
        if (a.is_correct) grouped[part].correct++
        grouped[part].earned += a.points_earned
      }

      // Get part titles + possible points from local quiz data
      let titles: Record<number, string> = {}
      const partPossible: Record<number, number> = {}
      try {
        titles = getPartTitles(att.article_id)
        for (const q of getAllQuestions(att.article_id)) {
          partPossible[q.part] = (partPossible[q.part] ?? 0) + q.points
        }
      } catch {
        // quiz not cached locally — fall back to question data
        for (const q of questions || []) {
          partPossible[q.part] = (partPossible[q.part] ?? 0) + (q.points || 1)
        }
      }

      setPartStats(
        Object.keys(grouped)
          .map(Number)
          .sort()
          .map((part) => ({
            title: titles[part] ?? STANDARD_PART_TITLES[part] ?? `第 ${part} 部分`,
            ...grouped[part],
            possible: partPossible[part] ?? grouped[part].earned,
          }))
      )

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="small" color="#d97706" />
      </SafeAreaView>
    )
  }

  if (!attempt) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-400 text-sm">記錄不存在</Text>
      </SafeAreaView>
    )
  }

  const pct = Math.round((attempt.score / attempt.total_points) * 100)
  const delta =
    attempt.total_seconds != null && attempt.expected_seconds != null
      ? timeDelta(attempt.total_seconds, attempt.expected_seconds)
      : null

  // Determine title based on kind
  let articleTitle: string
  if (attempt.kind === "dse-training") {
    articleTitle = "DSE 模擬試"
  } else if (attempt.kind === "weight-training") {
    articleTitle = "重量訓練"
  } else if (attempt.kind === "revision") {
    articleTitle = "溫故知新"
  } else if (attempt.article_id) {
    try {
      articleTitle = getArticle(attempt.article_id).title
    } catch {
      articleTitle = attempt.article_id
    }
  } else {
    articleTitle = "文章練習"
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-6">
          <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
        </Pressable>

        <Text className="text-xl font-bold text-slate-800 mb-1" style={{ fontFamily: "Georgia" }}>
          {articleTitle}
        </Text>
        <Text className="text-xs text-slate-400 mb-6">{formatDate(attempt.finished_at)}</Text>

        {/* Overall score */}
        <View className="bg-white rounded-2xl border border-slate-100 px-5 py-4 mb-4">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">總分</Text>
          <View className="flex-row items-end gap-2">
            <Text className="text-4xl font-bold text-slate-800">{pct}%</Text>
            <Text className="text-slate-400 text-sm mb-1">{attempt.score} / {attempt.total_points} 分</Text>
          </View>
        </View>

        {/* Time */}
        {attempt.total_seconds != null && (
          <View className="bg-white rounded-2xl border border-slate-100 px-5 py-4 mb-4">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">完成時間</Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-slate-800">
                  {formatSeconds(attempt.total_seconds)}
                </Text>
                {attempt.expected_seconds != null && (
                  <Text className="text-xs text-slate-400 mt-0.5">
                    預期：{formatSeconds(attempt.expected_seconds)}
                  </Text>
                )}
              </View>
              {delta && (
                <View className={`rounded-xl px-3 py-1.5 ${delta.bg}`}>
                  <Text className={`text-sm font-semibold ${delta.color}`}>{delta.label}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Part breakdown */}
        {partStats.length > 0 && (
          <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <View className="px-5 py-3 border-b border-slate-100">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest">各部分表現</Text>
            </View>
            {partStats.map((part, i) => {
              const partPct = part.possible > 0 ? Math.round((part.earned / part.possible) * 100) : 0
              const barColor =
                partPct >= 80 ? "bg-amber-500" : partPct >= 50 ? "bg-amber-300" : "bg-slate-300"
              const shortTitle = part.title.replace(/^第.部分[：:]\s*/, "")
              return (
                <View
                  key={i}
                  className={`px-5 py-3 ${i < partStats.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm text-slate-700 flex-1 mr-3" numberOfLines={1}>
                      {shortTitle}
                    </Text>
                    <Text className="text-sm font-semibold text-slate-800">
                      {part.earned}/{part.possible} 分
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <View
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${partPct}%` }}
                      />
                    </View>
                    <Text className="text-xs text-slate-400 w-12 text-right">
                      {part.correct}/{part.total} 題
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
