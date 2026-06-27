import { useState, useEffect } from "react"
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { getArticleIndex } from "@/lib/data"
import QuizShell from "@/components/quiz/QuizShell"
import type { Question } from "@/lib/types"

const API_URL = process.env.EXPO_PUBLIC_ADMIN_URL || "https://ccladmin.mickey-calligraphy.art"

interface RevisionSummary {
  byArticle: Array<{
    articleId: string
    totalMistakes: number
    byPart: Record<number, number>
  }>
}

export default function RevisionArticleScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
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

  async function startRevision(articleId: string) {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const url = `${API_URL}/api/revision/sample?userId=${user.id}&articleId=${articleId}&limit=10`
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
  if (!summary || summary.byArticle.length === 0) {
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

  // Lobby - Article view only
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-4">
          <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-6">
            <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
          </Pressable>
          <Text className="text-xl font-bold text-slate-800 mb-2" style={{ fontFamily: "Georgia" }}>
            📚 文章錯題重溫
          </Text>
          <Text className="text-sm text-slate-500 mb-6">按文章分類，針對性重溫各篇章的錯題。</Text>
        </View>

        {summary.byArticle.map(article => (
          <View key={article.articleId} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-3">
            <Text className="text-base font-bold text-slate-800 mb-1" style={{ fontFamily: "Georgia" }}>
              {titleById[article.articleId] || article.articleId}
            </Text>
            <Text className="text-xs text-slate-500 mb-3">
              {Object.entries(article.byPart).map(([part, count]) => `第${part}部分: ${count}題`).join(" | ")}
            </Text>
            <Pressable
              onPress={() => startRevision(article.articleId)}
              className="bg-amber-500 rounded-xl py-2 active:opacity-80"
            >
              <Text className="text-white font-semibold text-center text-sm">開始重溫 ({article.totalMistakes} 題)</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
