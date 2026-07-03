import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useState, useEffect, useCallback } from "react"
import { useFocusEffect } from "expo-router"
import { getPartTitles, getArticleIndex, isArticleFree } from "@/lib/data"
import { sampleQuiz } from "@/lib/sampleQuiz"
import { invalidateArticleProgress } from "@/lib/articleProgress"
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f0e6' }}>
        <UpgradeModal visible={true} onClose={() => router.back()} />
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f0e6', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#b0392c" />
        <Text style={{ color: '#6f665a', marginTop: 16, fontSize: 14 }}>載入題目...</Text>
      </SafeAreaView>
    )
  }

  if (error || !result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f0e6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: '#2c2722', fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
          {error ?? "無法載入題目。"}
        </Text>
        <Pressable
          onPress={fetchSample}
          style={{ backgroundColor: '#b0392c', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          className="active:opacity-80"
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>重試</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const { questions, poolProgress } = result
  const partTitles = getPartTitles(id)
  const expectedMinutes = getArticleIndex().find((a) => a.id === id)?.expectedMinutes
  const isAnonymous = !user || user.is_anonymous

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f0e6' }}>
      <QuizShell
        questions={questions}
        partTitles={partTitles}
        articleId={id}
        expectedMinutes={expectedMinutes}
        onExit={() => router.back()}
        onFinished={() => {
          invalidateArticleProgress()
          setNeedsProgressRefresh(true)
        }}
      />
    </SafeAreaView>
  )
}
