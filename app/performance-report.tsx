import { useState, useEffect } from "react"
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { getArticleIndex, STANDARD_PART_TITLES } from "@/lib/data"
import QuizShell from "@/components/quiz/QuizShell"
import type { Question } from "@/lib/types"
import { Button, JianColors, JianTypography, JianRadius, getSerifFont } from "@/components/jian"

const API_URL = process.env.EXPO_PUBLIC_ADMIN_URL || "https://ccladmin.mickey-calligraphy.art"

interface RevisionSummary {
  overall: {
    totalMistakes: number
    weakestPart: number | null
    weakestPartCount: number
  }
  byArticle: Array<{
    articleId: string
    totalMistakes: number
    byPart: Record<number, number>
  }>
  byPart: Array<{
    part: number
    totalMistakes: number
    byArticle: Record<string, number>
    isWeightTraining: boolean
  }>
  weightTraining: {
    totalMistakes: number
    byPart: Record<number, number>
  }
}

export default function RevisionScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const params = useLocalSearchParams()

  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
  const [view, setView] = useState<"article" | "part">(
    params.view === "part" ? "part" : "article"
  )
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

  async function startRevision(options: { articleId?: string; part?: number; limit?: number }) {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      let url = `${API_URL}/api/revision/sample?userId=${user.id}`
      if (options.articleId) url += `&articleId=${options.articleId}`
      if (options.part !== undefined) url += `&part=${options.part}`
      if (options.limit) url += `&limit=${options.limit}`

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
    loadSummary() // Refresh summary after quiz
  }

  // Anonymous user
  if (!user || user.is_anonymous) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-slate-700 text-base text-center mb-4">
          登入後才能查看錯題重溫
        </Text>
        <Pressable
          onPress={() => router.push("/login")}
          className="bg-amber-500 rounded-xl px-6 py-3 active:opacity-80"
        >
          <Text className="text-white font-semibold">登入 / 建立帳戶</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  // Quiz phase
  if (phase === "quiz" && questions.length > 0) {
    // Build articles map for multi-article support
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
  if (!summary || summary.overall.totalMistakes === 0) {
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

  // Simplified part titles for display
  const partTitles: Record<number, string> = {
    1: "字詞解釋",
    2: "語句理解",
    3: "文意判斷",
    4: "語譯填充",
    5: "句序排列",
    6: "綜合理解",
    7: "一詞多義",
    8: "文言句式",
  }

  // Lobby - Main analysis view
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

          {/* Header */}
          <View style={{ marginTop: 14 }}>
            <Text style={{
              fontFamily: getSerifFont('700'),
              fontSize: 21,
              lineHeight: 28,
              color: JianColors.ink
            }}>
              詳細報告 · 能力分析
            </Text>
            <Text style={{
              fontFamily: getSerifFont('400'),
              fontSize: 13,
              lineHeight: 22,
              color: JianColors.ink2,
              marginTop: 8
            }}>
              查看你的錯題分佈與薄弱環節
            </Text>
          </View>

          {/* Overall stats card */}
          <View style={{
            backgroundColor: JianColors.surface2,
            borderWidth: 1,
            borderColor: JianColors.line,
            borderRadius: 11,
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
              整 體 統 計
            </Text>
            <Text style={{
              fontFamily: getSerifFont('700'),
              fontSize: 18,
              lineHeight: 26,
              color: JianColors.ink
            }}>
              總計：{summary.overall.totalMistakes} 題待重溫
            </Text>
            {summary.overall.weakestPart && (
              <Text style={{
                fontFamily: getSerifFont('400'),
                fontSize: 13,
                lineHeight: 20,
                color: JianColors.ink2,
                marginTop: 4
              }}>
                最弱部分：{partTitles[summary.overall.weakestPart] || `第${summary.overall.weakestPart}部分`}（{summary.overall.weakestPartCount} 題）
              </Text>
            )}
          </View>

          {/* Part-by-part breakdown */}
          <View style={{ marginTop: 24 }}>
            <Text style={{
              fontFamily: JianTypography.sans,
              fontSize: 10,
              letterSpacing: 2,
              color: JianColors.ink3,
              marginBottom: 11
            }}>
              分 部 統 計
            </Text>
            <View style={{ flexDirection: 'column', gap: 9 }}>
              {summary.byPart.map(partData => {
                const isWeakest = summary.overall.weakestPart === partData.part
                const isHighlighted = partData.part === 7 || partData.part === 8

                return (
                  <View key={partData.part} style={{
                    backgroundColor: isWeakest ? JianColors.vermilionTint : JianColors.surface,
                    borderWidth: 1,
                    borderColor: isHighlighted ? JianColors.vermilionBorder : JianColors.line,
                    borderRadius: 11,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <View style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      backgroundColor: isHighlighted ? JianColors.vermilion : JianColors.surface2,
                      borderWidth: 1,
                      borderColor: isHighlighted ? JianColors.vermilion : JianColors.line2,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Text style={{
                        fontFamily: JianTypography.number,
                        fontSize: 13,
                        color: isHighlighted ? '#fff' : JianColors.ink2
                      }}>
                        {partData.part}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <Text style={{
                          fontFamily: getSerifFont('600'),
                          fontSize: 15,
                          lineHeight: 22,
                          color: JianColors.ink
                        }}>
                          {partTitles[partData.part] || `第 ${partData.part} 部分`}
                        </Text>
                        {isWeakest && (
                          <View style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 3,
                            backgroundColor: '#fff',
                            borderWidth: 1,
                            borderColor: JianColors.vermilionBorder
                          }}>
                            <Text style={{
                              fontFamily: JianTypography.sans,
                              fontSize: 10,
                              letterSpacing: 0.6,
                              color: JianColors.vermilion,
                              fontWeight: '500'
                            }}>
                              ⚠ 最弱
                            </Text>
                          </View>
                        )}
                        {isHighlighted && !isWeakest && (
                          <View style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 3,
                            backgroundColor: JianColors.vermilionTint,
                            borderWidth: 1,
                            borderColor: JianColors.vermilionBorder
                          }}>
                            <Text style={{
                              fontFamily: JianTypography.sans,
                              fontSize: 10,
                              letterSpacing: 0.6,
                              color: JianColors.vermilion,
                              fontWeight: '500'
                            }}>
                              薄弱
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{
                        fontFamily: JianTypography.sans,
                        fontSize: 11,
                        lineHeight: 18,
                        color: isHighlighted ? JianColors.vermilion : JianColors.ink3,
                        marginTop: 2
                      }}>
                        {partData.totalMistakes} 題待重溫
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Navigation buttons */}
          <View style={{ marginTop: 24, gap: 11 }}>
            <Pressable onPress={() => router.push("/revision-article")} hitSlop={8}>
              {({ pressed }) => (
                <View style={{
                  backgroundColor: JianColors.surface,
                  borderWidth: 1,
                  borderColor: JianColors.line,
                  borderRadius: 11,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
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
                        color: JianColors.vermilion
                      }}>
                        篇
                      </Text>
                    </View>
                    <Text style={{
                      fontFamily: getSerifFont('600'),
                      fontSize: 16,
                      lineHeight: 24,
                      color: JianColors.ink
                    }}>
                      按文章重溫
                    </Text>
                  </View>
                  <Text style={{
                    fontFamily: getSerifFont('400'),
                    fontSize: 18,
                    color: JianColors.vermilion
                  }}>
                    ›
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable onPress={() => router.push("/revision-part")} hitSlop={8}>
              {({ pressed }) => (
                <View style={{
                  backgroundColor: JianColors.surface,
                  borderWidth: 1,
                  borderColor: JianColors.line,
                  borderRadius: 11,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
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
                        color: JianColors.vermilion
                      }}>
                        基
                      </Text>
                    </View>
                    <Text style={{
                      fontFamily: getSerifFont('600'),
                      fontSize: 16,
                      lineHeight: 24,
                      color: JianColors.ink
                    }}>
                      按部分重溫
                    </Text>
                  </View>
                  <Text style={{
                    fontFamily: getSerifFont('400'),
                    fontSize: 18,
                    color: JianColors.vermilion
                  }}>
                    ›
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
