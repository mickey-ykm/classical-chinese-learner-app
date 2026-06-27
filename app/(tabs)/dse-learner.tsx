import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useCallback, useEffect, useState } from "react"
import { getArticleIndex } from "@/lib/data"
import { subscribeToUpdates } from "@/lib/contentStore"
import { getReadArticles } from "@/lib/readProgress"
import { useAuth } from "@/hooks/useAuth"
import { fetchArticleProgress, type ArticleProgressMap } from "@/lib/articleProgress"
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

interface CardProps {
  article: ArticleEntry
  progress?: ArticleProgressMap[string]
  onStart: () => void
}

function ProgressStats({ progress, totalQuestions }: { progress?: ArticleProgressMap[string]; totalQuestions: number }) {
  if (!progress) return null
  return (
    <View className="flex-row gap-3 mb-3 flex-wrap">
      <Text className="text-xs text-amber-600 font-medium">
        已完成 {progress.seenCount} / {progress.totalInPool} 題
      </Text>
      {progress.attemptCount > 0 && (
        <>
          <Text className="text-xs text-slate-300">·</Text>
          <Text className="text-xs text-slate-400">練習 {progress.attemptCount} 次</Text>
          <Text className="text-xs text-slate-300">·</Text>
          <Text className="text-xs text-slate-400">正確率 {progress.correctRate}%</Text>
        </>
      )}
    </View>
  )
}

function LessonCard({ article, progress, onStart }: CardProps) {
  const isPaid = !article.isFree

  return (
    <View className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 pt-4 pb-3 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <ArticleTypeBadge articleType={article.articleType} />
        {isPaid && (
          <View className="flex-row items-center gap-0.5 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5">
            <Text className="text-xs">🔒</Text>
            <Text className="text-xs font-semibold text-amber-700">付費練習</Text>
          </View>
        )}
      </View>
      <Text className="text-base font-bold text-slate-800 leading-snug mb-0.5" style={{ fontFamily: "Georgia" }}>
        {article.title}
      </Text>
      <Text className="text-xs text-slate-400 mb-1">{article.source}</Text>
      <Text className="text-xs text-slate-400 mb-2">共 {article.totalQuestions} 題 · {article.totalPoints} 分</Text>
      <ProgressStats progress={progress} totalQuestions={article.totalQuestions} />
      <Pressable onPress={onStart} className="py-2.5 rounded-xl bg-amber-500 items-center active:opacity-80">
        <Text className="text-white font-semibold text-sm">立即開始</Text>
      </Pressable>
    </View>
  )
}

function ChallengeCard({ article, progress, onStart }: CardProps) {
  const isPaid = !article.isFree

  return (
    <View className="rounded-2xl px-4 pt-4 pb-3 border border-slate-700 bg-slate-800 mb-3">
      <View className="flex-row items-center gap-2 mb-2.5">
        <ArticleTypeBadge articleType={article.articleType} />
        <View className="bg-amber-500 rounded px-2 py-0.5 mb-2">
          <Text className="text-white text-[10px] font-bold tracking-widest">章節挑戰</Text>
        </View>
        {isPaid && (
          <View className="flex-row items-center gap-0.5 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 mb-2">
            <Text className="text-xs">🔒</Text>
            <Text className="text-xs font-semibold text-amber-700">付費練習</Text>
          </View>
        )}
      </View>
      <Text className="text-base font-bold text-white leading-snug mb-0.5" style={{ fontFamily: "Georgia" }}>
        {article.title}
      </Text>
      <Text className="text-xs text-slate-400 mb-1">{article.source}</Text>
      <Text className="text-xs text-slate-500 mb-2">共 {article.totalQuestions} 題 · {article.totalPoints} 分</Text>
      <ProgressStats progress={progress} totalQuestions={article.totalQuestions} />
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
  const [progressMap, setProgressMap] = useState<ArticleProgressMap>({})

  useFocusEffect(
    useCallback(() => {
      getReadArticles().then((ids) => setReadIds(new Set(ids)))
      setArticles(filterDSE(getArticleIndex()))
      if (user && !user.is_anonymous) {
        fetchArticleProgress(user.id).then(setProgressMap).catch(() => {})
      }
    }, [user])
  )

  useEffect(() => subscribeToUpdates(() => setArticles(filterDSE(getArticleIndex()))), [])

  function handleStart(article: ArticleEntry) {
    if (!article.isFree && !user) {
      setShowUpgrade(true)
      return
    }
    router.push(`/read?id=${article.id}`)
  }

  const dseExamCount = articles.filter((a) => a.articleType === "dse-exam").length
  const dseNonExamCount = articles.filter((a) => a.articleType === "dse-non-exam").length

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-xl font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>DSE 文章練習</Text>
        <Text className="text-xs text-slate-500 mt-1">共 {articles.length} 篇</Text>
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Brief info banner */}
        <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <Text className="text-xs text-amber-800 leading-5">
            DSE 考試共含 <Text className="font-bold">12 篇甲部指定篇章</Text>，<Text className="font-bold">8 篇教學課文</Text>。
            每次練習隨機抽出 <Text className="font-bold">22 題</Text>，約使用 <Text className="font-bold">10 分鐘</Text>完成。
          </Text>
        </View>

        {articles.map((article) =>
          article.type === "challenge" ? (
            <ChallengeCard
              key={article.id}
              article={article}
              progress={progressMap[article.id]}
              onStart={() => handleStart(article)}
            />
          ) : (
            <LessonCard
              key={article.id}
              article={article}
              progress={progressMap[article.id]}
              onStart={() => handleStart(article)}
            />
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
