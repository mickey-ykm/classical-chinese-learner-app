import { ScrollView, View, Text, Pressable } from "react-native"
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
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: getSerifFont('600'), fontSize: 20, color: JianColors.ink }}>
                {article.title}
              </Text>
              {isPaid && <Badge type="lock" text="付費" />}
            </View>
            <Text style={{ fontFamily: JianTypography.serif, fontSize: 12, color: JianColors.ink3, marginTop: 3 }}>
              {article.source} · {article.totalQuestions}+ 題
            </Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            {progress && progress.seenCount > 0 ? (
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
          <View style={{ marginBottom: 26, paddingTop: 22, borderTopWidth: 2, borderTopColor: JianColors.ink }}>
            {/* Greeting */}
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontFamily: getSerifFont('700'), fontSize: 31, lineHeight: 37, color: JianColors.ink }}>
                你好！
              </Text>
              <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, color: JianColors.ink2, marginTop: 7 }}>
                與經典同行，今日開卷有益。
              </Text>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: JianColors.line, marginBottom: 18 }} />

            {/* Sign-up Section */}
            <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3, marginBottom: 12 }}>
              免 費 註 冊
            </Text>
            <Text style={{ fontFamily: getSerifFont('700'), fontSize: 28, lineHeight: 36, color: JianColors.ink, marginBottom: 12 }}>
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

        {/* DSE 操練 section - Only for logged-in users */}
        {user && (
          <View style={{ marginBottom: 26, paddingTop: 22, borderTopWidth: 2, borderTopColor: JianColors.ink }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
              <View>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3 }}>
                  接 下 來
                </Text>
                <Text style={{ fontFamily: getSerifFont('700'), fontSize: 31, lineHeight: 37, color: JianColors.ink, marginTop: 11 }}>
                  DSE 操練
                </Text>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, color: JianColors.ink2, marginTop: 7 }}>
                  重點操練，準備應試
                </Text>
              </View>
              <DemonMascot size={56} />
            </View>

            <Button variant="primary" size="large" fullWidth onPress={() => router.push("/(tabs)/practice")} style={{ marginTop: 18 }}>
              前往操練　→
            </Button>
          </View>
        )}

        {/* 繼續練習 section - list with borders */}
        <View style={{ marginBottom: 26 }}>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3, marginBottom: 4 }}>
            繼 續 篇 章
          </Text>
          {[...dseArticles, ...otherArticles].slice(0, 3).length === 0 ? (
            <Text style={{ fontFamily: JianTypography.serif, fontSize: 14, color: JianColors.ink3, textAlign: 'center', paddingVertical: 20 }}>
              暫無文章
            </Text>
          ) : (
            [...dseArticles, ...otherArticles].slice(0, 3).map((article) => (
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
