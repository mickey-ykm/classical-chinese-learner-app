import { useEffect, useState } from "react"
import { View, Text, Pressable, Image, Alert, ScrollView, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { getArticleIndex, STANDARD_PART_TITLES } from "@/lib/data"
import { refresh as refreshContent, clearCacheAndResync } from "@/lib/contentStore"
import UpgradeModal from "@/components/UpgradeModal"
import { Card, Button, ProgressBar, JianColors, JianTypography, JianSpacing } from "@/components/jian"

const API_URL = process.env.EXPO_PUBLIC_ADMIN_URL || "https://ccladmin.mickey-calligraphy.art"

interface ExerciseSession {
  id: string
  article_id: string | null
  kind: string
  score: number
  total_points: number
  finished_at: string
  total_seconds: number | null
  expected_seconds: number | null
}

interface RevisionSummary {
  overall: {
    totalMistakes: number
    weakestPart: number | null
    weakestPartCount: number
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatSeconds(s: number): string {
  const totalMinutes = Math.floor(s / 60)
  const sec = s % 60

  if (totalMinutes === 0) return `${sec} 秒`

  if (totalMinutes < 60) {
    if (sec === 0) return `${totalMinutes} 分`
    return `${totalMinutes} 分 ${sec} 秒`
  }

  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  if (hours < 24) {
    if (mins === 0) return `${hours} 小時`
    return `${hours} 小時 ${mins} 分`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0) return `${days} 天`
  return `${days} 天 ${remainingHours} 小時`
}

function timeDelta(totalSeconds: number, expectedSeconds: number): { label: string; color: string } {
  const diff = totalSeconds - expectedSeconds
  const absDiff = Math.abs(diff)

  if (absDiff < 60) return { label: "準時完成", color: JianColors.ink3 }

  const diffMinutes = Math.floor(absDiff / 60)

  if (diffMinutes < 60) {
    if (diff > 0) return { label: `超時 ${diffMinutes} 分`, color: JianColors.vermilion }
    return { label: `快 ${diffMinutes} 分`, color: JianColors.amber }
  }

  const diffHours = Math.floor(diffMinutes / 60)
  const remainingMins = diffMinutes % 60
  const hourLabel = remainingMins > 0 ? `${diffHours} 小時 ${remainingMins} 分` : `${diffHours} 小時`

  if (diff > 0) return { label: `超時 ${hourLabel}`, color: JianColors.vermilion }
  return { label: `快 ${hourLabel}`, color: JianColors.amber }
}

function AttemptRow({ attempt, title, onPress }: { attempt: ExerciseSession; title: string; onPress: () => void }) {
  const pct = Math.round((attempt.score / attempt.total_points) * 100)
  const progressVariant = pct >= 80 ? "jade" : pct >= 50 ? "amber" : "vermilion"
  const delta = attempt.total_seconds != null && attempt.expected_seconds != null
    ? timeDelta(attempt.total_seconds, attempt.expected_seconds)
    : null

  const badge =
    attempt.kind === "dse-training" ? "🎓" :
    attempt.kind === "weight-training" ? "💪" :
    attempt.kind === "revision" ? "📚" :
    null

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Card variant="default" style={{ marginBottom: 12, opacity: pressed ? 0.7 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
              {badge && <Text style={{ fontSize: 16 }}>{badge}</Text>}
              <Text
                style={{
                  fontFamily: JianTypography.serif,
                  fontSize: JianTypography.bodySmall,
                  fontWeight: JianTypography.bold,
                  color: JianColors.ink,
                  flex: 1
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
            <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>
              {formatDate(attempt.finished_at)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={pct} variant={progressVariant} height={6} />
            </View>
            <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, fontWeight: JianTypography.semibold, color: JianColors.ink2 }}>
              {attempt.score}/{attempt.total_points}
            </Text>
          </View>
          {attempt.total_seconds != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>
                {formatSeconds(attempt.total_seconds)}
              </Text>
              {delta && (
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, fontWeight: JianTypography.medium, color: delta.color }}>
                  {delta.label}
                </Text>
              )}
            </View>
          )}
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3, textAlign: 'right', marginTop: 4 }}>
            查看詳情 →
          </Text>
        </Card>
      )}
    </Pressable>
  )
}

