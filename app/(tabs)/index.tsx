import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Logo } from "@/components/Logo"
import { supabase } from "@/lib/supabase"
import { getArticleIndex } from "@/lib/data"
import { subscribeToUpdates } from "@/lib/contentStore"
import { fetchArticleProgress, type ArticleProgressMap } from "@/lib/articleProgress"
import type { ArticleEntry } from "@/lib/types"
import Svg, { Circle, Ellipse, Path, Rect, Polygon, Line } from "react-native-svg"

function DemonMascot({ size = 64 }: { size?: number }) {
  const s = size
  return (
    <Svg width={s} height={s} viewBox="0 0 64 64">
      {/* Body / head */}
      <Ellipse cx="32" cy="38" rx="18" ry="16" fill="#7c3aed" />
      {/* Face */}
      <Ellipse cx="32" cy="32" rx="16" ry="15" fill="#8b5cf6" />
      {/* Horns */}
      <Polygon points="18,20 14,6 22,18" fill="#6d28d9" />
      <Polygon points="46,20 50,6 42,18" fill="#6d28d9" />
      {/* Horn tips glow */}
      <Circle cx="14" cy="6" r="3" fill="#fbbf24" />
      <Circle cx="50" cy="6" r="3" fill="#fbbf24" />
      {/* Eyes — glowing amber */}
      <Ellipse cx="25" cy="30" rx="5" ry="4" fill="#fbbf24" />
      <Ellipse cx="39" cy="30" rx="5" ry="4" fill="#fbbf24" />
      {/* Pupils */}
      <Ellipse cx="25" cy="31" rx="2.5" ry="3" fill="#1e1b4b" />
      <Ellipse cx="39" cy="31" rx="2.5" ry="3" fill="#1e1b4b" />
      {/* Eye shine */}
      <Circle cx="26" cy="29" r="1" fill="white" />
      <Circle cx="40" cy="29" r="1" fill="white" />
      {/* Nose */}
      <Ellipse cx="32" cy="36" rx="3" ry="2" fill="#6d28d9" />
      {/* Mouth with fangs */}
      <Path d="M24 40 Q32 47 40 40" stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Polygon points="27,40 29,46 31,40" fill="white" />
      <Polygon points="33,40 35,46 37,40" fill="white" />
      {/* Eyebrows — angry */}
      <Line x1="20" y1="25" x2="29" y2="27" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="35" y1="27" x2="44" y2="25" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  )
}

interface RecentAttempt {
  id: string
  article_id: string
  score: number
  total_points: number
  completed_at: string
  total_seconds: number | null
}

function ArticlePreviewCard({
  article,
  onStart,
  progress,
}: {
  article: ArticleEntry
  onStart: () => void
  progress?: { seenCount: number; totalInPool: number }
}) {
  return (
    <Pressable
      onPress={onStart}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 mb-2 active:opacity-70"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text
            className="text-sm font-bold text-slate-800 leading-snug mb-0.5"
            style={{ fontFamily: "Georgia" }}
            numberOfLines={1}
          >
            {article.title}
          </Text>
          <Text className="text-xs text-slate-400">{article.source}</Text>
        </View>
        <View className="items-end gap-0.5">
          {progress ? (
            <Text className="text-xs text-amber-600 font-semibold">
              已完成 {progress.seenCount} / {progress.totalInPool} 題
            </Text>
          ) : (
            <Text className="text-xs text-amber-600 font-semibold">{article.totalQuestions} 題</Text>
          )}
          <Text className="text-slate-300 text-xs">開始 →</Text>
        </View>
      </View>
    </Pressable>
  )
}

