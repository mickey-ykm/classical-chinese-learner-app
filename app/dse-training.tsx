import { useState, useEffect } from "react"
import { View, Text, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Pressable } from "react-native"
import QuizShell from "@/components/quiz/QuizShell"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import type { Question } from "@/lib/types"

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

export default function DSETrainingScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDSEQuestions()
  }, [])

  async function loadDSEQuestions() {
    try {
      setLoading(true)
      setError(null)

      // Fetch DSE core articles
      const { data: articles, error: artErr } = await supabase
        .from("articles")
        .select("id")
        .eq("is_dse_core", true)

      if (artErr) throw artErr
      if (!articles || articles.length === 0) {
        setError("未有 DSE 核心篇章。請稍後再試。")
        return
      }

      // Pick 2–3 random articles
      const count = articles.length >= 3 ? (Math.random() < 0.5 ? 2 : 3) : Math.min(2, articles.length)
      const picked = pickRandom(articles, count)
      const articleIds = picked.map((a) => a.id)

      // Fetch published questions for those articles
      const { data: rows, error: qErr } = await supabase
        .from("questions")
        .select("*")
        .in("article_id", articleIds)
        .eq("status", "published")

      if (qErr) throw qErr
      if (!rows || rows.length === 0) {
        setError("未有可用的問題。請稍後再試。")
        return
      }

      // Map DB rows to Question interface
      const mapped: Question[] = rows.map((r: any) => ({
        id: r.id,
        part: r.part ?? 1,
        points: r.points ?? 1,
        stem: r.stem,
        format: r.format ?? "mc",
        type: r.type ?? "mc-single",
        options: r.options ?? [],
        correctAnswer: r.correct_answer ?? "",
        explanation: r.explanation,
        selectCount: r.select_count ?? 1,
        sequenceTokens: r.sequence_tokens ?? undefined,
      }))

      setQuestions(mapped)
    } catch (e: any) {
      setError(e.message ?? "發生錯誤，請稍後再試。")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(score: number, total: number, totalSeconds: number) {
    if (!user) return
    try {
      await supabase.from("exercise_sessions").insert({
        user_id: user.id,
        kind: "dse-training",
        score,
        total_points: total,
        duration_seconds: totalSeconds,
        completed_at: new Date().toISOString(),
      })
    } catch {
      // Non-fatal: session save failure shouldn't break UX
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text className="text-slate-500 mt-4 text-sm">載入 DSE 練習...</Text>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-slate-700 text-base text-center mb-6">{error}</Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-amber-500 px-6 py-3 rounded-xl active:opacity-80"
        >
          <Text className="text-white font-semibold">返回主頁</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={12} className="mr-3">
          <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
        </Pressable>
        <Text className="text-base font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>
          DSE 備試練習
        </Text>
      </View>
      <View className="flex-1 px-5 pt-2">
        <QuizShell
          questions={questions}
          partTitles={{ 1: "DSE 備試練習" }}
          onSave={handleSave}
        />
      </View>
    </SafeAreaView>
  )
}
