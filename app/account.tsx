import { useEffect, useState } from "react"
import { View, Text, Pressable, Image, Alert, ScrollView, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { getArticleIndex } from "@/lib/data"

interface QuizAttempt {
  id: string
  article_id: string
  score: number
  total_points: number
  completed_at: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function AttemptRow({ attempt, title }: { attempt: QuizAttempt; title: string }) {
  const pct = Math.round((attempt.score / attempt.total_points) * 100)
  const barColor = pct >= 80 ? "bg-amber-500" : pct >= 50 ? "bg-amber-300" : "bg-slate-300"

  return (
    <View className="bg-white rounded-2xl border border-slate-100 px-4 py-3 gap-2">
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
    </View>
  )
}

export default function AccountScreen() {
  const router = useRouter()
  const { user, profile, signOut, loading } = useAuth()
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const [settled, setSettled] = useState(false)

  const articleIndex = getArticleIndex()
  const titleById = Object.fromEntries(articleIndex.map((a) => [a.id, a.title]))

  // Give auth state 400ms to commit before deciding to redirect
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (settled && !loading && !user) router.replace("/login")
  }, [settled, loading, user])

  useEffect(() => {
    if (!user) return
    supabase
      .from("quiz_attempts")
      .select("id, article_id, score, total_points, completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .then(({ data }) => {
        setAttempts((data as QuizAttempt[]) ?? [])
        setLoadingAttempts(false)
      })
  }, [user])

  if (!settled || loading || !user) return (
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

  const displayName = profile?.display_name ?? user.email ?? "用戶"
  const avatarUrl = profile?.avatar_url

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
          <Text className="text-xs text-slate-400">{user.email}</Text>
        </View>

        {/* Completed exercises */}
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
              />
            ))}
          </View>
        )}

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          className="border border-slate-200 rounded-2xl py-4 items-center active:opacity-70 bg-white mt-8"
        >
          <Text className="text-slate-500 font-semibold text-sm">登出</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