export default function HomeTab() {
  const router = useRouter()
  const { user } = useAuth()
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([])
  const [titleById, setTitleById] = useState<Record<string, string>>({})
  const [dseArticles, setDseArticles] = useState<ArticleEntry[]>([])
  const [otherArticles, setOtherArticles] = useState<ArticleEntry[]>([])
  const [progressMap, setProgressMap] = useState<ArticleProgressMap>({})

  const loadArticles = useCallback(() => {
    const index = getArticleIndex()
    setTitleById(Object.fromEntries(index.map((a) => [a.id, a.title])))
    setDseArticles(
      index.filter((a) => a.articleType === "dse-exam" || a.articleType === "dse-non-exam").slice(0, 3)
    )
    setOtherArticles(
      index.filter((a) => a.articleType === "other" || !a.articleType).slice(0, 3)
    )
  }, [])

  useEffect(() => subscribeToUpdates(loadArticles), [loadArticles])

  useFocusEffect(
    useCallback(() => {
      loadArticles()
      if (!user) return
      supabase
        .from("quiz_attempts")
        .select("id, article_id, score, total_points, completed_at, total_seconds")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(3)
        .then(({ data }) => {
          if (data) setRecentAttempts(data as RecentAttempt[])
        })
      fetchArticleProgress(user.id).then(setProgressMap).catch(() => {})
    }, [user, loadArticles])
  )

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("zh-HK", { month: "short", day: "numeric" })
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-6">
          <Logo size={48} />
          <Pressable
            onPress={() => router.push("/account")}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 active:opacity-70"
          >
            <Text className="text-slate-700 font-semibold text-sm">
              {user ? "帳戶" : "登入"}
            </Text>
          </Pressable>
        </View>

        {/* Greeting */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-800 mb-1" style={{ fontFamily: "Georgia" }}>
            你好！
          </Text>
          <Text className="text-sm text-slate-500">歡迎回到文言文練習平台</Text>
        </View>

        {/* DSE 操練 — big banner */}
        <Pressable
          onPress={() => router.push("/(tabs)/dse-training")}
          className="bg-slate-800 rounded-2xl px-5 py-5 mb-6 active:opacity-80 overflow-hidden"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-amber-400 text-2xl">⚡</Text>
                <Text className="text-white font-bold text-lg">DSE 操練</Text>
              </View>
              <Text className="text-slate-400 text-xs leading-5">
                隨機抽選 DSE 核心篇章，模擬考試練習
              </Text>
            </View>
            {/* Demon mascot */}
            <View className="items-center justify-center mx-2">
              <DemonMascot size={64} />
            </View>
            <View className="bg-amber-500 rounded-xl px-4 py-2">
              <Text className="text-white font-bold text-sm">開始 →</Text>
            </View>
          </View>
        </Pressable>

        {/* DSE 文章 preview */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-slate-800">📖 DSE 文章</Text>
            <Pressable onPress={() => router.push("/(tabs)/dse-learner")} hitSlop={8}>
              <Text className="text-amber-600 font-semibold text-sm">更多 →</Text>
            </Pressable>
          </View>
          {dseArticles.length === 0 ? (
            <View className="bg-white rounded-2xl border border-slate-100 px-4 py-4">
              <Text className="text-slate-400 text-sm text-center">暫無 DSE 文章</Text>
            </View>
          ) : (
            dseArticles.map((article) => (
              <ArticlePreviewCard
                key={article.id}
                article={article}
                progress={progressMap[article.id]}
                onStart={() => router.push(`/read?id=${article.id}`)}
              />
            ))
          )}
        </View>

        {/* 其他文章 preview */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-slate-800">📄 其他文章</Text>
            <Pressable onPress={() => router.push("/(tabs)/extra-articles")} hitSlop={8}>
              <Text className="text-amber-600 font-semibold text-sm">更多 →</Text>
            </Pressable>
          </View>
          {otherArticles.length === 0 ? (
            <View className="bg-white rounded-2xl border border-slate-100 px-4 py-4">
              <Text className="text-slate-400 text-sm text-center">暫無其他文章</Text>
            </View>
          ) : (
            otherArticles.map((article) => (
              <ArticlePreviewCard
                key={article.id}
                article={article}
                progress={progressMap[article.id]}
                onStart={() => router.push(`/read?id=${article.id}`)}
              />
            ))
          )}
        </View>

        {/* Recent history */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-slate-800">最近練習</Text>
            {user && (
              <Pressable onPress={() => router.push("/account")} hitSlop={8}>
                <Text className="text-amber-600 font-semibold text-sm">更多 →</Text>
              </Pressable>
            )}
          </View>

          {!user && (
            <View className="bg-white rounded-2xl border border-slate-100 px-4 py-4 items-center">
              <Text className="text-slate-500 text-sm mb-3">登入後可查看練習記錄</Text>
              <Pressable
                onPress={() => router.push("/account")}
                className="bg-amber-500 px-6 py-2 rounded-xl active:opacity-80"
              >
                <Text className="text-white font-semibold text-sm">立即登入</Text>
              </Pressable>
            </View>
          )}
          {user && recentAttempts.length === 0 && (
            <View className="bg-white rounded-2xl border border-slate-100 px-4 py-4">
              <Text className="text-slate-400 text-sm text-center">尚未有練習記錄</Text>
            </View>
          )}
          {user && recentAttempts.map((attempt) => {
            const pct = attempt.total_points > 0
              ? Math.round((attempt.score / attempt.total_points) * 100)
              : 0
            const barColor = pct >= 80 ? "bg-amber-500" : pct >= 50 ? "bg-amber-300" : "bg-slate-300"
            return (
              <Pressable
                key={attempt.id}
                onPress={() => router.push({ pathname: "/attempt", params: { id: attempt.id } })}
                className="bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-2 active:opacity-70"
              >
                <View className="flex-row justify-between items-start mb-1.5">
                  <Text
                    className="text-sm font-bold text-slate-800 flex-1 mr-2"
                    style={{ fontFamily: "Georgia" }}
                    numberOfLines={1}
                  >
                    {titleById[attempt.article_id] ?? attempt.article_id}
                  </Text>
                  <Text className="text-xs text-slate-400">{formatDate(attempt.completed_at)}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <View className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <View className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </View>
                  <Text className="text-xs font-semibold text-slate-600">
                    {attempt.score}/{attempt.total_points}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
