import { useEffect, useState } from "react"
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { supabase } from "@/lib/supabase"
import { getArticle, getPartTitles, getAllQuestions, STANDARD_PART_TITLES } from "@/lib/data"
import { JianColors, JianTypography, JianRadius, getSerifFont, ProgressBar } from "@/components/jian"

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
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function formatSeconds(s: number): string {
  const totalMinutes = Math.floor(s / 60)
  const sec = s % 60

  // Less than 1 minute: show seconds only
  if (totalMinutes === 0) return `${sec}秒`

  // Less than 1 hour: show minutes (and seconds if non-zero)
  if (totalMinutes < 60) {
    if (sec === 0) return `${totalMinutes}分`
    return `${totalMinutes}分${sec}秒`
  }

  // 1 hour or more: show hours and minutes
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  // Less than 24 hours
  if (hours < 24) {
    if (mins === 0) return `${hours}小時`
    return `${hours}小時${mins}分`
  }

  // 24 hours or more: show days and hours
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0) return `${days}天`
  return `${days}天${remainingHours}小時`
}

function timeDelta(total: number, expected: number): { label: string; color: string; bg: string } {
  const diff = total - expected
  const absDiff = Math.abs(diff)

  // Less than 1 minute difference: on time
  if (absDiff < 60) return { label: "準時完成", color: JianColors.ink2, bg: JianColors.surface2 }

  // Format the difference appropriately
  const diffMinutes = Math.floor(absDiff / 60)

  if (diffMinutes < 60) {
    // Less than 1 hour: show in minutes
    if (diff > 0) return { label: `超時 ${diffMinutes}分`, color: JianColors.vermilion, bg: JianColors.vermilionTint }
    return { label: `快 ${diffMinutes}分`, color: JianColors.jade, bg: JianColors.jadeTint }
  }

  // 1 hour or more: show in hours
  const diffHours = Math.floor(diffMinutes / 60)
  const remainingMins = diffMinutes % 60
  const hourLabel = remainingMins > 0 ? `${diffHours}小時${remainingMins}分` : `${diffHours}小時`

  if (diff > 0) return { label: `超時 ${hourLabel}`, color: JianColors.vermilion, bg: JianColors.vermilionTint }
  return { label: `快 ${hourLabel}`, color: JianColors.jade, bg: JianColors.jadeTint }
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
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={JianColors.amber} />
      </SafeAreaView>
    )
  }

  if (!attempt) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{
          fontFamily: getSerifFont('400'),
          fontSize: 14,
          lineHeight: 22,
          color: JianColors.ink2
        }}>
          記錄不存在
        </Text>
      </SafeAreaView>
    )
  }

  const pct = Math.round((attempt.score / attempt.total_points) * 100)
  const progressVariant = pct >= 80 ? "jade" : pct >= 50 ? "amber" : "vermilion"
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
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          {({ pressed }) => (
            <Text style={{
              fontFamily: getSerifFont('400'),
              fontSize: 14,
              lineHeight: 20,
              color: JianColors.vermilion,
              marginBottom: 18,
              opacity: pressed ? 0.7 : 1
            }}>
              ‹ 返回
            </Text>
          )}
        </Pressable>

        <Text style={{
          fontFamily: getSerifFont('700'),
          fontSize: 21,
          lineHeight: 28,
          color: JianColors.ink,
          marginBottom: 6
        }}>
          {articleTitle}
        </Text>

        <Text style={{
          fontFamily: JianTypography.sans,
          fontSize: 11,
          color: JianColors.ink3,
          marginBottom: 18
        }}>
          {formatDate(attempt.finished_at)}
        </Text>

        {/* Overall score */}
        <View style={{
          backgroundColor: JianColors.surface2,
          borderWidth: 1,
          borderColor: JianColors.line,
          borderRadius: JianRadius.card,
          padding: 16,
          marginBottom: 12
        }}>
          <Text style={{
            fontFamily: JianTypography.sans,
            fontSize: 10,
            letterSpacing: 2,
            color: JianColors.ink3,
            marginBottom: 12
          }}>
            總 分
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
            <Text style={{
              fontFamily: getSerifFont('700'),
              fontSize: 42,
              lineHeight: 42,
              color: JianColors.ink
            }}>
              {pct}%
            </Text>
            <Text style={{
              fontFamily: JianTypography.number,
              fontSize: 16,
              color: JianColors.ink3,
              marginBottom: 4
            }}>
              {attempt.score} / {attempt.total_points} 分
            </Text>
          </View>
          <ProgressBar value={pct} variant={progressVariant} height={6} />
        </View>

        {/* Time */}
        {attempt.total_seconds != null && (
          <View style={{
            backgroundColor: JianColors.surface,
            borderWidth: 1,
            borderColor: JianColors.line,
            borderRadius: JianRadius.card,
            padding: 16,
            marginBottom: 12
          }}>
            <Text style={{
              fontFamily: JianTypography.sans,
              fontSize: 10,
              letterSpacing: 2,
              color: JianColors.ink3,
              marginBottom: 10
            }}>
              完 成 時 間
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{
                  fontFamily: getSerifFont('700'),
                  fontSize: 26,
                  lineHeight: 32,
                  color: JianColors.ink
                }}>
                  {formatSeconds(attempt.total_seconds)}
                </Text>
                {attempt.expected_seconds != null && (
                  <Text style={{
                    fontFamily: JianTypography.sans,
                    fontSize: 11,
                    color: JianColors.ink3,
                    marginTop: 2
                  }}>
                    預期：{formatSeconds(attempt.expected_seconds)}
                  </Text>
                )}
              </View>
              {delta && (
                <View style={{
                  backgroundColor: delta.bg,
                  borderWidth: 1,
                  borderColor: delta.bg === JianColors.jadeTint ? JianColors.jadeBorder : delta.bg === JianColors.vermilionTint ? JianColors.vermilionBorder : JianColors.line2,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6
                }}>
                  <Text style={{
                    fontFamily: JianTypography.sans,
                    fontSize: 12,
                    fontWeight: '600',
                    color: delta.color
                  }}>
                    {delta.label}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Part breakdown */}
        {partStats.length > 0 && (
          <View style={{
            backgroundColor: JianColors.surface,
            borderWidth: 1,
            borderColor: JianColors.line,
            borderRadius: JianRadius.card,
            overflow: 'hidden'
          }}>
            <View style={{
              padding: 16,
              borderBottomWidth: 1,
              borderColor: JianColors.line
            }}>
              <Text style={{
                fontFamily: JianTypography.sans,
                fontSize: 10,
                letterSpacing: 2,
                color: JianColors.ink3
              }}>
                各 部 分 表 現
              </Text>
            </View>
            {partStats.map((part, i) => {
              const partPct = part.possible > 0 ? Math.round((part.earned / part.possible) * 100) : 0
              const partVariant = partPct >= 80 ? "jade" : partPct >= 50 ? "amber" : "vermilion"
              const shortTitle = part.title.replace(/^第.部分[：:]\s*/, "")
              return (
                <View
                  key={i}
                  style={{
                    padding: 14,
                    borderBottomWidth: i < partStats.length - 1 ? 1 : 0,
                    borderColor: JianColors.line
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text
                      style={{
                        fontFamily: getSerifFont('600'),
                        fontSize: 14,
                        lineHeight: 20,
                        color: JianColors.ink,
                        flex: 1,
                        marginRight: 12
                      }}
                      numberOfLines={1}
                    >
                      {shortTitle}
                    </Text>
                    <Text style={{
                      fontFamily: JianTypography.number,
                      fontSize: 14,
                      fontWeight: '600',
                      color: JianColors.ink
                    }}>
                      {part.earned}/{part.possible} 分
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <ProgressBar value={partPct} variant={partVariant} height={5} />
                    </View>
                    <Text style={{
                      fontFamily: JianTypography.sans,
                      fontSize: 11,
                      color: JianColors.ink3,
                      width: 48,
                      textAlign: 'right'
                    }}>
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
