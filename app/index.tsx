import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { getArticleIndex } from "@/lib/data"
import { Logo } from "@/components/Logo"
import type { ArticleEntry } from "@/lib/types"

const TOTAL_LESSONS = 50

type NodeState = "read" | "available" | "challenge" | "locked"

function NodeCircle({ num, state }: { num: number; state: NodeState }) {
  const bg =
    state === "read"      ? "bg-amber-600" :
    state === "available" ? "bg-amber-500" :
    state === "challenge" ? "bg-slate-800" :
                            "bg-slate-200"

  return (
    <View className={`w-11 h-11 rounded-full items-center justify-center ${bg}`}>
      {state === "read" ? (
        <Text className="font-bold text-base text-white">✓</Text>
      ) : state === "locked" ? (
        <Text className="text-slate-400 text-xs">🔒</Text>
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
  const articles = getArticleIndex()

  const lessons = Array.from({ length: TOTAL_LESSONS }, (_, i) => {
    const article = i < articles.length ? articles[i] : null
    const state: NodeState = article
      ? article.type === "challenge" ? "challenge" : "available"
      : "locked"
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
        <View className="items-center mb-10">
          <Logo size={84} />
          <Text
            className="text-xl font-bold text-slate-800 mt-4"
            style={{ fontFamily: "Georgia" }}
          >
            歡迎回來文言教室！
          </Text>
          <Text className="text-xs text-slate-400 mt-1">選擇今日的學習課程</Text>
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
                  article.type === "challenge" ? (
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
    </SafeAreaView>
  )
}
