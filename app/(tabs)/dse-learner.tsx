import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useCallback, useEffect, useState } from "react"
import { getArticleIndex } from "@/lib/data"
import { subscribeToUpdates } from "@/lib/contentStore"
import { getReadArticles } from "@/lib/readProgress"
import { useAuth } from "@/hooks/useAuth"
import UpgradeModal from "@/components/UpgradeModal"
import type { ArticleEntry } from "@/lib/types"

function ArticleTypeBadge({ articleType }: { articleType?: string }) {
  if (articleType === "dse-exam") {
    return (
      <View className="self-start bg-amber-100 border border-amber-200 rounded px-2 py-0.5 mb-2">
        <Text className="text-[10px] font-bold tracking-wide text-amber-700">DSE甲部指定篇章</Text>
      </View>
    )
  }
  if (articleType === "dse-non-exam") {
    return (
      <View className="self-start bg-blue-50 border border-blue-200 rounded px-2 py-0.5 mb-2">
        <Text className="text-[10px] font-bold tracking-wide text-blue-600">高中教學課文</Text>
      </View>
    )
  }
  return null
}

function LessonCard({ article, onStart }: { article: ArticleEntry; onStart: () => void }) {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 pt-4 pb-3 mb-3">
      <ArticleTypeBadge articleType={article.articleType} />
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
      <View className="flex-row items-center gap-2 mb-2.5">
        <ArticleTypeBadge articleType={article.articleType} />
        <View className="bg-amber-500 rounded px-2 py-0.5 mb-2">
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

function filterDSE(index: ArticleEntry[]) {
  return index.filter((a) => a.articleType === "dse-exam" || a.articleType === "dse-non-exam")
}

export default function DSELearnerTab() {
  const router = useRouter()
  const { user } = useAuth()
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [articles, setArticles] = useState<ArticleEntry[]>(() => filterDSE(getArticleIndex()))

  useFocusEffect(
    useCallback(() => {
      getReadArticles().then((ids) => setReadIds(new Set(ids)))
      setArticles(filterDSE(getArticleIndex()))
    }, [])
  )

  useEffect(() => subscribeToUpdates(() => setArticles(filterDSE(getArticleIndex()))), [])

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
        <Text className="text-xl font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>DSE 文章練習</Text>
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
          <Text className="text-slate-400 text-sm text-center mt-8">暫無 DSE 文章</Text>
        )}
      </ScrollView>
      <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </SafeAreaView>
  )
}
