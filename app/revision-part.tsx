import { useState, useEffect } from "react"
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { STANDARD_PART_TITLES } from "@/lib/data"
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
  byPart: Array<{
    part: number
    totalMistakes: number
    byArticle: Record<string, number>
    isWeightTraining: boolean
  }>
}

export default function RevisionPartScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<RevisionSummary | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState<string | null>(null)

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

  async function startRevision(part: number) {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const url = `${API_URL}/api/revision/sample?userId=${user.id}&part=${part}&limit=10`
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
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
        <QuizShell
          questions={questions}
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
  if (!summary || summary.byPart.length === 0) {
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

  // Lobby - Part view only
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
                基
              </Text>
            </View>
            <Text style={{
              fontFamily: getSerifFont('700'),
              fontSize: 19,
              lineHeight: 24,
              color: JianColors.ink
            }}>
              文言文語基能力{'\n'}錯題重溫
            </Text>
          </View>

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
                最弱部分：{partTitles[summary.overall.weakestPart]}（{summary.overall.weakestPartCount} 題）
              </Text>
            )}
          </View>
        </View>

        {/* Part cards */}
        <View style={{ flexDirection: 'column', gap: 9, marginTop: 13, marginBottom: 18 }}>
          {summary.byPart.map(partData => {
            const isWeakest = summary.overall.weakestPart === partData.part
            const isCompleted = partData.totalMistakes === 0
            const isHighlighted = partData.part === 7 || partData.part === 8

            return (
              <Pressable
                key={partData.part}
                onPress={() => !isCompleted && startRevision(partData.part)}
                disabled={isCompleted}
                hitSlop={8}
              >
                {({ pressed }) => (
                  <View style={{
                    backgroundColor: isWeakest ? JianColors.vermilionTint : JianColors.surface,
                    borderWidth: 1,
                    borderColor: isHighlighted ? JianColors.vermilionBorder : JianColors.line,
                    borderRadius: JianRadius.card,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    opacity: isCompleted ? 0.6 : pressed ? 0.7 : 1
                  }}>
                    <View style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      backgroundColor: isCompleted
                        ? JianColors.jadeTint
                        : isHighlighted
                        ? JianColors.vermilion
                        : JianColors.surface2,
                      borderWidth: 1,
                      borderColor: isCompleted
                        ? JianColors.jadeBorder
                        : isHighlighted
                        ? JianColors.vermilion
                        : JianColors.line2,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Text style={{
                        fontFamily: JianTypography.number,
                        fontSize: 13,
                        lineHeight: 13,
                        color: isCompleted
                          ? JianColors.jade
                          : isHighlighted
                          ? '#fff'
                          : JianColors.ink2
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
                        {isHighlighted && !isWeakest && partData.totalMistakes > 0 && (
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
                        color: isCompleted ? JianColors.jade : isHighlighted && partData.totalMistakes > 0 ? JianColors.vermilion : JianColors.ink3,
                        marginTop: 2
                      }}>
                        {isCompleted ? '已全部答對' : `${partData.totalMistakes} 題待重溫`}
                      </Text>
                    </View>
                    {!isCompleted && (
                      <Text style={{
                        fontFamily: getSerifFont('400'),
                        fontSize: 18,
                        lineHeight: 18,
                        color: isHighlighted ? JianColors.vermilion : JianColors.vermilion
                      }}>
                        ›
                      </Text>
                    )}
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
