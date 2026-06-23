import { useState, useEffect } from "react"
import { View, Text, ActivityIndicator, ScrollView, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useFocusEffect } from "@react-navigation/native"
import { useCallback } from "react"
import QuizShell from "@/components/quiz/QuizShell"
import { useAuth } from "@/hooks/useAuth"
import { getArticle } from "@/lib/data"
import { sampleWeightTraining, saveWeightTrainingSession } from "@/lib/weightTraining"
import { getWeightTrainingProgressCached, refreshWeightTrainingProgress } from "@/lib/weightTrainingProgress"
import type { Question, CrossArticleQuestion, WeightTrainingProgress, ExerciseAnswer } from "@/lib/types"

export default function WeightTrainingScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
  const [questions, setQuestions] = useState<Question[]>([])
  const [crossArticleQuestions, setCrossArticleQuestions] = useState<CrossArticleQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<WeightTrainingProgress | null>(null)
  const [needsProgressRefresh, setNeedsProgressRefresh] = useState(false)

  // Load progress when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id && (needsProgressRefresh || !progress)) {
        loadProgress()
        setNeedsProgressRefresh(false)
      }
    }, [user?.id, needsProgressRefresh])
  )

  async function loadProgress() {
    if (!user?.id) return
    try {
      const prog = await getWeightTrainingProgressCached(user.id)
      setProgress(prog)
    } catch (e: any) {
      console.error("Failed to load progress:", e)
      // Non-fatal - continue without progress display
      setProgress(null)
    }
  }

  async function startTraining() {
    try {
      setLoading(true)
      setError(null)

      // Try with userId first, fallback to anonymous if it fails
      let sampled: CrossArticleQuestion[]
      try {
        sampled = await sampleWeightTraining(user?.id)
      } catch (e: any) {
        console.warn("Failed to sample with user ID, trying anonymous:", e)
        // Fallback to anonymous sampling
        sampled = await sampleWeightTraining(undefined)
      }

      if (sampled.length === 0) {
        setError("未有可用的題目。請稍後再試。")
        return
      }

      // Store original cross-article questions for related article IDs
      setCrossArticleQuestions(sampled)

      // Convert CrossArticleQuestion to Question format for QuizShell
      const convertedQuestions: Question[] = sampled.map((q, idx) => {
        const question: Question = {
          id: q.id,
          part: q.part as 7 | 8,
          points: 1,
          stem: q.questionText,
          format: q.format,
          options: q.options
            ? q.options.map((text, i) => ({
                key: String.fromCharCode(65 + i) as any, // A, B, C, D...
                text,
              }))
            : [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          selectCount: q.selectCount,
          sequenceTokens: q.sequenceTokens,
          relatedArticleIds: q.relatedArticleIds, // Pass through for multi-article buttons
        }
        return question
      })

      setQuestions(convertedQuestions)
      setPhase("quiz")
    } catch (e: any) {
      setError(e.message ?? "發生錯誤，請稍後再試。")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(score: number, total: number, answers: Record<string | number, any>) {
    if (!user?.id) return

    try {
      // Check if answers is actually an object
      if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
        console.warn("Invalid answers format:", typeof answers, answers)
        return
      }

      console.log("handleSave called with:", { score, total, answersCount: Object.keys(answers).length })

      // Convert answers to ExerciseAnswer format
      const exerciseAnswers: ExerciseAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: String(questionId),
        userAnswer: answer.selectedOption || null,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned || (answer.isCorrect ? 1 : 0),
      }))

      // Validate we have answers
      if (exerciseAnswers.length === 0) {
        console.warn("No answers to save - answers object:", answers)
        return
      }

      await saveWeightTrainingSession(user.id, score, total, exerciseAnswers)

      // Mark progress for refresh on next lobby visit
      setNeedsProgressRefresh(true)
    } catch (e) {
      console.error("Failed to save session:", e)
      // Non-fatal, continue anyway
    }
  }

  function handleQuizExit() {
    setPhase("lobby")
    setQuestions([])
    setCrossArticleQuestions([])
    setError(null)
  }

  // Lobby screen
  if (phase === "lobby") {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-5 pt-4 pb-2">
          <Text className="text-xl font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>
            🎯 重量訓練
          </Text>
        </View>
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
          <Text className="text-sm text-slate-500 mt-2 mb-6 leading-5">
            跨文章一詞多義 & 文言句式專項訓練
          </Text>

          {/* Progress Card (logged-in users only) */}
          {user && progress && (
            <View className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-4 shadow-sm">
              <Text className="text-sm font-semibold text-slate-700 mb-3">練習進度</Text>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs text-slate-500">總題庫</Text>
                <Text className="text-sm font-bold text-slate-800">
                  {progress.seenCount} / {progress.totalInPool} 題
                </Text>
              </View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs text-slate-500">Part 7 (一詞多義)</Text>
                <Text className="text-sm text-slate-600">
                  {progress.part7Seen} / {progress.part7Total}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-slate-500">Part 8 (文言句式)</Text>
                <Text className="text-sm text-slate-600">
                  {progress.part8Seen} / {progress.part8Total}
                </Text>
              </View>
            </View>
          )}

          {/* Training Info */}
          <View className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
            <Text className="text-amber-800 text-sm font-semibold mb-2">訓練內容</Text>
            <Text className="text-amber-700 text-xs leading-5">
              • 每次練習 10 題（Part 7：5 題，Part 8：5 題）{"\n"}
              • 橫跨多篇文章的綜合運用{"\n"}
              • 可隨時查看相關文章內容{"\n"}
              • 已做過的題目會優先避開
            </Text>
          </View>

          {/* Start Button */}
          <Pressable
            onPress={startTraining}
            disabled={loading}
            className="bg-amber-500 px-6 py-4 rounded-xl active:opacity-80 items-center shadow-sm"
          >
            <Text className="text-white font-bold text-base">
              {loading ? "載入中..." : "開始訓練"}
            </Text>
          </Pressable>

          {error && (
            <View className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <Text className="text-red-700 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            className="mt-4 py-3 px-6 rounded-xl bg-slate-100 items-center active:opacity-70"
          >
            <Text className="text-slate-600 font-semibold text-sm">返回</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Quiz screen
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text className="text-slate-500 mt-4 text-sm">載入題目...</Text>
      </SafeAreaView>
    )
  }

  // Build relatedArticles map for multi-article mode
  const relatedArticlesMap: Record<string, { id: string; title: string }[]> = {}
  crossArticleQuestions.forEach((cq) => {
    relatedArticlesMap[cq.id] = cq.relatedArticleIds.map((articleId) => {
      const article = getArticle(articleId)
      return {
        id: articleId,
        title: article?.title || articleId,
      }
    })
  })

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <QuizShell
        questions={questions}
        onSave={handleSave}
        onExit={handleQuizExit}
        exerciseType="weight-training"
        relatedArticlesMap={relatedArticlesMap}
      />
    </SafeAreaView>
  )
}
