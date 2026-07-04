import { ScrollView, View, Text, Pressable, FlatList } from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Logo } from "@/components/Logo"
import { supabase } from "@/lib/supabase"
import { getArticleIndex } from "@/lib/data"
import { subscribeToUpdates } from "@/lib/contentStore"
import { fetchArticleProgress, type ArticleProgressMap } from "@/lib/articleProgress"
import type { ArticleEntry } from "@/lib/types"
import Svg, { Circle, Path } from "react-native-svg"
import { Button, Badge, ProgressBar, JianColors, JianTypography, JianSpacing, getSerifFont } from "@/components/jian"

type TaskType = 'revision' | 'single-article' | 'targeted'

function DemonMascot({ size = 64 }: { size?: number }) {
  const s = size
  return (
    <Svg width={s} height={s} viewBox="0 0 64 64">
      {/* Body / head */}
      <Circle cx="32" cy="38" r="18" fill="#7c3aed" />
      {/* Face */}
      <Circle cx="32" cy="32" r="16" fill="#8b5cf6" />
      {/* Eyes — glowing amber */}
      <Circle cx="25" cy="30" r="5" fill="#fbbf24" />
      <Circle cx="39" cy="30" r="5" fill="#fbbf24" />
      {/* Pupils */}
      <Circle cx="25" cy="31" r="2.5" fill="#1e1b4b" />
      <Circle cx="39" cy="31" r="2.5" fill="#1e1b4b" />
    </Svg>
  )
}

interface RecentAttempt {
  id: string
  article_id: string
  score: number
  total_points: number
  finished_at: string
  total_seconds: number | null
}

function AccountIcon({ focused }: { focused: boolean }) {
  const color = focused ? JianColors.amber : JianColors.ink
  return (
    <Svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7">
      <Circle cx="12" cy="8" r="3.3" />
      <Path d="M5.5 19c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6" />
    </Svg>
  )
}

function ArticleRow({ article, progress, onPress }: {
  article: ArticleEntry
  progress?: { seenCount: number; totalInPool: number }
  onPress: () => void
}) {
  const isPaid = !article.isFree

  // Get article type badge text
  const getArticleTypeBadge = () => {
    if (article.articleType === 'dse-exam') return 'DSE 甲部'
    if (article.articleType === 'dse-non-exam') return '高中課文'
    return null
  }

  const badgeText = getArticleTypeBadge()

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: JianColors.line,
          opacity: pressed ? 0.7 : 1
        }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{
                fontFamily: getSerifFont('600'),
                fontSize: 20,
                color: isPaid ? JianColors.ink3 : JianColors.ink
              }}>
                {article.title}
              </Text>
              {badgeText && (
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  backgroundColor: JianColors.surface2,
                  borderRadius: 4
                }}>
                  <Text style={{
                    fontFamily: JianTypography.sans,
                    fontSize: 11,
                    color: JianColors.vermilion
                  }}>
                    {badgeText}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontFamily: JianTypography.serif, fontSize: 12, color: isPaid ? JianColors.ink3 : JianColors.ink3, marginTop: 3 }}>
              {article.source} · {article.totalQuestions}+ 題
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
            {isPaid ? (
              <>
                <Badge type="lock" text="付費" />
                <Text style={{
                  fontFamily: JianTypography.sans,
                  fontSize: 10,
                  color: JianColors.vermilion,
                  marginTop: 4
                }}>
                  註冊解鎖
                </Text>
              </>
            ) : progress && progress.seenCount > 0 ? (
              <>
                <Text style={{ fontFamily: JianTypography.number, fontSize: 15, color: JianColors.jade }}>
                  {progress.seenCount}
                  <Text style={{ color: JianColors.ink3, fontSize: 12 }}>/{progress.totalInPool}</Text>
                </Text>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 10, color: JianColors.ink3, letterSpacing: 0.8 }}>
                  已見題數
                </Text>
              </>
            ) : (
              <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, color: JianColors.vermilion }}>
                開始 →
              </Text>
            )}
          </View>
        </View>
      )}
    </Pressable>
  )
}

