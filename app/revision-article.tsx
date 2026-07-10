import { useState, useEffect } from "react"
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { getArticleIndex } from "@/lib/data"
import QuizShell from "@/components/quiz/QuizShell"
import type { Question } from "@/lib/types"
import { Button, JianColors, JianTypography, JianRadius, getSerifFont } from "@/components/jian"

const API_URL = process.env.EXPO_PUBLIC_ADMIN_URL || "https://ccladmin.mickey-calligraphy.art"

interface RevisionSummary {
  byArticle: Array<{
    articleId: string
    totalMistakes: number
    byPart: Record<number, number>
  }>
}

export default function RevisionArticleScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<RevisionSummary | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState<string | null>(null)

  const articleIndex = getArticleIndex()
  const titleById = Object.fromEntries(articleIndex.map(a => [a.id, a.title]))

  useEffect(() => {
    if (!user || user.is_anonymous) {
      setLoading(false)
      return
    }
    loadSummary()
  }, [user])

  async function loadSummary() {
    if (!user) return

    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/revision/summary?userId=${user.id}`)
      if (!res.ok) throw new Error("Failed to load revision summary")

      const data = await res.json()
      setSummary(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function startRevision(articleId: string) {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const url = `${API_URL}/api/revision/sample?userId=${user.id}&articleId=${articleId}&limit=10`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to sample questions")

      const data = await res.json()

      if (!data || data.length === 0) {
        setError("沒有可用的錯題")
        setLoading(false)
        return
      }

      setQuestions(data)
      setPhase("quiz")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleQuizExit() {
    setPhase("lobby")
    setQuestions([])
    loadSummary()
  }

  // Anonymous user
  if (!user || user.is_anonymous) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{
          fontFamily: getSerifFont('400'),
          fontSize: 16,
          lineHeight: 26,
          color: JianColors.ink,
          textAlign: 'center',
          marginBottom: 16
        }}>
          登入後才能查看錯題重溫
        </Text>
        <Button variant="primary" size="medium" onPress={() => router.push("/login")}>
          登入 / 建立帳戶
        </Button>
      </SafeAreaView>
    )
  }

  // Quiz phase
  if (phase === "quiz" && questions.length > 0) {
    const articlesMap: Record<string, { id: string; title: string }> = {}
    for (const q of questions) {
      if (q.articleId && !articlesMap[q.articleId]) {
        articlesMap[q.articleId] = {
          id: q.articleId,
          title: titleById[q.articleId] || q.articleId
        }
      }
    }
    const articlesArray = Object.values(articlesMap)

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
        <QuizShell
          questions={questions}
          articles={articlesArray.length > 0 ? articlesArray : undefined}
          exerciseType="regular"
          onExit={handleQuizExit}
        />
      </SafeAreaView>
    )
  }

  // Loading
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={JianColors.amber} />
      </SafeAreaView>
    )
  }

  // Error
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{
          fontFamily: getSerifFont('400'),
          fontSize: 16,
          lineHeight: 26,
          color: JianColors.ink,
          textAlign: 'center',
          marginBottom: 16
        }}>
          {error}
        </Text>
        <Button variant="primary" size="medium" onPress={loadSummary}>
          重試
        </Button>
      </SafeAreaView>
    )
  }

  // Empty state
  if (!summary || summary.byArticle.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            {({ pressed }) => (
              <Text style={{
                fontFamily: getSerifFont('400'),
                fontSize: 14,
                lineHeight: 20,
                color: JianColors.vermilion,
                marginBottom: 24,
                opacity: pressed ? 0.7 : 1
              }}>
                ‹ 返回
              </Text>
            )}
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>🎉</Text>
          <Text style={{
            fontFamily: getSerifFont('700'),
            fontSize: 24,
            lineHeight: 32,
            color: JianColors.ink,
            marginBottom: 8
          }}>
            太棒了！
          </Text>
          <Text style={{
            fontFamily: JianTypography.serif,
            fontSize: 14,
            lineHeight: 22,
            color: JianColors.ink2,
            textAlign: 'center'
          }}>
            你沒有任何待重溫的錯題
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Lobby - Article view only
  const totalMistakes = summary.byArticle.reduce((sum, a) => sum + a.totalMistakes, 0)
  const mostMistakesArticle = summary.byArticle.reduce((max, a) =>
    a.totalMistakes > max.totalMistakes ? a : max
  , summary.byArticle[0])

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
                篇
              </Text>
            </View>
            <Text style={{
              fontFamily: getSerifFont('700'),
              fontSize: 21,
              lineHeight: 28,
              color: JianColors.ink
            }}>
              文章錯題重溫
            </Text>
          </View>

          <Text style={{
            fontFamily: getSerifFont('400'),
            fontSize: 13,
            lineHeight: 22,
            color: JianColors.ink2,
            marginTop: 8
          }}>
            按文章分類，針對性重溫各篇章的錯題。
          </Text>

          {/* Overall stats card */}
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
              marginBottom: 7
            }}>
              整 體 統 計
            </Text>
            <Text style={{
              fontFamily: getSerifFont('700'),
              fontSize: 18,
              lineHeight: 26,
              color: JianColors.ink
            }}>
              總計：{totalMistakes} 題待重溫
            </Text>
            <Text style={{
              fontFamily: getSerifFont('400'),
              fontSize: 13,
              lineHeight: 20,
              color: JianColors.ink2,
              marginTop: 4
            }}>
              涉及 {summary.byArticle.length} 篇文章　|　最多：{titleById[mostMistakesArticle.articleId]}（{mostMistakesArticle.totalMistakes} 題）
            </Text>
          </View>
        </View>

        {/* Article cards */}
        <View style={{ marginTop: 13 }}>
          {summary.byArticle.map(article => {
            const partSummary = Object.entries(article.byPart)
              .map(([part, count]) => `第 ${part} 部分：${count} 題`)
              .join('　|　')

            return (
              <View key={article.articleId} style={{
                backgroundColor: JianColors.surface,
                borderWidth: 1,
                borderColor: JianColors.line,
                borderRadius: JianRadius.card,
                padding: 15,
                marginBottom: 11
              }}>
                <Text style={{
                  fontFamily: getSerifFont('600'),
                  fontSize: 16,
                  lineHeight: 24,
                  color: JianColors.ink
                }}>
                  {titleById[article.articleId] || article.articleId}
                </Text>
                <Text style={{
                  fontFamily: getSerifFont('400'),
                  fontSize: 12,
                  lineHeight: 18,
                  color: JianColors.ink2,
                  marginTop: 3,
                  marginBottom: 11
                }}>
                  {partSummary}
                </Text>
                <Button
                  variant="primary"
                  size="small"
                  fullWidth
                  onPress={() => startRevision(article.articleId)}
                >
                  開始重溫（{article.totalMistakes} 題）
                </Button>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
