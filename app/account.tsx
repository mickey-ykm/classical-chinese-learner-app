import { useEffect, useState } from "react"
import { View, Text, Pressable, Image, Alert, ScrollView, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { getArticleIndex } from "@/lib/data"
import { refresh as refreshContent, clearCacheAndResync } from "@/lib/contentStore"
import UpgradeModal from "@/components/UpgradeModal"

interface QuizAttempt {
  id: string
  article_id: string
  score: number
  total_points: number
  completed_at: string
  total_seconds: number | null
  expected_seconds: number | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m === 0) return `${sec} 秒`
  if (sec === 0) return `${m} 分`
  return `${m} 分 ${sec} 秒`
}

function timeDelta(totalSeconds: number, expectedSeconds: number): { label: string; color: string } {
  const diff = totalSeconds - expectedSeconds
  const diffMin = Math.round(Math.abs(diff) / 60)
  if (diffMin === 0) return { label: "準時完成", color: "text-slate-400" }
  if (diff > 0) return { label: `超時 ${diffMin} 分`, color: "text-red-500" }
  return { label: `快 ${diffMin} 分`, color: "text-amber-600" }
}

function AttemptRow({ attempt, title, onPress }: { attempt: QuizAttempt; title: string; onPress: () => void }) {
  const pct = Math.round((attempt.score / attempt.total_points) * 100)
  const barColor = pct >= 80 ? "bg-amber-500" : pct >= 50 ? "bg-amber-300" : "bg-slate-300"
  const delta = attempt.total_seconds != null && attempt.expected_seconds != null
    ? timeDelta(attempt.total_seconds, attempt.expected_seconds)
    : null

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl border border-slate-100 px-4 py-3 gap-2 active:opacity-70"
    >
      <View className="flex-row justify-between items-start">
        <Text
          className="text-sm font-bold text-slate-800 flex-1 mr-2"
          style={{ fontFamily: "Georgia" }}
        >
          {title}
        </Text>
        <Text className="text-xs text-slate-400">{formatDate(attempt.completed_at)}</Text>
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
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [upgradeVisible, setUpgradeVisible] = useState(false)

  const articleIndex = getArticleIndex()
  const titleById = Object.fromEntries(articleIndex.map((a) => [a.id, a.title]))

  useEffect(() => {
    if (!user) return
    supabase
      .from("quiz_attempts")
      .select("id, article_id, score, total_points, completed_at, total_seconds, expected_seconds")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .then(({ data }) => {
        setAttempts((data as QuizAttempt[]) ?? [])
        setLoadingAttempts(false)
      })
  }, [user])

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
        <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-6">
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
                {attempts.map((attempt) => (
                  <AttemptRow
                    key={attempt.id}
                    attempt={attempt}
                    title={titleById[attempt.article_id] ?? attempt.article_id}
                    onPress={() => router.push({ pathname: "/attempt", params: { id: attempt.id } })}
                  />
                ))}
              </View>
            )}

          </>
        )}

        {/* Refresh content — available to all */}
        <Pressable
          onPress={handleRefreshContent}
          disabled={syncing}
          className="border border-slate-200 rounded-2xl py-4 items-center active:opacity-70 bg-white mt-8"
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#d97706" />
          ) : (
            <Text className="text-amber-600 font-semibold text-sm">
              {syncMsg ?? "更新內容"}
            </Text>
          )}
        </Pressable>

        {/* Clear cache and resync — available to all */}
        <Pressable
          onPress={handleClearCacheAndResync}
          disabled={syncing}
          className="border border-slate-200 rounded-2xl py-4 items-center active:opacity-70 bg-white mt-3"
        >
          <Text className="text-red-500 font-semibold text-sm">清除快取並重新同步</Text>
        </Pressable>

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
