import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useCallback, useState } from "react"
import { getArticleIndex } from "@/lib/data"
import { useAuth } from "@/hooks/useAuth"
import UpgradeModal from "@/components/UpgradeModal"
import type { ArticleEntry } from "@/lib/types"

function LessonCard({ article, onStart }: { article: ArticleEntry; onStart: () => void }) {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 pt-4 pb-3 mb-3">
      <Text className="text-base font-bold text-slate-800 leading-snug mb-0.5" style={{ fontFamily: "Georgia" }}>
        {article.title}
      </Text>
      <Text className="text-xs text-slate-400 mb-1">{article.source}</Text>
      <Text className="text-xs text-slate-400 mb-3">共 {article.totalQuestions} 題 · {article.totalPoints} 分</Text>
      <Pressable onPress={onStart} className="py-2.5 rounded-xl bg-amber-500 items-center active:opacity-80">
        <Text className="text-white font-semibold text-sm">立即開始</Text>
      </Pressable>
    </View>
  )
}

function ChallengeCard({ article, onStart }: { article: ArticleEntry; onStart: () => void }) {
  return (
    <View className="rounded-2xl px-4 pt-4 pb-3 border border-slate-700 bg-slate-800 mb-3">
      <View className="flex-row items-center mb-2.5">
        <View className="bg-amber-500 rounded px-2 py-0.5">
          <Text className="text-white text-[10px] font-bold tracking-widest">章節挑戰</Text>
        </View>
      </View>
      <Text className="text-base font-bold text-white leading-snug mb-0.5" style={{ fontFamily: "Georgia" }}>
        {article.title}
      </Text>
      <Text className="text-xs text-slate-400 mb-1">{article.source}</Text>
      <Text className="text-xs text-slate-500 mb-3">共 {article.totalQuestions} 題 · {article.totalPoints} 分</Text>
      <Pressable onPress={onStart} className="py-2.5 rounded-xl bg-amber-500 items-center active:opacity-80">
        <Text className="text-white font-semibold text-sm">接受挑戰</Text>
      </Pressable>
    </View>
  )
}

export default function ExtraArticlesTab() {
  const router = useRouter()
  const { user } = useAuth()
  const [showUpgrade, setShowUpgrade] = useState(false)

  const allArticles = getArticleIndex()
  // Show articles explicitly typed as "other", or articles with no articleType (seed data before sync)
  const articles = allArticles.filter(
    (a) => a.articleType === "other" || !a.articleType
  )

  function handleStart(article: ArticleEntry) {
    if (!article.isFree && !user) {
      setShowUpgrade(true)
      return
    }
    router.push(`/read?id=${article.id}`)
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-xl font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>其他文章練習</Text>
        <Text className="text-xs text-slate-500 mt-1">共 {articles.length} 篇</Text>
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {articles.map((article) =>
          article.type === "challenge" ? (
            <ChallengeCard key={article.id} article={article} onStart={() => handleStart(article)} />
          ) : (
            <LessonCard key={article.id} article={article} onStart={() => handleStart(article)} />
          )
        )}
        {articles.length === 0 && (
          <Text className="text-slate-400 text-sm text-center mt-8">暫無其他文章</Text>
        )}
      </ScrollView>
      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </SafeAreaView>
  )
}
