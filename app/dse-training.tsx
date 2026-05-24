import { useState, useEffect } from "react"
import { View, Text, ActivityIndicator, ScrollView, LayoutAnimation, Platform, UIManager } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Pressable } from "react-native"
import QuizShell from "@/components/quiz/QuizShell"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { getArticle } from "@/lib/data"
import type { Question, Article } from "@/lib/types"

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

function normalizeOptions(opts: any): { key: string; text: string }[] {
  if (Array.isArray(opts)) return opts
  if (opts && typeof opts === "object") {
    return Object.entries(opts).map(([key, text]) => ({ key, text: String(text) }))
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
      {/* Header row — always visible */}
      <Pressable
        onPress={toggle}
        className="flex-row items-center px-5 py-4 active:opacity-70"
      >
        <View className="bg-amber-100 rounded-lg px-2.5 py-1 mr-3">
          <Text className="text-amber-700 font-bold text-sm">{index + 1}</Text>
        </View>
        <Text
          className="text-base font-semibold text-slate-800 flex-1 leading-relaxed"
          style={{ fontFamily: "Georgia" }}
        >
          {article.title}
        </Text>
        <Text className="text-slate-400 text-base ml-2">{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <View className="border-t border-slate-100 px-5 py-4 bg-amber-50">
          {segments.map((seg, i) => (
            <Text
              key={i}
              className="text-sm text-slate-700 leading-7 mb-1"
              style={{ fontFamily: "Georgia" }}
            >
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

export default function DSETrainingScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
  const [selectedArticles, setSelectedArticles] = useState<SelectedArticle[]>([])
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

      // Fetch DSE core articles (with title for lobby display)
      const { data: articles, error: artErr } = await supabase
        .from("articles")
        .select("id, title")
        .eq("is_dse_core", true)

      if (artErr) throw artErr
      if (!articles || articles.length === 0) {
        setError("未有 DSE 核心篇章。請稍後再試。")
        return
      }

      // Pick 2–3 random articles
      const count = articles.length >= 3 ? (Math.random() < 0.5 ? 2 : 3) : Math.min(2, articles.length)
      const picked = pickRandom(articles, count)

      // Load local article data for accordion content
      const withContent: SelectedArticle[] = picked.map((a) => ({
        id: a.id,
        title: a.title,
        article: getArticle(a.id),
      }))
      setSelectedArticles(withContent)

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

  // ── Quiz phase ───────────────────────────────────────────────────────────────
  if (phase === "quiz") {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-5 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => setPhase("lobby")} hitSlop={12} className="mr-3">
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

  // ── Lobby phase ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={12} className="mr-3">
          <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
        </Pressable>
        <Text className="text-base font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>
          DSE 備試練習
        </Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Intro */}
        <View className="mt-4 mb-5">
          <Text className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: "Georgia" }}>
            今日練習篇章
          </Text>
          <Text className="text-sm text-slate-500 leading-5">
            系統已為你隨機抽選以下 {selectedArticles.length} 篇 DSE 核心篇章。
            點擊篇章可展開閱讀，再開始答題。
          </Text>
        </View>

        {/* Accordion articles */}
        {selectedArticles.map((article, index) => (
          <ArticleAccordion key={article.id} article={article} index={index} />
        ))}

        {/* Stats */}
        <View className="bg-slate-100 rounded-xl px-4 py-3 mb-6">
          <Text className="text-sm text-slate-600 text-center">
            共 <Text className="font-bold text-slate-800">{questions.length}</Text> 題・
            滿分 <Text className="font-bold text-slate-800">
              {questions.reduce((s, q) => s + q.points, 0)}
            </Text> 分
          </Text>
        </View>

        {/* Start CTA */}
        <Pressable
          onPress={() => setPhase("quiz")}
          className="bg-amber-500 py-4 rounded-2xl items-center active:opacity-80 shadow-sm"
        >
          <Text className="text-white font-bold text-base">開始練習 →</Text>
        </Pressable>

        <Text className="text-xs text-slate-400 text-center mt-4">
          完成後成績將自動儲存
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
