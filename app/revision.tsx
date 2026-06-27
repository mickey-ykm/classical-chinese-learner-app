import { useState, useEffect } from "react"
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { getArticleIndex, STANDARD_PART_TITLES } from "@/lib/data"
import QuizShell from "@/components/quiz/QuizShell"
import type { Question } from "@/lib/types"

const API_URL = process.env.EXPO_PUBLIC_ADMIN_URL || "https://ccladmin.mickey-calligraphy.art"

interface RevisionSummary {
  overall: {
    totalMistakes: number
    weakestPart: number | null
    weakestPartCount: number
  }
  byArticle: Array<{
    articleId: string
    totalMistakes: number
    byPart: Record<number, number>
  }>
  byPart: Array<{
    part: number
    totalMistakes: number
    byArticle: Record<string, number>
    isWeightTraining: boolean
  }>
  weightTraining: {
    totalMistakes: number
    byPart: Record<number, number>
  }
}

export default function RevisionScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const params = useLocalSearchParams()

  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
  const [view, setView] = useState<"article" | "part">(
    params.view === "part" ? "part" : "article"
  )
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<RevisionSummary | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState<string | null>(null)

  const articleIndex = getArticleIndex()
  const titleById = Object.fromEntries(articleIndex.map(a => [a.id, a.title]))

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

  async function startRevision(options: { articleId?: string; part?: number; limit?: number }) {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      let url = `${API_URL}/api/revision/sample?userId=${user.id}`
      if (options.articleId) url += `&articleId=${options.articleId}`
      if (options.part !== undefined) url += `&part=${options.part}`
      if (options.limit) url += `&limit=${options.limit}`

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
    loadSummary() // Refresh summary after quiz
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
    // Build articles map for multi-article support
    const articlesMap: Record<string, { id: string; title: string }> = {}
    for (const q of questions) {
      if (q.articleId && !articlesMap[q.articleId]) {
        articlesMap[q.articleId] = {
          id: q.articleId,
          title: titleById[q.articleId] || q.articleId
        }
      }
    }
    const articlesArray = Object.values(articlesMap)

    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-4 pt-4 pb-2">
          <Pressable onPress={handleQuizExit} hitSlop={12} className="self-start">
            <Text className="text-amber-600 font-semibold text-sm">← 退出</Text>
          </Pressable>
        </View>
        <QuizShell
          questions={questions}
          articles={articlesArray.length > 0 ? articlesArray : undefined}
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
  if (!summary || summary.overall.totalMistakes === 0) {
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

  // Lobby
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View className="pt-4">
          <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-6">
            <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
          </Pressable>
          <Text className="text-xl font-bold text-slate-800 mb-2" style={{ fontFamily: "Georgia" }}>
            📚 溫故知新
          </Text>
        </View>

        {/* Overall stats */}
        <View className="bg-white rounded-2xl border border-slate-100 px-5 py-4 mb-4">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">整體統計</Text>
          <Text className="text-2xl font-bold text-slate-800 mb-2">
            總計：{summary.overall.totalMistakes} 題待重溫
          </Text>
          {summary.overall.weakestPart && (
            <Text className="text-sm text-slate-600">
              最弱部分：{STANDARD_PART_TITLES[summary.overall.weakestPart] || `第 ${summary.overall.weakestPart} 部分`} ({summary.overall.weakestPartCount} 題)
            </Text>
          )}
        </View>

        {/* View toggle */}
        <View className="flex-row gap-2 mb-4">
          <Pressable
            onPress={() => setView("article")}
            className={`flex-1 py-3 rounded-xl ${view === "article" ? "bg-amber-500" : "bg-white border border-slate-200"}`}
          >
            <Text className={`text-center font-semibold ${view === "article" ? "text-white" : "text-slate-600"}`}>
              文章檢視
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setView("part")}
            className={`flex-1 py-3 rounded-xl ${view === "part" ? "bg-amber-500" : "bg-white border border-slate-200"}`}
          >
            <Text className={`text-center font-semibold ${view === "part" ? "text-white" : "text-slate-600"}`}>
              部分檢視
            </Text>
          </Pressable>
        </View>

        {/* Article view */}
        {view === "article" && (
          <>
            {summary.byArticle.length > 0 && (
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  📚 文章錯題 ({summary.byArticle.reduce((sum, a) => sum + a.totalMistakes, 0)} 題)
                </Text>
                {summary.byArticle.map(article => (
                  <View key={article.articleId} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-2">
                    <Text className="text-base font-bold text-slate-800 mb-1" style={{ fontFamily: "Georgia" }}>
                      {titleById[article.articleId] || article.articleId}
                    </Text>
                    <Text className="text-xs text-slate-500 mb-3">
                      {Object.entries(article.byPart).map(([part, count]) => `第${part}部分: ${count}題`).join(" | ")}
                    </Text>
                    <Pressable
                      onPress={() => startRevision({ articleId: article.articleId, limit: 10 })}
                      className="bg-amber-500 rounded-xl py-2 active:opacity-80"
                    >
                      <Text className="text-white font-semibold text-center text-sm">開始重溫 ({article.totalMistakes} 題)</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {summary.weightTraining.totalMistakes > 0 && (
              <View>
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  💪 重量訓練錯題 ({summary.weightTraining.totalMistakes} 題)
                </Text>
                <View className="bg-white rounded-2xl border border-slate-100 px-4 py-3">
                  <Text className="text-base font-bold text-slate-800 mb-1">重量訓練</Text>
                  <Text className="text-xs text-slate-500 mb-3">
                    {Object.entries(summary.weightTraining.byPart).map(([part, count]) => `第${part}部分: ${count}題`).join(" | ")}
                  </Text>
                  <Pressable
                    onPress={() => startRevision({ limit: 10 })}
                    className="bg-amber-500 rounded-xl py-2 active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center text-sm">
                      開始重溫 ({summary.weightTraining.totalMistakes} 題)
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}

        {/* Part view */}
        {view === "part" && (
          <View>
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">按部分分類</Text>
            {summary.byPart.map(partData => (
              <View key={partData.part} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-2">
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
                  onPress={() => startRevision({ part: partData.part, limit: 10 })}
                  className="bg-amber-500 rounded-xl py-2 active:opacity-80"
                >
                  <Text className="text-white font-semibold text-center text-sm">
                    練習這部分 ({partData.totalMistakes} 題)
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
