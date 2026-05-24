import { ScrollView, View, Text, Pressable, Image } from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useCallback, useState } from "react"
import { getArticleIndex, isArticleFree } from "@/lib/data"
import { getReadArticles } from "@/lib/readProgress"
import { Logo } from "@/components/Logo"
import { useAuth } from "@/hooks/useAuth"
import UpgradeModal from "@/components/UpgradeModal"
import type { ArticleEntry } from "@/lib/types"

const TOTAL_LESSONS = 50

type NodeState = "read" | "available" | "challenge" | "pro" | "locked"

function NodeCircle({ num, state }: { num: number; state: NodeState }) {
  const bg =
    state === "read"      ? "bg-amber-600" :
    state === "available" ? "bg-amber-500" :
    state === "challenge" ? "bg-slate-800" :
    state === "pro"       ? "bg-slate-300" :
                            "bg-slate-200"

  return (
    <View className={`w-11 h-11 rounded-full items-center justify-center ${bg}`}>
      {state === "read" ? (
        <Text className="font-bold text-base text-white">✓</Text>
      ) : state === "locked" ? (
        <Text className="text-slate-400 text-xs">🔒</Text>
      ) : state === "pro" ? (
        <Text className="text-slate-500 text-xs">🔒</Text>
      ) : state === "challenge" ? (
        <Text className="text-amber-400 text-base">★</Text>
      ) : (
        <Text className="font-bold text-sm text-white">{num}</Text>
      )}
    </View>
  )
}

function LessonCard({ article, onStart }: { article: ArticleEntry; onStart: () => void }) {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 pt-4 pb-3">
      <Text
        className="text-base font-bold text-slate-800 leading-snug mb-0.5"
        style={{ fontFamily: "Georgia" }}
      >
        {article.title}
      </Text>
      <Text className="text-xs text-slate-400 mb-1">{article.source}</Text>
      <Text className="text-xs text-slate-400 mb-3">
        共 {article.totalQuestions} 題 · {article.totalPoints} 分
      </Text>
      <Pressable
        onPress={onStart}
        className="py-2.5 rounded-xl bg-amber-500 items-center active:opacity-80"
      >
        <Text className="text-white font-semibold text-sm">立即開始</Text>
      </Pressable>
    </View>
  )
}

function ChallengeCard({ article, onStart }: { article: ArticleEntry; onStart: () => void }) {
  return (
    <View className="rounded-2xl px-4 pt-4 pb-3 border border-slate-700 bg-slate-800">
      <View className="flex-row items-center mb-2.5">
        <View className="bg-amber-500 rounded px-2 py-0.5">
          <Text className="text-white text-[10px] font-bold tracking-widest">章節挑戰</Text>
        </View>
      </View>
      <Text
        className="text-base font-bold text-white leading-snug mb-0.5"
        style={{ fontFamily: "Georgia" }}
      >
        {article.title}
      </Text>
      <Text className="text-xs text-slate-400 mb-1">{article.source}</Text>
      <Text className="text-xs text-slate-500 mb-3">
        共 {article.totalQuestions} 題 · {article.totalPoints} 分
      </Text>
      <Pressable
        onPress={onStart}
        className="py-2.5 rounded-xl bg-amber-500 items-center active:opacity-80"
      >
        <Text className="text-white font-semibold text-sm">接受挑戰</Text>
      </Pressable>
    </View>
  )
}

function ProLockedCard({ article, onUpgrade }: { article: ArticleEntry; onUpgrade: () => void }) {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 px-4 pt-4 pb-3 opacity-75">
      <View className="flex-row items-center gap-2 mb-1">
        <Text
          className="text-base font-bold text-slate-600 leading-snug flex-1"
          style={{ fontFamily: "Georgia" }}
        >
          {article.title}
        </Text>
        <View className="bg-amber-100 rounded px-2 py-0.5">
          <Text className="text-amber-700 text-[10px] font-bold tracking-widest">PRO</Text>
        </View>
      </View>
      <Text className="text-xs text-slate-400 mb-1">{article.source}</Text>
      <Text className="text-xs text-slate-400 mb-3">
        共 {article.totalQuestions} 題 · {article.totalPoints} 分
      </Text>
      <Pressable
        onPress={onUpgrade}
        className="py-2.5 rounded-xl bg-slate-100 items-center active:opacity-80 flex-row justify-center gap-1.5"
      >
        <Text className="text-slate-500 text-sm">🔒</Text>
        <Text className="text-slate-500 font-semibold text-sm">升級解鎖</Text>
      </Pressable>
    </View>
  )
}

