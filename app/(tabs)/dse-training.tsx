import { useState, useEffect, useRef, useCallback } from "react"
import { View, Text, ActivityIndicator, ScrollView, LayoutAnimation, Platform, UIManager, Pressable, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"
import QuizShell from "@/components/quiz/QuizShell"
import { useAuth } from "@/hooks/useAuth"
import { saveDSETrainingSession } from "@/lib/exerciseSession"
import { getArticle } from "@/lib/data"
import type { Question, Article, QuizAnswer } from "@/lib/types"
import { Button, JianColors, JianTypography, JianRadius, getSerifFont } from "@/components/jian"
import { Logo } from "@/components/Logo"

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface SelectedArticle {
  id: string
  title: string
  article: Article
}

function ArticleAccordion({ article, index }: { article: SelectedArticle; index: number }) {
  const [expanded, setExpanded] = useState(false)

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((v) => !v)
  }

  const segments = article.article.segments ?? []
  const footnotes = article.article.footnotes ?? []

  const numberLabels = ['一', '二', '三', '四', '五']

  return (
    <View style={{
      backgroundColor: JianColors.surface,
      borderRadius: JianRadius.card,
      borderWidth: 1,
      borderColor: JianColors.line,
      marginBottom: 10,
      overflow: 'hidden'
    }}>
      <Pressable onPress={toggle} hitSlop={8}>
        {({ pressed }) => (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
            paddingVertical: 14,
            backgroundColor: expanded ? JianColors.surface2 : 'transparent',
            borderBottomWidth: expanded ? 1 : 0,
            borderBottomColor: JianColors.line,
            opacity: pressed ? 0.7 : 1
          }}>
            <View style={{
              width: 28,
              height: 28,
              borderRadius: 5,
              borderWidth: 1.4,
              borderColor: JianColors.vermilion,
              backgroundColor: JianColors.vermilionTint,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}>
              <Text style={{
                fontFamily: getSerifFont('700'),
                fontSize: 15,
                color: JianColors.vermilion
              }}>
                {numberLabels[index] || (index + 1)}
              </Text>
            </View>
            <Text style={{
              fontFamily: getSerifFont('600'),
              fontSize: 16,
              lineHeight: 24,
              color: JianColors.ink,
              flex: 1
            }}>
              {article.title}
            </Text>
            <Text style={{ fontSize: 18, color: expanded ? JianColors.vermilion : JianColors.ink3 }}>
              {expanded ? '▴' : '▾'}
            </Text>
          </View>
        )}
      </Pressable>
      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 13 }}>
          <Text style={{
            fontFamily: getSerifFont('400'),
            fontSize: 14,
            lineHeight: 28,
            color: JianColors.ink,
            textAlign: 'justify'
          }}>
            {segments.map((seg, i) =>
              seg.footnoteId ? (
                <Text key={i} style={{ color: JianColors.vermilion, fontWeight: '700', fontSize: 10 }}>
                  {seg.text}
                </Text>
              ) : (
                <Text key={i}>{seg.text}</Text>
              )
            )}
          </Text>
          {segments.length === 0 && (
            <Text style={{
              fontFamily: JianTypography.serif,
              fontSize: 13,
              color: JianColors.ink3,
              fontStyle: 'italic'
            }}>
              （未有文章內容）
            </Text>
          )}

          {footnotes.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{
                fontFamily: JianTypography.sans,
                fontSize: 10,
                letterSpacing: 2,
                color: JianColors.ink3,
                marginBottom: 8
              }}>
                註 釋
              </Text>
              {footnotes.map((fn) => (
                <View key={fn.id} style={{ flexDirection: 'row', gap: 9, marginBottom: 6 }}>
                  <Text style={{
                    fontFamily: getSerifFont('700'),
                    fontSize: 13,
                    color: JianColors.vermilion,
                    minWidth: 22
                  }}>
                    {fn.marker}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: getSerifFont('400'),
                      fontSize: 13,
                      lineHeight: 20,
                      color: JianColors.ink2
                    }}>
                      <Text style={{ color: JianColors.ink, fontWeight: '700' }}>{fn.term}</Text> — {fn.explanation}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export default function DSETrainingTab() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const [mode, setMode] = useState<"select" | "mock" | "tricky">("select")
  const [phase, setPhase] = useState<"lobby" | "quiz">("lobby")
  const [selectedArticles, setSelectedArticles] = useState<SelectedArticle[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedAtRef = useRef(Date.now())

  // Handle initial mode from URL params
  useEffect(() => {
    if (params.mode === "mock") {
      setMode("mock")
    }
  }, [params.mode])

  useEffect(() => {
    if (mode === "mock") loadDSEQuestions()
  }, [mode])

  async function loadDSEQuestions() {
    try {
      setLoading(true)
      setError(null)

      // Call the DSE mock sampling API
      const endpoint = process.env.EXPO_PUBLIC_ADMIN_URL ?? "https://ccladmin.mickey-calligraphy.art"
      const url = new URL(`${endpoint}/api/quiz/dse-mock/sample`)
      if (user?.id) {
        url.searchParams.set("userId", user.id)
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Network error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data.articles || data.articles.length === 0) {
        setError("未有 DSE 核心篇章。請稍後再試。")
        return
      }

      if (!data.questions || data.questions.length === 0) {
        setError("未有可用的問題。請稍後再試。")
        return
      }

      // Load article content for each selected article
      const withContent: SelectedArticle[] = data.articles.map((a: { id: string; title: string }) => ({
        id: a.id,
        title: a.title,
        article: getArticle(a.id),
      }))
      setSelectedArticles(withContent)

      // Questions are already sampled and formatted by the backend
      setQuestions(data.questions)
    } catch (e: any) {
      setError(e.message ?? "發生錯誤，請稍後再試。")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = useCallback(async (score: number, total: number, answersObj: Record<string | number, QuizAnswer>) => {
    const totalSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000)

    try {
      await saveDSETrainingSession(
        user?.id ?? null,
        questions,
        answersObj,
        score,
        total,
        totalSeconds
      )
    } catch (err) {
      console.error('DSE training save error:', err)
    }

    // Navigate back without showing alert (consistent with other exercise types)
    router.back()
  }, [user, questions, router])

  // Mode selection screen
  if (mode === "select") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{
            fontFamily: getSerifFont('700'),
            fontSize: 20,
            lineHeight: 28,
            color: JianColors.ink
          }}>
            DSE 操練
          </Text>
        </View>
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 32 }}>
          <Text style={{
            fontFamily: JianTypography.serif,
            fontSize: 13,
            lineHeight: 20,
            color: JianColors.ink2,
            marginTop: 8,
            marginBottom: 24
          }}>
            選擇練習模式開始操練。
          </Text>

          {/* DSE Mock */}
          <Pressable onPress={() => setMode("mock")} hitSlop={8}>
            {({ pressed }) => (
              <View style={{
                backgroundColor: JianColors.surface,
                borderWidth: 1,
                borderColor: JianColors.line,
                borderRadius: JianRadius.card,
                paddingHorizontal: 20,
                paddingVertical: 20,
                marginBottom: 16,
                opacity: pressed ? 0.7 : 1
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>📝</Text>
                  <Text style={{
                    fontFamily: getSerifFont('700'),
                    fontSize: 18,
                    lineHeight: 26,
                    color: JianColors.ink
                  }}>
                    DSE 模擬考題
                  </Text>
                </View>
                <Text style={{
                  fontFamily: JianTypography.serif,
                  fontSize: 14,
                  lineHeight: 22,
                  color: JianColors.ink2
                }}>
                  隨機抽選 2–3 篇 DSE 核心篇章，模擬考試作答。
                </Text>
              </View>
            )}
          </Pressable>

          {/* Article-based Revision */}
          <Pressable onPress={() => router.push("/revision-article")} hitSlop={8}>
            {({ pressed }) => (
              <View style={{
                backgroundColor: JianColors.surface,
                borderWidth: 1,
                borderColor: JianColors.line,
                borderRadius: JianRadius.card,
                paddingHorizontal: 20,
                paddingVertical: 20,
                marginBottom: 16,
                opacity: pressed ? 0.7 : 1
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>📚</Text>
                  <Text style={{
                    fontFamily: getSerifFont('700'),
                    fontSize: 18,
                    lineHeight: 26,
                    color: JianColors.ink
                  }}>
                    文章錯題重溫
                  </Text>
                </View>
                <Text style={{
                  fontFamily: JianTypography.serif,
                  fontSize: 14,
                  lineHeight: 22,
                  color: JianColors.ink2
                }}>
                  按文章分類，針對性重溫各篇章的錯題。
                </Text>
              </View>
            )}
          </Pressable>

          {/* Part-based Revision */}
          <Pressable onPress={() => router.push("/revision-part")} hitSlop={8}>
            {({ pressed }) => (
              <View style={{
                backgroundColor: JianColors.surface,
                borderWidth: 1,
                borderColor: JianColors.line,
                borderRadius: JianRadius.card,
                paddingHorizontal: 20,
                paddingVertical: 20,
                marginBottom: 16,
                opacity: pressed ? 0.7 : 1
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>🎯</Text>
                  <Text style={{
                    fontFamily: getSerifFont('700'),
                    fontSize: 18,
                    lineHeight: 26,
                    color: JianColors.ink
                  }}>
                    文言文語基能力錯題重溫
                  </Text>
                </View>
                <Text style={{
                  fontFamily: JianTypography.serif,
                  fontSize: 14,
                  lineHeight: 22,
                  color: JianColors.ink2
                }}>
                  按部分分類，集中練習特定語文基礎能力。
                </Text>
              </View>
            )}
          </Pressable>

          {/* Weight Training */}
          <Pressable onPress={() => router.push("/weight-training")} hitSlop={8}>
            {({ pressed }) => (
              <View style={{
                backgroundColor: JianColors.surface,
                borderWidth: 1,
                borderColor: JianColors.line,
                borderRadius: JianRadius.card,
                paddingHorizontal: 20,
                paddingVertical: 20,
                marginBottom: 16,
                opacity: pressed ? 0.7 : 1
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>💪</Text>
                  <Text style={{
                    fontFamily: getSerifFont('700'),
                    fontSize: 18,
                    lineHeight: 26,
                    color: JianColors.ink
                  }}>
                    針對性難題訓練
                  </Text>
                </View>
                <Text style={{
                  fontFamily: JianTypography.serif,
                  fontSize: 14,
                  lineHeight: 22,
                  color: JianColors.ink2
                }}>
                  跨文章一詞多義 & 文言句式專項訓練 (Part 7 & 8)
                </Text>
              </View>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // DSE Mock flow
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
          載入 DSE 練習...
        </Text>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{
          fontFamily: getSerifFont('400'),
          fontSize: 16,
          lineHeight: 26,
          color: JianColors.ink,
          textAlign: 'center',
          marginBottom: 24
        }}>
          {error}
        </Text>
        <Button variant="primary" size="medium" onPress={loadDSEQuestions}>
          重試
        </Button>
      </SafeAreaView>
    )
  }

  if (phase === "quiz") {
    // Build article info for multi-article mode
    const articles = selectedArticles.map(a => ({ id: a.id, title: a.title }))

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
        <QuizShell
          questions={questions}
          articles={articles}
          exerciseType="dse-training"
          partTitles={{ 1: "DSE 模擬考題" }}
          hideHeader={false}
          hideArticleButton={true}
          onSave={handleSave}
          onExit={() => setPhase("lobby")}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => setMode("select")} hitSlop={12}>
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
            <Text style={{
              fontFamily: getSerifFont('700'),
              fontSize: 18,
              lineHeight: 26,
              color: JianColors.ink
            }}>
              DSE 模擬考題
            </Text>
          </View>
          <Logo size={52} />
        </View>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ marginTop: 12, marginBottom: 16 }}>
          <Text style={{
            fontFamily: getSerifFont('400'),
            fontSize: 13,
            lineHeight: 22,
            color: JianColors.ink2
          }}>
            系統已隨機抽選以下 {selectedArticles.length} 篇核心篇章，點擊展開閱讀後開始答題。
          </Text>
        </View>
        {selectedArticles.map((article, index) => (
          <ArticleAccordion key={article.id} article={article} index={index} />
        ))}
        <View style={{
          backgroundColor: JianColors.surface2,
          borderWidth: 1,
          borderColor: JianColors.line,
          borderRadius: 7,
          padding: 11,
          alignItems: 'center',
          marginTop: 14,
          marginBottom: 4
        }}>
          <Text style={{
            fontFamily: getSerifFont('400'),
            fontSize: 13,
            lineHeight: 20,
            color: JianColors.ink2
          }}>
            共 <Text style={{ fontFamily: JianTypography.number, color: JianColors.ink }}>{questions.length}</Text> 題・
            滿分 <Text style={{ fontFamily: JianTypography.number, color: JianColors.ink }}>{questions.reduce((s, q) => s + q.points, 0)}</Text> 分
          </Text>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 18 }}>
        <Button variant="primary" size="large" fullWidth onPress={() => setPhase("quiz")}>
          開始練習　→
        </Button>
        <Text style={{
          fontFamily: getSerifFont('400'),
          fontSize: 11,
          lineHeight: 18,
          color: JianColors.ink3,
          textAlign: 'center',
          marginTop: 9
        }}>
          完成後成績將自動儲存
        </Text>
      </View>
    </SafeAreaView>
  )
}
