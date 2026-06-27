import { useEffect, useState } from "react"
import { View, Text, Pressable, Image, Alert, ScrollView, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { getArticleIndex, STANDARD_PART_TITLES } from "@/lib/data"
import { refresh as refreshContent, clearCacheAndResync } from "@/lib/contentStore"
import UpgradeModal from "@/components/UpgradeModal"

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

  // Less than 1 minute: show seconds only
  if (totalMinutes === 0) return `${sec} 秒`

  // Less than 1 hour: show minutes (and seconds if non-zero)
  if (totalMinutes < 60) {
    if (sec === 0) return `${totalMinutes} 分`
    return `${totalMinutes} 分 ${sec} 秒`
  }

  // 1 hour or more: show hours and minutes
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  // Less than 24 hours
  if (hours < 24) {
    if (mins === 0) return `${hours} 小時`
    return `${hours} 小時 ${mins} 分`
  }

  // 24 hours or more: show days and hours
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0) return `${days} 天`
  return `${days} 天 ${remainingHours} 小時`
}

function timeDelta(totalSeconds: number, expectedSeconds: number): { label: string; color: string } {
  const diff = totalSeconds - expectedSeconds
  const absDiff = Math.abs(diff)

  // Less than 1 minute difference: on time
  if (absDiff < 60) return { label: "準時完成", color: "text-slate-400" }

  // Format the difference appropriately
  const diffMinutes = Math.floor(absDiff / 60)

  if (diffMinutes < 60) {
    // Less than 1 hour: show in minutes
    if (diff > 0) return { label: `超時 ${diffMinutes} 分`, color: "text-red-500" }
    return { label: `快 ${diffMinutes} 分`, color: "text-amber-600" }
  }

  // 1 hour or more: show in hours
  const diffHours = Math.floor(diffMinutes / 60)
  const remainingMins = diffMinutes % 60
  const hourLabel = remainingMins > 0 ? `${diffHours} 小時 ${remainingMins} 分` : `${diffHours} 小時`

  if (diff > 0) return { label: `超時 ${hourLabel}`, color: "text-red-500" }
  return { label: `快 ${hourLabel}`, color: "text-amber-600" }
}

