import { useState, useEffect, useRef, useCallback } from "react"
import { View, Text, ActivityIndicator, ScrollView, LayoutAnimation, Platform, UIManager, Pressable, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"
import QuizShell from "@/components/quiz/QuizShell"
import { useAuth } from "@/hooks/useAuth"
import { saveDSETrainingSession } from "@/lib/exerciseSession"
import { getArticle } from "@/lib/data"
import type { Question, Article, QuizAnswer } from "@/lib/types"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface SelectedArticle {
  id: string
  title: string
  article: Article
}

function ArticleAccordion({ article, index }: { article: SelectedArticle; index: number }) {
  const [expanded, setExpanded] = useState(false)

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((v) => !v)
  }

  const segments = article.article.segments ?? []
  const footnotes = article.article.footnotes ?? []

  return (
    <View className="bg-white rounded-2xl border border-slate-200 mb-3 overflow-hidden shadow-sm">
      <Pressable onPress={toggle} className="flex-row items-center px-5 py-4 active:opacity-70">
        <View className="bg-amber-100 rounded-lg px-2.5 py-1 mr-3">
          <Text className="text-amber-700 font-bold text-sm">{index + 1}</Text>
        </View>
        <Text className="text-base font-semibold text-slate-800 flex-1 leading-relaxed" style={{ fontFamily: "Georgia" }}>
          {article.title}
        </Text>
        <Text className="text-slate-400 text-base ml-2">{expanded ? "▲" : "▼"}</Text>
      </Pressable>
      {expanded && (
        <View className="border-t border-slate-100 px-5 py-4 bg-amber-50">
          <Text className="text-base text-slate-700 leading-9 tracking-wide mb-4" style={{ fontFamily: "Georgia" }}>
            {segments.map((seg, i) =>
              seg.footnoteId ? (
                <Text key={i} className="text-amber-600 font-bold text-sm">
                  {seg.text}
                </Text>
              ) : (
                <Text key={i}>{seg.text}</Text>
              )
            )}
          </Text>
          {segments.length === 0 && (
            <Text className="text-sm text-slate-400 italic">（未有文章內容）</Text>
          )}

          {footnotes.length > 0 && (
            <View className="mt-6 gap-2">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                註釋
              </Text>
              {footnotes.map((fn) => (
                <View key={fn.id} className="flex-row gap-2">
                  <Text className="text-amber-600 font-bold text-sm min-w-[32px]">{fn.marker}</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-700">{fn.term}</Text>
                    <Text className="text-xs text-slate-500 leading-relaxed">{fn.explanation}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export default function DSETrainingTab() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const [mode, setMode] = useState<"select" | "mock" | "tricky">("select")
  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
  const [selectedArticles, setSelectedArticles] = useState<SelectedArticle[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedAtRef = useRef(Date.now())

  // Handle initial mode from URL params
  useEffect(() => {
    if (params.mode === "mock") {
      setMode("mock")
    }
  }, [params.mode])

  useEffect(() => {
    if (mode === "mock") loadDSEQuestions()
  }, [mode])

  async function loadDSEQuestions() {
    try {
      setLoading(true)
      setError(null)

      // Call the DSE mock sampling API
      const endpoint = process.env.EXPO_PUBLIC_ADMIN_URL ?? "https://ccladmin.mickey-calligraphy.art"
      const url = new URL(`${endpoint}/api/quiz/dse-mock/sample`)
      if (user?.id) {
        url.searchParams.set("userId", user.id)
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Network error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data.articles || data.articles.length === 0) {
        setError("未有 DSE 核心篇章。請稍後再試。")
        return
      }

      if (!data.questions || data.questions.length === 0) {
        setError("未有可用的問題。請稍後再試。")
        return
      }

      // Load article content for each selected article
      const withContent: SelectedArticle[] = data.articles.map((a: { id: string; title: string }) => ({
        id: a.id,
        title: a.title,
        article: getArticle(a.id),
      }))
      setSelectedArticles(withContent)

      // Questions are already sampled and formatted by the backend
      setQuestions(data.questions)
    } catch (e: any) {
      setError(e.message ?? "發生錯誤，請稍後再試。")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = useCallback(async (score: number, total: number, answersObj: Record<string | number, QuizAnswer>) => {
    const totalSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000)

    try {
      await saveDSETrainingSession(
        user?.id ?? null,
        questions,
        answersObj,
        score,
        total,
        totalSeconds
      )
    } catch (err) {
      console.error('DSE training save error:', err)
    }

    Alert.alert("測驗完成", `你答對了 ${score} / ${total} 題`, [
      { text: "返回", onPress: () => router.back() }
    ])
  }, [user, questions, router])

  // Mode selection screen
  if (mode === "select") {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-5 pt-4 pb-2">
          <Text className="text-xl font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>DSE 操練</Text>
        </View>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
          <Text className="text-sm text-slate-500 mt-2 mb-6 leading-5">選擇練習模式開始操練。</Text>

          {/* DSE Mock */}
          <Pressable
            onPress={() => setMode("mock")}
            className="bg-white border border-slate-200 rounded-2xl px-5 py-5 mb-4 shadow-sm active:opacity-80"
          >
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl mr-3">📝</Text>
              <Text className="text-base font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>DSE 模擬考題</Text>
            </View>
            <Text className="text-sm text-slate-500 leading-5">
              隨機抽選 2–3 篇 DSE 核心篇章，模擬考試作答。
            </Text>
          </Pressable>

          {/* 溫故知新 — revision of past mistakes */}
          <Pressable
            onPress={() => router.push("/revision")}
            className="bg-white border border-slate-200 rounded-2xl px-5 py-5 mb-4 shadow-sm active:opacity-80"
          >
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl mr-3">🔁</Text>
              <Text className="text-base font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>溫故知新</Text>
            </View>
            <Text className="text-sm text-slate-500 leading-5">
              從你做錯的題目中抽選 15 條，重新練習加深記憶。
            </Text>
          </Pressable>

          {/* Weight Training (針對性難題訓練) */}
          <Pressable
            onPress={() => router.push("/weight-training")}
            className="bg-white border border-slate-200 rounded-2xl px-5 py-5 mb-4 shadow-sm active:opacity-80"
          >
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl mr-3">🎯</Text>
              <Text className="text-base font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>針對性難題訓練</Text>
            </View>
            <Text className="text-sm text-slate-500 leading-5">
              跨文章一詞多義 & 文言句式專項訓練 (Part 7 & 8)
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // DSE Mock flow
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
        <Pressable onPress={loadDSEQuestions} className="bg-amber-500 px-6 py-3 rounded-xl active:opacity-80">
          <Text className="text-white font-semibold">重試</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  if (phase === "quiz") {
    // Build article info for multi-article mode
    const articles = selectedArticles.map(a => ({ id: a.id, title: a.title }))

    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => setPhase("lobby")} hitSlop={12} className="mr-3">
            <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
          </Pressable>
          <Text className="text-base font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>
            DSE 模擬考題
          </Text>
        </View>
        <View className="flex-1 px-5 pt-2">
          <QuizShell
            questions={questions}
            articles={articles}
            exerciseType="dse-training"
            partTitles={{ 1: "DSE 模擬考題" }}
            onSave={handleSave}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <Pressable onPress={() => setMode("select")} hitSlop={12} className="mr-3">
          <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
        </Pressable>
        <Text className="text-xl font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>DSE 模擬考題</Text>
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mt-2 mb-5">
          <Text className="text-sm text-slate-500 leading-5">
            系統已為你隨機抽選以下 {selectedArticles.length} 篇 DSE 核心篇章。點擊篇章可展開閱讀，再開始答題。
          </Text>
        </View>
        {selectedArticles.map((article, index) => (
          <ArticleAccordion key={article.id} article={article} index={index} />
        ))}
        <View className="bg-slate-100 rounded-xl px-4 py-3 mb-6">
          <Text className="text-sm text-slate-600 text-center">
            共 <Text className="font-bold text-slate-800">{questions.length}</Text> 題・
            滿分 <Text className="font-bold text-slate-800">{questions.reduce((s, q) => s + q.points, 0)}</Text> 分
          </Text>
        </View>
        <Pressable
          onPress={() => setPhase("quiz")}
          className="bg-amber-500 py-4 rounded-2xl items-center active:opacity-80 shadow-sm"
        >
          <Text className="text-white font-bold text-base">開始練習 →</Text>
        </Pressable>
        <Text className="text-xs text-slate-400 text-center mt-4">完成後成績將自動儲存</Text>
      </ScrollView>
    </SafeAreaView>
  )
}