export default function HomeTab() {
  const router = useRouter()
  const { user } = useAuth()
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([])
  const [titleById, setTitleById] = useState<Record<string, string>>({})
  const [dseArticles, setDseArticles] = useState<ArticleEntry[]>([])
  const [otherArticles, setOtherArticles] = useState<ArticleEntry[]>([])
  const [progressMap, setProgressMap] = useState<ArticleProgressMap>({})
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('revision')

  const loadArticles = useCallback(() => {
    const index = getArticleIndex()
    setTitleById(Object.fromEntries(index.map((a) => [a.id, a.title])))
    setDseArticles(
      index.filter((a) => a.articleType === "dse-exam" || a.articleType === "dse-non-exam").slice(0, 3)
    )
    setOtherArticles(
      index.filter((a) => a.articleType === "other" || !a.articleType).slice(0, 3)
    )
  }, [])

  useEffect(() => subscribeToUpdates(loadArticles), [loadArticles])

  useFocusEffect(
    useCallback(() => {
      loadArticles()
      if (!user) return
      supabase
        .from("exercise_sessions")
        .select("id, article_id, score, total_points, finished_at, total_seconds")
        .eq("kind", "article-quiz")
        .eq("user_id", user.id)
        .order("finished_at", { ascending: false })
        .limit(3)
        .then(({ data }) => {
          if (data) setRecentAttempts(data as RecentAttempt[])
        })
      fetchArticleProgress(user.id).then(setProgressMap).catch(() => {})
    }, [user, loadArticles])
  )

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("zh-HK", { month: "short", day: "numeric" })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header with logo + app name + account */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Logo size={34} />
            <Text style={{ fontFamily: getSerifFont('700'), fontSize: 16, color: JianColors.ink }}>
              文言教室
            </Text>
          </View>
          <Pressable onPress={() => router.push("/account")}>
            {({ pressed }) => (
              <View style={{
                width: 33,
                height: 33,
                borderWidth: 1.5,
                borderColor: user ? JianColors.amber : JianColors.line,
                borderRadius: 16.5,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: user ? JianColors.amberTint : JianColors.surface,
                opacity: pressed ? 0.7 : 1
              }}>
                <AccountIcon focused={!!user} />
              </View>
            )}
          </Pressable>
        </View>

        {/* Guest Sign-up Module - Right after header for non-logged-in users */}
        {!user && (
          <View style={{ marginBottom: 26, paddingTop: 22 }}>
            {/* Greeting */}
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontFamily: getSerifFont('700'), fontSize: 31, lineHeight: 40, color: JianColors.ink }}>
                你好！
              </Text>
              <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, lineHeight: 20, color: JianColors.ink2, marginTop: 7 }}>
                與經典同行，今日開卷有益。
              </Text>
            </View>

            {/* Divider */}
            <View style={{ height: 2, backgroundColor: JianColors.ink, marginBottom: 18 }} />

            {/* Sign-up Section */}
            <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3, marginBottom: 12 }}>
              免 費 註 冊
            </Text>
            <Text style={{ fontFamily: getSerifFont('700'), fontSize: 28, lineHeight: 38, color: JianColors.ink, marginBottom: 12 }}>
              開啟你的{'\n'}備試之路
            </Text>
            <Text style={{ fontFamily: JianTypography.serif, fontSize: 14, lineHeight: 22, color: JianColors.ink2, marginBottom: 20 }}>
              一鍵註冊解鎖高階功能，分析弱項，針對性重點訓練，還邊提升語文能力。
            </Text>
            <Button variant="primary" size="large" fullWidth onPress={() => router.push("/login")}>
              免費註冊　→
            </Button>
          </View>
        )}

        {/* DSE Countdown + Streak - Only for logged-in users */}
        {user && (
          <View style={{ marginBottom: 26, paddingTop: 22, borderTopWidth: 2, borderTopColor: JianColors.ink }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
              <Text style={{ fontFamily: getSerifFont('700'), fontSize: 72, color: JianColors.vermilion, lineHeight: 72 }}>
                312
              </Text>
              <View style={{ paddingBottom: 2 }}>
                <Text style={{ fontFamily: getSerifFont('600'), fontSize: 17, color: JianColors.ink }}>
                  天後文憑試
                </Text>
                <Text style={{ fontFamily: getSerifFont('600'), fontSize: 17, color: JianColors.jade, marginTop: 6 }}>
                  已連續練習 6 天 🔥
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Daily Task Card - Only for logged-in users */}
        {user && (
          <View style={{ marginBottom: 26, paddingTop: 22, borderTopWidth: 2, borderTopColor: JianColors.ink }}>
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3 }}>
                接 下 來 · 今 日 第  {selectedTaskType === 'revision' ? '1' : selectedTaskType === 'single-article' ? '2' : '3'}／3  項
              </Text>
              <Text style={{ fontFamily: getSerifFont('700'), fontSize: 31, lineHeight: 40, color: JianColors.ink, marginTop: 11 }}>
                {selectedTaskType === 'revision' ? '文章錯題重溫' : selectedTaskType === 'single-article' ? '獨立課文練習' : '跨文章語文練習'}
              </Text>
              <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, lineHeight: 20, color: JianColors.ink2, marginTop: 7 }}>
                {selectedTaskType === 'revision'
                  ? '複習曾經答錯的題目'
                  : selectedTaskType === 'single-article'
                  ? 'DSE 甲部 · 隨機 22 題 · 約 10 分鐘'
                  : 'Part 7 & 8 · 跨文章 10 題'}
              </Text>
            </View>

            <Button variant="primary" size="large" fullWidth onPress={() => {
              // Navigate based on selected task type
              if (selectedTaskType === 'revision') {
                router.push("/revision-article") // 文章錯題重溫
              } else if (selectedTaskType === 'single-article') {
                router.push("/(tabs)/dse-training") // 單篇練習
              } else {
                router.push("/weight-training") // 跨文章語文練習
              }
            }}>
              開始練習　→
            </Button>

            {/* Swipeable Task Type Selector */}
            <View style={{ marginTop: 18 }}>
              <FlatList
                horizontal
                data={[
                  { type: 'revision' as TaskType, label: '錯題重溫' },
                  { type: 'single-article' as TaskType, label: '單篇練習' },
                  { type: 'targeted' as TaskType, label: '針對性訓練' }
                ]}
                keyExtractor={(item) => item.type}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 9 }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => setSelectedTaskType(item.type)} hitSlop={8}>
                    {({ pressed }) => (
                      <View style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        backgroundColor: selectedTaskType === item.type ? JianColors.ink : JianColors.surface2,
                        borderWidth: 1,
                        borderColor: selectedTaskType === item.type ? JianColors.ink : JianColors.line,
                        opacity: pressed ? 0.7 : 1
                      }}>
                        <Text style={{
                          fontFamily: JianTypography.serif,
                          fontSize: 13,
                          lineHeight: 20,
                          color: selectedTaskType === item.type ? JianColors.paper : JianColors.ink3
                        }}>
                          {item.label}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                )}
              />
            </View>
          </View>
        )}

        {/* 篇章練習 section - list with borders */}
        <View style={{ marginBottom: 26 }}>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3, marginBottom: 4 }}>
            篇 章 練 習
          </Text>
          {[...dseArticles, ...otherArticles].slice(0, 5).length === 0 ? (
            <Text style={{ fontFamily: JianTypography.serif, fontSize: 14, color: JianColors.ink3, textAlign: 'center', paddingVertical: 20 }}>
              暫無文章
            </Text>
          ) : (
            [...dseArticles, ...otherArticles].slice(0, 5).map((article) => (
              <ArticleRow
                key={article.id}
                article={article}
                progress={progressMap[article.id]}
                onPress={() => router.push(`/read?id=${article.id}`)}
              />
            ))
          )}
        </View>

        {/* Recent history */}
        {user && recentAttempts.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3, marginBottom: 12 }}>
              最 近 練 習
            </Text>
            {recentAttempts.map((attempt) => {
              const pct = attempt.total_points > 0
                ? Math.round((attempt.score / attempt.total_points) * 100)
                : 0
              const progressVariant = pct >= 80 ? "jade" : pct >= 50 ? "amber" : "vermilion"
              return (
                <Pressable
                  key={attempt.id}
                  onPress={() => router.push({ pathname: "/attempt", params: { id: attempt.id } })}
                >
                  {({ pressed }) => (
                    <View style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: JianColors.line,
                      opacity: pressed ? 0.7 : 1
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text
                          style={{
                            fontFamily: getSerifFont('600'),
                            fontSize: 16,
                            color: JianColors.ink,
                            flex: 1,
                            marginRight: 8
                          }}
                          numberOfLines={1}
                        >
                          {titleById[attempt.article_id] ?? attempt.article_id}
                        </Text>
                        <Text style={{ fontFamily: JianTypography.number, fontSize: 13, fontWeight: JianTypography.semibold, color: JianColors.ink2 }}>
                          {attempt.score}/{attempt.total_points}
                        </Text>
                      </View>
                      <ProgressBar value={pct} variant={progressVariant} height={4} />
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
