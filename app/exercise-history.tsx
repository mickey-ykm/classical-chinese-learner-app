import { useEffect, useState } from "react"
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { getArticleIndex } from "@/lib/data"

interface ExerciseSession {
  id: string
  article_id: string | null
  kind: string
  score: number
  total_points: number
  finished_at: string
  total_seconds: number | null
  expected_seconds: number | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatSeconds(s: number): string {
  const totalMinutes = Math.floor(s / 60)
  const sec = s % 60
  if (totalMinutes === 0) return `${sec} 秒`
  return `${totalMinutes} 分 ${sec} 秒`
}

function timeDelta(actual: number, expected: number) {
  const diff = actual - expected
  if (Math.abs(diff) < 10) return null
  if (diff > 0) {
    return { label: `慢 ${formatSeconds(diff)}`, color: "text-slate-400" }
  } else {
    return { label: `快 ${formatSeconds(Math.abs(diff))}`, color: "text-emerald-500" }
  }
}

function AttemptRow({ attempt, title, onPress }: { attempt: ExerciseSession; title: string; onPress: () => void }) {
  const pct = Math.round((attempt.score / attempt.total_points) * 100)
  const barColor = pct >= 80 ? "bg-amber-500" : pct >= 50 ? "bg-amber-300" : "bg-slate-300"
  const delta = attempt.total_seconds != null && attempt.expected_seconds != null
    ? timeDelta(attempt.total_seconds, attempt.expected_seconds)
    : null

  // Exercise type badge
  const badge =
    attempt.kind === "dse-training" ? "🎓" :
    attempt.kind === "weight-training" ? "💪" :
    attempt.kind === "revision" ? "📚" :
    null

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 mb-2 active:opacity-70"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 flex-1 mr-2">
          {badge && <Text className="text-base">{badge}</Text>}
          <Text
            className="text-sm font-bold text-slate-800 leading-snug flex-1"
            style={{ fontFamily: "Georgia" }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <Text className="text-xs text-slate-400">{formatDate(attempt.finished_at)}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </View>
        <Text className="text-xs font-semibold text-slate-600">
          {attempt.score}/{attempt.total_points}
        </Text>
      </View>
      {attempt.total_seconds != null && (
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-slate-400">{formatSeconds(attempt.total_seconds)}</Text>
          {delta && (
            <Text className={`text-xs font-medium ${delta.color}`}>{delta.label}</Text>
          )}
        </View>
      )}
      <Text className="text-xs text-slate-300 text-right">查看詳情 →</Text>
    </Pressable>
  )
}

export default function ExerciseHistoryScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [attempts, setAttempts] = useState<ExerciseSession[]>([])
  const [loading, setLoading] = useState(true)

  const articleIndex = getArticleIndex()
  const titleById = Object.fromEntries(articleIndex.map((a) => [a.id, a.title]))

  useEffect(() => {
    if (!user) return
    supabase
      .from("exercise_sessions")
      .select("id, article_id, kind, score, total_points, finished_at, total_seconds, expected_seconds")
      .eq("user_id", user.id)
      .order("finished_at", { ascending: false })
      .then(({ data }) => {
        setAttempts((data as ExerciseSession[]) ?? [])
        setLoading(false)
      })
  }, [user])

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        {/* Header */}
        <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-6">
          <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
        </Pressable>

        <Text className="text-xl font-bold text-slate-800 mb-6" style={{ fontFamily: "Georgia" }}>
          所有練習紀錄
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#d97706" className="my-4" />
        ) : attempts.length === 0 ? (
          <View className="bg-white rounded-2xl border border-slate-100 px-4 py-6 items-center">
            <Text className="text-slate-400 text-sm">尚未完成任何練習</Text>
            <Pressable onPress={() => router.replace("/")} className="mt-3">
              <Text className="text-amber-600 font-semibold text-sm">開始學習 →</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-2">
            {attempts.map((attempt) => {
              // Determine title based on kind
              let title: string
              if (attempt.kind === "dse-training") {
                title = "DSE 模擬試"
              } else if (attempt.kind === "weight-training") {
                title = "重量訓練"
              } else if (attempt.kind === "revision") {
                title = "溫故知新"
              } else {
                // article-quiz: fetch article title
                title = attempt.article_id ? (titleById[attempt.article_id] ?? attempt.article_id) : "文章練習"
              }

              return (
                <AttemptRow
                  key={attempt.id}
                  attempt={attempt}
                  title={title}
                  onPress={() => router.push({ pathname: "/attempt", params: { id: attempt.id } })}
                />
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