export default function AccountScreen() {
  const router = useRouter()
  const { user, profile, signOut, loading, isAnonymous: isAnonymousCtx } = useAuth()
  const isAnonymous = isAnonymousCtx || !user?.email
  const [attempts, setAttempts] = useState<ExerciseSession[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [upgradeVisible, setUpgradeVisible] = useState(false)
  const [revisionSummary, setRevisionSummary] = useState<RevisionSummary | null>(null)
  const [loadingRevision, setLoadingRevision] = useState(true)

  const articleIndex = getArticleIndex()
  const titleById = Object.fromEntries(articleIndex.map((a) => [a.id, a.title]))

  useEffect(() => {
    if (!user) return
    supabase
      .from("exercise_sessions")
      .select("id, article_id, kind, score, total_points, finished_at, total_seconds, expected_seconds")
      .eq("user_id", user.id)
      .order("finished_at", { ascending: false })
      .then(({ data }) => {
        setAttempts((data as ExerciseSession[]) ?? [])
        setLoadingAttempts(false)
      })

    if (!isAnonymous) {
      fetch(`${API_URL}/api/revision/summary?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setRevisionSummary(data)
          setLoadingRevision(false)
        })
        .catch(() => {
          setLoadingRevision(false)
        })
    } else {
      setLoadingRevision(false)
    }
  }, [user, isAnonymous])

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="small" color={JianColors.amber} />
    </SafeAreaView>
  )

  async function handleSignOut() {
    try {
      await signOut()
      router.replace("/")
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "登出失敗，請再試一次"
      Alert.alert("錯誤", message)
    }
  }

  async function handleRefreshContent() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const { updated, errors } = await refreshContent()
      if (updated === 0) setSyncMsg("已是最新")
      else if (errors > 0) setSyncMsg(`已更新 ${updated} 篇，${errors} 篇有問題`)
      else setSyncMsg(`已更新 ${updated} 篇`)
    } catch {
      setSyncMsg("更新失敗，請稍後再試")
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 3000)
    }
  }

  async function handleClearCacheAndResync() {
    Alert.alert(
      "清除快取並重新同步",
      "這會刪除本地快取的所有文章，並從伺服器重新下載。確定要繼續嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "確定",
          style: "destructive",
          onPress: async () => {
            setSyncing(true)
            setSyncMsg(null)
            try {
              const { updated, errors } = await clearCacheAndResync()
              if (errors > 0) setSyncMsg(`已重新同步 ${updated} 篇，${errors} 篇有問題`)
              else setSyncMsg(`已重新同步 ${updated} 篇`)
            } catch {
              setSyncMsg("重新同步失敗，請稍後再試")
            } finally {
              setSyncing(false)
              setTimeout(() => setSyncMsg(null), 3000)
            }
          },
        },
      ]
    )
  }

  const displayName = isAnonymous ? "訪客" : (profile?.display_name ?? user?.email ?? "用戶")
  const avatarUrl = isAnonymous ? null : profile?.avatar_url

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.replace("/(tabs)")
            }
          }}
          hitSlop={12}
          style={{ alignSelf: 'flex-start', marginBottom: 24 }}
        >
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.vermilion }}>
            ← 返回
          </Text>
        </Pressable>

        {/* User card */}
        <Card variant="default" style={{ alignItems: 'center', marginBottom: 24 }}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 72, height: 72, borderRadius: 36 }}
            />
          ) : (
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: JianColors.amberTint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 32 }}>👤</Text>
            </View>
          )}
          <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.body, fontWeight: JianTypography.bold, color: JianColors.ink, marginTop: 8 }}>
            {displayName}
          </Text>
          {!isAnonymous && (
            <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>
              {user?.email}
            </Text>
          )}
          {isAnonymous && (
            <View style={{ marginTop: 8 }}>
              <Button variant="primary" size="medium" onPress={() => router.push("/login")}>
                登入 / 建立帳戶
              </Button>
            </View>
          )}
        </Card>

        {/* Logged-in only: analytics + history button */}
        {!isAnonymous && (
          <>
            {/* Revision Analytics */}
            {!loadingRevision && revisionSummary && revisionSummary.overall.totalMistakes > 0 && (
              <Card variant="near-complete" style={{ marginBottom: 24 }}>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.title, fontWeight: JianTypography.bold, color: JianColors.ink, marginBottom: 8 }}>
                  文言文能力分析
                </Text>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink, marginBottom: 16 }}>
                  {revisionSummary.overall.totalMistakes} 題失誤
                  {revisionSummary.overall.weakestPart && (
                    <>：最弱部分 {STANDARD_PART_TITLES[revisionSummary.overall.weakestPart] || `第 ${revisionSummary.overall.weakestPart} 部分`} ({revisionSummary.overall.weakestPartCount} 題)</>
                  )}
                </Text>
                <Button variant="primary" size="medium" fullWidth onPress={() => router.push("/revision")}>
                  詳細報告
                </Button>
              </Card>
            )}

            {/* Exercise History Button */}
            <Pressable onPress={() => router.push("/exercise-history")}>
              {({ pressed }) => (
                <Card variant="default" style={{ marginBottom: 24, opacity: pressed ? 0.7 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.heading, fontWeight: JianTypography.bold, color: JianColors.ink, marginBottom: 4 }}>
                        所有練習紀錄
                      </Text>
                      {loadingAttempts ? (
                        <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink2 }}>載入中...</Text>
                      ) : (
                        <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink2 }}>
                          已完成 {attempts.length} 次練習
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.title, color: JianColors.ink3 }}>→</Text>
                  </View>
                </Card>
              )}
            </Pressable>

          </>
        )}

        {/* Sync actions */}
        <View style={{ marginTop: 32 }}>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.tiny, fontWeight: JianTypography.bold, color: JianColors.ink3, letterSpacing: 1.2, marginBottom: 12 }}>
            內容同步
          </Text>

          {/* Incremental refresh */}
          <Pressable onPress={handleRefreshContent} disabled={syncing}>
            {({ pressed }) => (
              <Card variant="default" style={{ alignItems: 'center', marginBottom: 12, opacity: pressed ? 0.7 : syncing ? 0.5 : 1 }}>
                {syncing ? (
                  <ActivityIndicator size="small" color={JianColors.amber} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.amber, marginBottom: 2 }}>
                      {syncMsg ?? "檢查更新"}
                    </Text>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>增量同步（推薦）</Text>
                  </View>
                )}
              </Card>
            )}
          </Pressable>

          {/* Full resync */}
          <Pressable onPress={handleClearCacheAndResync} disabled={syncing}>
            {({ pressed }) => (
              <Card variant="default" style={{ alignItems: 'center', opacity: pressed ? 0.7 : syncing ? 0.5 : 1 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.vermilion, marginBottom: 2 }}>
                    清除快取並重新同步
                  </Text>
                  <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>完整重新下載（修復用）</Text>
                </View>
              </Card>
            )}
          </Pressable>
        </View>

        {/* Sign out — logged-in only */}
        {!isAnonymous && (
          <Pressable onPress={handleSignOut}>
            {({ pressed }) => (
              <Card variant="default" style={{ alignItems: 'center', marginTop: 12, opacity: pressed ? 0.7 : 1 }}>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: JianTypography.semibold, color: JianColors.ink2 }}>
                  登出
                </Text>
              </Card>
            )}
          </Pressable>
        )}
      </ScrollView>

      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
    </SafeAreaView>
  )
}
