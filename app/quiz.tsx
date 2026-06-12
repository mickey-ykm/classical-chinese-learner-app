import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useState, useEffect, useCallback } from "react"
import { useFocusEffect } from "expo-router"
import { getPartTitles, getArticleIndex, isArticleFree } from "@/lib/data"
import { sampleQuiz } from "@/lib/sampleQuiz"
import { useAuth } from "@/hooks/useAuth"
import UpgradeModal from "@/components/UpgradeModal"
import QuizShell from "@/components/quiz/QuizShell"
import type { SampledQuizResponse } from "@/lib/types"

export default function QuizScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, profile } = useAuth()

  const isPro = profile?.is_pro ?? false
  const gated = !isArticleFree(id) && !isPro

  const [result, setResult] = useState<SampledQuizResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsProgressRefresh, setNeedsProgressRefresh] = useState(false)

  useEffect(() => {
    if (gated) return
    fetchSample()
  }, [id, gated])

  // When returning to this screen after quiz completion, refresh poolProgress
  useFocusEffect(
    useCallback(() => {
      if (!needsProgressRefresh || !result) return
      setNeedsProgressRefresh(false)
      sampleQuiz(id, user?.id)
        .then((updated) =>
          setResult((prev) => prev ? { ...prev, poolProgress: updated.poolProgress } : prev)
        )
        .catch(() => {})
    }, [needsProgressRefresh, id, user?.id])
  )

  async function fetchSample() {
    setLoading(true)
    setError(null)
    try {
      const data = await sampleQuiz(id, user?.id)
      setResult(data)
    } catch (e: any) {
      setError(e.message ?? "發生錯誤，請稍後再試。")
    } finally {
      setLoading(false)
    }
  }

  if (gated) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <UpgradeModal visible={true} onClose={() => router.back()} />
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text className="text-slate-500 mt-4 text-sm">載入題目...</Text>
      </SafeAreaView>
    )
  }

  if (error || !result) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-slate-700 text-base text-center mb-6">
          {error ?? "無法載入題目。"}
        </Text>
        <Pressable
          onPress={fetchSample}
          className="bg-amber-500 px-6 py-3 rounded-xl active:opacity-80"
        >
          <Text className="text-white font-semibold">重試</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const { questions, poolProgress } = result
  const partTitles = getPartTitles(id)
  const expectedMinutes = getArticleIndex().find((a) => a.id === id)?.expectedMinutes
  const isAnonymous = !user || user.is_anonymous

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5" contentContainerClassName="py-8">
        <Pressable onPress={() => router.back()} className="mb-6" hitSlop={12}>
          <Text className="text-sm text-slate-400">← 返回</Text>
        </Pressable>

        <Text className="text-lg font-bold text-slate-800 mb-4">閱讀理解測驗</Text>

        {/* Pool progress */}
        <View className="mb-5">
          <Text className="text-sm text-slate-500">
            已見過{" "}
            <Text className="text-slate-700 font-medium">
              {poolProgress.seenCount} / {poolProgress.totalInPool}
            </Text>{" "}
            題
            {poolProgress.estimatedAttemptsToComplete > 0 && (
              <>
                {"　"}
                <Text className="text-amber-600">
                  建議再練習 {poolProgress.estimatedAttemptsToComplete} 次
                </Text>
              </>
            )}
          </Text>
          {isAnonymous && (
            <Text className="text-xs text-slate-400 mt-1">登入以避免重複題目</Text>
          )}
        </View>

        <QuizShell
          questions={questions}
          partTitles={partTitles}
          articleId={id}
          expectedMinutes={expectedMinutes}
          onFinished={() => setNeedsProgressRefresh(true)}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
