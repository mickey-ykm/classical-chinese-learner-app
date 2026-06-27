import { useState, useEffect } from "react"
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { STANDARD_PART_TITLES } from "@/lib/data"
import QuizShell from "@/components/quiz/QuizShell"
import type { Question } from "@/lib/types"

const API_URL = process.env.EXPO_PUBLIC_ADMIN_URL || "https://ccladmin.mickey-calligraphy.art"

interface RevisionSummary {
  overall: {
    totalMistakes: number
    weakestPart: number | null
    weakestPartCount: number
  }
  byPart: Array<{
    part: number
    totalMistakes: number
    byArticle: Record<string, number>
    isWeightTraining: boolean
  }>
}

export default function RevisionPartScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<RevisionSummary | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.is_anonymous) {
      setLoading(false)
      return
    }
    loadSummary()
  }, [user])

  async function loadSummary() {
    if (!user) return

    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/revision/summary?userId=${user.id}`)
      if (!res.ok) throw new Error("Failed to load revision summary")

      const data = await res.json()
      setSummary(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function startRevision(part: number) {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const url = `${API_URL}/api/revision/sample?userId=${user.id}&part=${part}&limit=10`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to sample questions")

      const data = await res.json()

      if (!data || data.length === 0) {
        setError("沒有可用的錯題")
        setLoading(false)
        return
      }

      setQuestions(data)
      setPhase("quiz")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleQuizExit() {
    setPhase("lobby")
    setQuestions([])
    loadSummary()
  }

  // Anonymous user
  if (!user || user.is_anonymous) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-slate-700 text-base text-center mb-4">
          登入後才能查看錯題重溫
        </Text>
        <Pressable
          onPress={() => router.push("/login")}
          className="bg-amber-500 rounded-xl px-6 py-3 active:opacity-80"
        >
          <Text className="text-white font-semibold">登入 / 建立帳戶</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  // Quiz phase
  if (phase === "quiz" && questions.length > 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-4 pt-4 pb-2">
          <Pressable onPress={handleQuizExit} hitSlop={12} className="self-start">
            <Text className="text-amber-600 font-semibold text-sm">← 退出</Text>
          </Pressable>
        </View>
        <QuizShell
          questions={questions}
          exerciseType="regular"
          onExit={handleQuizExit}
        />
      </SafeAreaView>
    )
  }

  // Loading
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#d97706" />
      </SafeAreaView>
    )
  }

  // Error
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-slate-700 text-base text-center mb-4">{error}</Text>
        <Pressable onPress={loadSummary} className="bg-amber-500 rounded-xl px-6 py-3">
          <Text className="text-white font-semibold">重試</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  // Empty state
  if (!summary || summary.byPart.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-5 pt-4">
          <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-6">
            <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-6xl mb-4">🎉</Text>
          <Text className="text-xl font-bold text-slate-800 mb-2">太棒了！</Text>
          <Text className="text-slate-500 text-center">你沒有任何待重溫的錯題</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Lobby - Part view only
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-4">
          <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-6">
            <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
          </Pressable>
          <Text className="text-xl font-bold text-slate-800 mb-2" style={{ fontFamily: "Georgia" }}>
            🎯 文言文語基能力錯題重溫
          </Text>
          <Text className="text-sm text-slate-500 mb-6">按部分分類，集中練習特定語文基礎能力。</Text>
        </View>

        {/* Overall stats */}
        {summary.overall.totalMistakes > 0 && (
          <View className="bg-white rounded-2xl border border-slate-100 px-5 py-4 mb-4">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">整體統計</Text>
            <Text className="text-lg font-bold text-slate-800 mb-1">
              總計：{summary.overall.totalMistakes} 題待重溫
            </Text>
            {summary.overall.weakestPart && (
              <Text className="text-sm text-slate-600">
                最弱部分：{STANDARD_PART_TITLES[summary.overall.weakestPart] || `第 ${summary.overall.weakestPart} 部分`} ({summary.overall.weakestPartCount} 題)
              </Text>
            )}
          </View>
        )}

        {summary.byPart.map(partData => (
          <View key={partData.part} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-3">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-base font-bold text-slate-800">
                {STANDARD_PART_TITLES[partData.part] || `第 ${partData.part} 部分`}
              </Text>
              {summary.overall.weakestPart === partData.part && (
                <View className="bg-red-50 border border-red-200 rounded px-2 py-0.5">
                  <Text className="text-xs font-semibold text-red-600">⚠️ 最弱</Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-slate-500 mb-3">
              {partData.isWeightTraining ? "重量訓練" : Object.keys(partData.byArticle).length + " 篇文章"}
            </Text>
            <Pressable
              onPress={() => startRevision(partData.part)}
              className="bg-amber-500 rounded-xl py-2 active:opacity-80"
            >
              <Text className="text-white font-semibold text-center text-sm">
                練習這部分 ({partData.totalMistakes} 題)
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
