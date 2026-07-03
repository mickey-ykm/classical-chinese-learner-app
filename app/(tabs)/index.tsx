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
import Svg, { Circle, Ellipse, Path, Rect, Polygon, Line } from "react-native-svg"
import { Card, Button, Badge, ProgressBar, JianColors, JianTypography, JianSpacing } from "@/components/jian"

function DemonMascot({ size = 64 }: { size?: number }) {
  const s = size
  return (
    <Svg width={s} height={s} viewBox="0 0 64 64">
      {/* Body / head */}
      <Ellipse cx="32" cy="38" rx="18" ry="16" fill="#7c3aed" />
      {/* Face */}
      <Ellipse cx="32" cy="32" rx="16" ry="15" fill="#8b5cf6" />
      {/* Horns */}
      <Polygon points="18,20 14,6 22,18" fill="#6d28d9" />
      <Polygon points="46,20 50,6 42,18" fill="#6d28d9" />
      {/* Horn tips glow */}
      <Circle cx="14" cy="6" r="3" fill="#fbbf24" />
      <Circle cx="50" cy="6" r="3" fill="#fbbf24" />
      {/* Eyes — glowing amber */}
      <Ellipse cx="25" cy="30" rx="5" ry="4" fill="#fbbf24" />
      <Ellipse cx="39" cy="30" rx="5" ry="4" fill="#fbbf24" />
      {/* Pupils */}
      <Ellipse cx="25" cy="31" rx="2.5" ry="3" fill="#1e1b4b" />
      <Ellipse cx="39" cy="31" rx="2.5" ry="3" fill="#1e1b4b" />
      {/* Eye shine */}
      <Circle cx="26" cy="29" r="1" fill="white" />
      <Circle cx="40" cy="29" r="1" fill="white" />
      {/* Nose */}
      <Ellipse cx="32" cy="36" rx="3" ry="2" fill="#6d28d9" />
      {/* Mouth with fangs */}
      <Path d="M24 40 Q32 47 40 40" stroke="#1e1b4b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Polygon points="27,40 29,46 31,40" fill="white" />
      <Polygon points="33,40 35,46 37,40" fill="white" />
      {/* Eyebrows — angry */}
      <Line x1="20" y1="25" x2="29" y2="27" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="35" y1="27" x2="44" y2="25" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round" />
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

function ArticlePreviewCard({
  article,
  onStart,
  progress,
}: {
  article: ArticleEntry
  onStart: () => void
  progress?: { seenCount: number; totalInPool: number }
}) {
  const isPaid = !article.isFree

  return (
    <Pressable onPress={onStart}>
      {({ pressed }) => (
        <Card variant="default" style={{ marginBottom: 8, opacity: pressed ? 0.7 : 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text
                  style={{
                    fontFamily: JianTypography.serif,
                    fontSize: JianTypography.bodySmall,
                    fontWeight: JianTypography.bold,
                    color: JianColors.ink,
                    flex: 1,
                    lineHeight: 20
                  }}
                  numberOfLines={1}
                >
                  {article.title}
                </Text>
                {isPaid && <Badge type="lock" text="付費" />}
              </View>
              <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>
                {article.source}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              {progress ? (
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, fontWeight: JianTypography.semibold, color: JianColors.amber }}>
                  {progress.seenCount}/{progress.totalInPool}
                </Text>
              ) : (
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, fontWeight: JianTypography.semibold, color: JianColors.amber }}>
                  {article.totalQuestions} 題
                </Text>
              )}
              <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>開始 →</Text>
            </View>
          </View>
        </Card>
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

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 24 }}>
          <Logo size={48} />
          <Pressable onPress={() => router.push("/account")}>
            {({ pressed }) => (
              <Card variant="default" style={{ paddingHorizontal: 16, paddingVertical: 8, opacity: pressed ? 0.7 : 1 }}>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.ink }}>
                  {user ? "帳戶" : "登入"}
                </Text>
              </Card>
            )}
          </Pressable>
        </View>

        {/* Greeting */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.title, fontWeight: JianTypography.bold, color: JianColors.ink, marginBottom: 4 }}>
            你好！
          </Text>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink2 }}>歡迎回到文言文練習平台</Text>
        </View>

        {/* DSE 操練 section */}
        <View style={{ marginBottom: 24 }}>
          <Card variant="ink">
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24 }}>⚡</Text>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.heading, fontWeight: JianTypography.bold, color: JianColors.paper }}>
                  DSE 操練
                </Text>
              </View>
              <View style={{ marginLeft: 8 }}>
                <DemonMascot size={56} />
              </View>
            </View>
            <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink3, marginBottom: 16 }}>
              重點操練，準備應試
            </Text>

            {/* Practice buttons */}
            <Pressable onPress={() => router.push("/(tabs)/dse-training?mode=mock")}>
              {({ pressed }) => (
                <Card variant="default" style={{ marginBottom: 8, opacity: pressed ? 0.7 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 20, marginRight: 12 }}>📝</Text>
                      <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.ink }}>
                        DSE 模擬考題
                      </Text>
                    </View>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>→</Text>
                  </View>
                </Card>
              )}
            </Pressable>

            <Pressable onPress={() => router.push("/revision-article")}>
              {({ pressed }) => (
                <Card variant="default" style={{ marginBottom: 8, opacity: pressed ? 0.7 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 20, marginRight: 12 }}>📚</Text>
                      <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.ink }}>
                        文章錯題重溫
                      </Text>
                    </View>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>→</Text>
                  </View>
                </Card>
              )}
            </Pressable>

            <Pressable onPress={() => router.push("/revision-part")}>
              {({ pressed }) => (
                <Card variant="default" style={{ marginBottom: 8, opacity: pressed ? 0.7 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 20, marginRight: 12 }}>🎯</Text>
                      <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.ink }}>
                        語基能力錯題重溫
                      </Text>
                    </View>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>→</Text>
                  </View>
                </Card>
              )}
            </Pressable>

            <Pressable onPress={() => router.push("/weight-training")}>
              {({ pressed }) => (
                <Card variant="default" style={{ opacity: pressed ? 0.7 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 20, marginRight: 12 }}>💪</Text>
                      <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.ink }}>
                        針對性難題訓練
                      </Text>
                    </View>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>→</Text>
                  </View>
                </Card>
              )}
            </Pressable>
          </Card>
        </View>

        {/* 繼續篇章 section (combines DSE + Other) */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.body, fontWeight: JianTypography.bold, color: JianColors.ink }}>
              📖 繼續篇章
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/chapters")} hitSlop={8}>
              <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.vermilion }}>
                更多 →
              </Text>
            </Pressable>
          </View>
          {[...dseArticles, ...otherArticles].slice(0, 3).length === 0 ? (
            <Card variant="default">
              <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink3, textAlign: 'center' }}>
                暫無文章
              </Text>
            </Card>
          ) : (
            [...dseArticles, ...otherArticles].slice(0, 3).map((article) => (
              <ArticlePreviewCard
                key={article.id}
                article={article}
                progress={progressMap[article.id]}
                onStart={() => router.push(`/read?id=${article.id}`)}
              />
            ))
          )}
        </View>

        {/* Recent history */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.body, fontWeight: JianTypography.bold, color: JianColors.ink }}>
              最近練習
            </Text>
            {user && (
              <Pressable onPress={() => router.push("/account")} hitSlop={8}>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.vermilion }}>
                  更多 →
                </Text>
              </Pressable>
            )}
          </View>

          {!user && (
            <Card variant="default">
              <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink2, marginBottom: 12, textAlign: 'center' }}>
                登入後可查看練習記錄
              </Text>
              <Button variant="primary" size="medium" fullWidth onPress={() => router.push("/account")}>
                立即登入
              </Button>
            </Card>
          )}
          {user && recentAttempts.length === 0 && (
            <Card variant="default">
              <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink3, textAlign: 'center' }}>
                尚未有練習記錄
              </Text>
            </Card>
          )}
          {user && recentAttempts.map((attempt) => {
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
                  <Card variant="default" style={{ marginBottom: 8, opacity: pressed ? 0.7 : 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <Text
                        style={{
                          fontFamily: JianTypography.serif,
                          fontSize: JianTypography.bodySmall,
                          fontWeight: JianTypography.bold,
                          color: JianColors.ink,
                          flex: 1,
                          marginRight: 8
                        }}
                        numberOfLines={1}
                      >
                        {titleById[attempt.article_id] ?? attempt.article_id}
                      </Text>
                      <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>
                        {formatDate(attempt.finished_at)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <ProgressBar value={pct} variant={progressVariant} height={6} />
                      </View>
                      <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, fontWeight: JianTypography.semibold, color: JianColors.ink2 }}>
                        {attempt.score}/{attempt.total_points}
                      </Text>
                    </View>
                  </Card>
                )}
              </Pressable>
            )
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
