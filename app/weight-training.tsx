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
import { Button, JianColors, JianTypography, JianRadius, getSerifFont } from "@/components/jian"

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
          points: q.points || 1,  // Use points from API response
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
        // Silently ignore invalid calls (duplicate invocations with stale data)
        return
      }

      // Convert answers to ExerciseAnswer format
      const exerciseAnswers: ExerciseAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: String(questionId),
        userAnswer: answer.selectedOption || null,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned || (answer.isCorrect ? 1 : 0),
      }))

      // Validate we have answers
      if (exerciseAnswers.length === 0) {
        // Silently ignore if no answers (shouldn't happen with valid data)
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
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={{ paddingTop: 10 }}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              {({ pressed }) => (
                <Text style={{
                  fontFamily: getSerifFont('400'),
                  fontSize: 14,
                  lineHeight: 20,
                  color: JianColors.vermilion,
                  opacity: pressed ? 0.7 : 1
                }}>
                  ‹ 返回
                </Text>
              )}
            </Pressable>

            {/* Header with icon */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14 }}>
              <View style={{
                width: 34,
                height: 34,
                borderRadius: 5,
                borderWidth: 1.4,
                borderColor: JianColors.vermilion,
                backgroundColor: JianColors.vermilionTint,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text style={{
                  fontFamily: getSerifFont('700'),
                  fontSize: 18,
                  lineHeight: 18,
                  color: JianColors.vermilion
                }}>
                  重
                </Text>
              </View>
              <Text style={{
                fontFamily: getSerifFont('700'),
                fontSize: 21,
                lineHeight: 28,
                color: JianColors.ink
              }}>
                針對性難題訓練
              </Text>
            </View>

            <Text style={{
              fontFamily: getSerifFont('400'),
              fontSize: 13,
              lineHeight: 22,
              color: JianColors.ink2,
              marginTop: 8
            }}>
              跨文章一詞多義 & 文言句式專項訓練（Part 7 & 8）
            </Text>

            {/* Progress Card (logged-in users only) */}
            {user && progress && (
              <View style={{
                backgroundColor: JianColors.surface2,
                borderWidth: 1,
                borderColor: JianColors.line,
                borderRadius: JianRadius.card,
                padding: 16,
                marginTop: 16
              }}>
                <Text style={{
                  fontFamily: JianTypography.sans,
                  fontSize: 10,
                  letterSpacing: 2,
                  color: JianColors.ink3,
                  marginBottom: 9
                }}>
                  練 習 進 度
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <Text style={{
                    fontFamily: getSerifFont('400'),
                    fontSize: 13,
                    lineHeight: 20,
                    color: JianColors.ink2
                  }}>
                    總題庫
                  </Text>
                  <Text style={{
                    fontFamily: JianTypography.number,
                    fontSize: 15,
                    fontWeight: '600',
                    color: JianColors.ink
                  }}>
                    {progress.seenCount} / {progress.totalInPool} 題
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <Text style={{
                    fontFamily: getSerifFont('400'),
                    fontSize: 13,
                    lineHeight: 20,
                    color: JianColors.ink2
                  }}>
                    Part 7（一詞多義）
                  </Text>
                  <Text style={{
                    fontFamily: JianTypography.number,
                    fontSize: 14,
                    color: JianColors.ink2
                  }}>
                    {progress.part7Seen} / {progress.part7Total}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{
                    fontFamily: getSerifFont('400'),
                    fontSize: 13,
                    lineHeight: 20,
                    color: JianColors.ink2
                  }}>
                    Part 8（文言句式）
                  </Text>
                  <Text style={{
                    fontFamily: JianTypography.number,
                    fontSize: 14,
                    color: JianColors.ink2
                  }}>
                    {progress.part8Seen} / {progress.part8Total}
                  </Text>
                </View>
              </View>
            )}

            {/* Training Info */}
            <View style={{
              backgroundColor: JianColors.amberTint,
              borderWidth: 1,
              borderColor: JianColors.amberBorder,
              borderRadius: JianRadius.card,
              padding: 16,
              marginTop: 16
            }}>
              <Text style={{
                fontFamily: getSerifFont('600'),
                fontSize: 14,
                lineHeight: 20,
                color: JianColors.amber,
                marginBottom: 8
              }}>
                訓練內容
              </Text>
              <Text style={{
                fontFamily: getSerifFont('400'),
                fontSize: 13,
                lineHeight: 22,
                color: JianColors.ink2
              }}>
                • 每次練習 10 題（Part 7：5 題，Part 8：5 題）{'\n'}
                • 橫跨多篇文章的綜合運用{'\n'}
                • 可隨時查看相關文章內容{'\n'}
                • 已做過的題目會優先避開
              </Text>
            </View>
          </View>

          {/* Start Button */}
          <View style={{ marginTop: 24 }}>
            <Button
              variant="primary"
              size="large"
              fullWidth
              onPress={startTraining}
              disabled={loading}
            >
              {loading ? "載入中..." : "開始訓練"}
            </Button>

            {error && (
              <View style={{
                marginTop: 16,
                backgroundColor: '#fee',
                borderWidth: 1,
                borderColor: '#fcc',
                borderRadius: 8,
                padding: 12
              }}>
                <Text style={{
                  fontFamily: getSerifFont('400'),
                  fontSize: 13,
                  lineHeight: 20,
                  color: '#c33',
                  textAlign: 'center'
                }}>
                  {error}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Quiz screen
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={JianColors.amber} />
        <Text style={{
          fontFamily: JianTypography.serif,
          fontSize: 13,
          lineHeight: 20,
          color: JianColors.ink2,
          marginTop: 16
        }}>
          載入題目...
        </Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
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