function AttemptRow({ attempt, title, onPress }: { attempt: ExerciseSession; title: string; onPress: () => void }) {
  const pct = Math.round((attempt.score / attempt.total_points) * 100)
  const barColor = pct >= 80 ? "bg-amber-500" : pct >= 50 ? "bg-amber-300" : "bg-slate-300"
  const delta = attempt.total_seconds != null && attempt.expected_seconds != null
    ? timeDelta(attempt.total_seconds, attempt.expected_seconds)
    : null

  // Exercise type badge
  const badge =
    attempt.kind === "dse-training" ? "🎓" :
    attempt.kind === "weight-training" ? "💪" :
    attempt.kind === "revision" ? "📚" :
    null

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl border border-slate-100 px-4 py-3 gap-2 active:opacity-70"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-center gap-1.5 flex-1 mr-2">
          {badge && <Text className="text-base">{badge}</Text>}
          <Text
            className="text-sm font-bold text-slate-800 flex-1"
            style={{ fontFamily: "Georgia" }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <Text className="text-xs text-slate-400">{formatDate(attempt.finished_at)}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </View>
        <Text className="text-xs font-semibold text-slate-600">
          {attempt.score}/{attempt.total_points}
        </Text>
      </View>
      {attempt.total_seconds != null && (
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-slate-400">{formatSeconds(attempt.total_seconds)}</Text>
          {delta && (
            <Text className={`text-xs font-medium ${delta.color}`}>{delta.label}</Text>
          )}
        </View>
      )}
      <Text className="text-xs text-slate-300 text-right">查看詳情 →</Text>
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

    // Fetch revision summary
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
    <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
      <ActivityIndicator size="small" color="#d97706" />
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
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
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
          className="self-start mb-6"
        >
          <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
        </Pressable>

        {/* User card */}
        <View className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 items-center gap-2 mb-6">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 72, height: 72, borderRadius: 36 }}
            />
          ) : (
            <View className="w-18 h-18 rounded-full bg-amber-100 items-center justify-center" style={{ width: 72, height: 72, borderRadius: 36 }}>
              <Text className="text-3xl">👤</Text>
            </View>
          )}
          <Text className="text-base font-bold text-slate-800 mt-1">{displayName}</Text>
          {!isAnonymous && <Text className="text-xs text-slate-400">{user?.email}</Text>}
          {isAnonymous && (
            <Pressable
              onPress={() => router.push("/login")}
              className="mt-1 bg-amber-500 rounded-xl px-5 py-2 active:opacity-80"
            >
              <Text className="text-white font-semibold text-sm">登入 / 建立帳戶</Text>
            </Pressable>
          )}
        </View>

        {/* Logged-in only: history + special features */}
        {!isAnonymous && (
          <>
            {/* Revision Analytics */}
            {!loadingRevision && revisionSummary && revisionSummary.overall.totalMistakes > 0 && (
              <View className="mb-6">
                <View className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-200 px-5 py-4">
                  <Text className="text-2xl font-bold text-slate-800 mb-2">
                    文言文能力分析
                  </Text>
                  <Text className="text-sm text-slate-600 mb-4">
                    {revisionSummary.overall.totalMistakes} 題失誤
                    {revisionSummary.overall.weakestPart && (
                      <>：最弱部分 {STANDARD_PART_TITLES[revisionSummary.overall.weakestPart] || `第 ${revisionSummary.overall.weakestPart} 部分`} ({revisionSummary.overall.weakestPartCount} 題)</>
                    )}
                  </Text>
                  <Pressable
                    onPress={() => router.push("/revision")}
                    className="bg-amber-500 rounded-xl py-3 active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-center">詳細報告</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              完成的練習
            </Text>

            {loadingAttempts ? (
              <ActivityIndicator size="small" color="#d97706" className="my-4" />
            ) : attempts.length === 0 ? (
              <View className="bg-white rounded-2xl border border-slate-100 px-4 py-6 items-center">
                <Text className="text-slate-400 text-sm">尚未完成任何練習</Text>
                <Pressable onPress={() => router.replace("/")} className="mt-3">
                  <Text className="text-amber-600 font-semibold text-sm">開始學習 →</Text>
                </Pressable>
              </View>
            ) : (
              <View className="gap-2">
                {attempts.map((attempt) => {
                  // Determine title based on kind
                  let title: string
                  if (attempt.kind === "dse-training") {
                    title = "DSE 模擬試"
                  } else if (attempt.kind === "weight-training") {
                    title = "重量訓練"
                  } else if (attempt.kind === "revision") {
                    title = "溫故知新"
                  } else {
                    // article-quiz: fetch article title
                    title = attempt.article_id ? (titleById[attempt.article_id] ?? attempt.article_id) : "文章練習"
                  }

                  return (
                    <AttemptRow
                      key={attempt.id}
                      attempt={attempt}
                      title={title}
                      onPress={() => router.push({ pathname: "/attempt", params: { id: attempt.id } })}
                    />
                  )
                })}
              </View>
            )}

          </>
        )}

        {/* Sync actions */}
        <View className="mt-8">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            內容同步
          </Text>

          {/* Incremental refresh */}
          <Pressable
            onPress={handleRefreshContent}
            disabled={syncing}
            className="border border-slate-200 rounded-2xl py-4 items-center active:opacity-70 bg-white mb-3"
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#d97706" />
            ) : (
              <View className="items-center">
                <Text className="text-amber-600 font-semibold text-sm mb-0.5">
                  {syncMsg ?? "檢查更新"}
                </Text>
                <Text className="text-slate-400 text-xs">增量同步（推薦）</Text>
              </View>
            )}
          </Pressable>

          {/* Full resync */}
          <Pressable
            onPress={handleClearCacheAndResync}
            disabled={syncing}
            className="border border-slate-200 rounded-2xl py-4 items-center active:opacity-70 bg-white"
          >
            <View className="items-center">
              <Text className="text-red-500 font-semibold text-sm mb-0.5">清除快取並重新同步</Text>
              <Text className="text-slate-400 text-xs">完整重新下載（修復用）</Text>
            </View>
          </Pressable>
        </View>

        {/* Sign out — logged-in only */}
        {!isAnonymous && (
          <Pressable
            onPress={handleSignOut}
            className="border border-slate-200 rounded-2xl py-4 items-center active:opacity-70 bg-white mt-3"
          >
            <Text className="text-slate-500 font-semibold text-sm">登出</Text>
          </Pressable>
        )}
      </ScrollView>

      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
    </SafeAreaView>
  )
}