function PlaceholderCard({ num }: { num: number }) {
  return (
    <View className="bg-slate-100 rounded-2xl border border-slate-100 px-4 py-3">
      <Text className="text-sm text-slate-400">第 {num} 課</Text>
      <Text className="text-xs text-slate-300 mt-0.5">即將推出</Text>
    </View>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const [articles, setArticles] = useState(() => getArticleIndex())
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [upgradeVisible, setUpgradeVisible] = useState(false)
  const { user, profile, isAnonymous } = useAuth()

  const isPro = profile?.is_pro ?? false

  useFocusEffect(
    useCallback(() => {
      setArticles(getArticleIndex())
      const userId = !isAnonymous && user ? user.id : undefined
      getReadArticles(userId).then(setReadIds)
    }, [user, isAnonymous])
  )

  const lessons = Array.from({ length: TOTAL_LESSONS }, (_, i) => {
    const article = i < articles.length ? articles[i] : null
    let state: NodeState
    if (!article) {
      state = "locked"
    } else if (readIds.has(article.id)) {
      state = "read"
    } else if (!isPro && !isArticleFree(article.id)) {
      state = "pro"
    } else if (article.type === "challenge") {
      state = "challenge"
    } else {
      state = "available"
    }
    return { num: i + 1, article, state }
  })

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-10">
          <View className="items-end">
            <Pressable
              onPress={() => router.push(!user || isAnonymous ? "/login" : "/account")}
              hitSlop={12}
              className="p-1"
            >
              {user && profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                />
              ) : (
                <View className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center">
                  <Text className="text-slate-500 text-sm">👤</Text>
                </View>
              )}
            </Pressable>
          </View>
          <View className="items-center">
            <Logo size={84} />
            <Text
              className="text-xl font-bold text-slate-800 mt-4"
              style={{ fontFamily: "Georgia" }}
            >
              歡迎回來文言教室！
            </Text>
            <Text className="text-xs text-slate-400 mt-1">選擇今日的學習課程</Text>
          </View>
        </View>

        {/* DSE Training + Weight Training CTAs */}
        <View className="gap-3 mb-8">
          <Pressable
            onPress={() => router.push("/dse-training")}
            className="bg-amber-500 rounded-2xl px-5 py-4 active:opacity-80"
          >
            <Text className="text-white font-bold text-base mb-0.5">📝 DSE 備試練習</Text>
            <Text className="text-amber-100 text-xs">隨機抽取 2–3 篇核心文章，模擬考試練習</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/weight-training")}
            className="bg-slate-100 rounded-2xl px-5 py-4 active:opacity-80 border border-slate-200"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-500 font-bold text-base flex-1">🏋️ 文言用字訓練</Text>
              <View className="bg-slate-200 rounded px-2 py-0.5">
                <Text className="text-slate-400 text-[10px] font-bold tracking-widest">即將推出</Text>
              </View>
            </View>
            <Text className="text-slate-400 text-xs mt-0.5">跨篇章文言字詞專項訓練</Text>
          </Pressable>
        </View>

        {/* Journey map */}
        {lessons.map(({ num, article, state }, idx) => {
          const isLast = idx === lessons.length - 1
          const connectorColor = state === "locked" ? "#e2e8f0" : "#fcd34d"

          return (
            <View key={num} className="flex-row">
              {/* Left: circle + vertical connector */}
              <View className="items-center" style={{ width: 44 }}>
                <NodeCircle num={num} state={state} />
                {!isLast && (
                  <View
                    style={{ width: 3, flex: 1, minHeight: 12, backgroundColor: connectorColor }}
                  />
                )}
              </View>

              {/* Right: card */}
              <View className="flex-1 ml-3 pb-3">
                {article ? (
                  state === "pro" ? (
                    <ProLockedCard
                      article={article}
                      onUpgrade={() => setUpgradeVisible(true)}
                    />
                  ) : article.type === "challenge" ? (
                    <ChallengeCard
                      article={article}
                      onStart={() => router.push({ pathname: "/read", params: { id: article.id } })}
                    />
                  ) : (
                    <LessonCard
                      article={article}
                      onStart={() => router.push({ pathname: "/read", params: { id: article.id } })}
                    />
                  )
                ) : (
                  <PlaceholderCard num={num} />
                )}
              </View>
            </View>
          )
        })}
      </ScrollView>

      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
    </SafeAreaView>
  )
}
