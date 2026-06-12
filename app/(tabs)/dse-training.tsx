import { useState, useEffect } from "react"
import { View, Text, ActivityIndicator, ScrollView, LayoutAnimation, Platform, UIManager, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import QuizShell from "@/components/quiz/QuizShell"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { getArticle } from "@/lib/data"
import type { Question, Article, QuizOption } from "@/lib/types"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface SelectedArticle {
  id: string
  title: string
  article: Article
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function normalizeOptions(opts: any): QuizOption[] {
  if (Array.isArray(opts)) return opts as QuizOption[]
  if (opts && typeof opts === "object") {
    return Object.entries(opts).map(([key, text]) => ({ key: key as QuizOption["key"], text: String(text) }))
  }
  return []
}

function ArticleAccordion({ article, index }: { article: SelectedArticle; index: number }) {
  const [expanded, setExpanded] = useState(false)

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((v) => !v)
  }

  const segments = article.article.segments ?? []

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
          {segments.map((seg, i) => (
            <Text key={i} className="text-sm text-slate-700 leading-7 mb-1" style={{ fontFamily: "Georgia" }}>
              {seg.text}
            </Text>
          ))}
          {segments.length === 0 && (
            <Text className="text-sm text-slate-400 italic">（未有文章內容）</Text>
          )}
        </View>
      )}
    </View>
  )
}

export default function DSETrainingTab() {
  const { user } = useAuth()
  const [mode, setMode] = useState<"select" | "mock" | "tricky">("select")
  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
  const [selectedArticles, setSelectedArticles] = useState<SelectedArticle[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === "mock") loadDSEQuestions()
  }, [mode])

  async function loadDSEQuestions() {
    try {
      setLoading(true)
      setError(null)

      const { data: articles, error: artErr } = await supabase
        .from("articles")
        .select("id, title")
        .eq("is_dse_core", true)

      if (artErr) throw artErr
      if (!articles || articles.length === 0) {
        setError("未有 DSE 核心篇章。請稍後再試。")
        return
      }

      const count = articles.length >= 3 ? (Math.random() < 0.5 ? 2 : 3) : Math.min(2, articles.length)
      const picked = pickRandom(articles, count)

      const withContent: SelectedArticle[] = picked.map((a) => ({
        id: a.id,
        title: a.title,
        article: getArticle(a.id),
      }))
      setSelectedArticles(withContent)

      const articleIds = picked.map((a) => a.id)

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

      const mapped: Question[] = rows.map((r: any) => ({
        id: r.id,
        part: r.part ?? 1,
        points: r.points ?? 1,
        stem: r.stem,
        format: r.format ?? "mc",
        type: r.type ?? "mc-single",
        options: normalizeOptions(r.options),
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
      // Non-fatal
    }
  }

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

          {/* Tricky Questions — coming soon */}
          <View className="bg-white border border-slate-200 rounded-2xl px-5 py-5 mb-4 opacity-60">
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl mr-3">🎯</Text>
              <Text className="text-base font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>針對性難題訓練</Text>
              <View className="ml-3 bg-amber-100 rounded-full px-2.5 py-0.5">
                <Text className="text-amber-700 text-xs font-semibold">即將推出</Text>
              </View>
            </View>
            <Text className="text-sm text-slate-500 leading-5">
              隨機抽選 15 條特定類型難題，針對弱項強化訓練。
            </Text>
          </View>
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
