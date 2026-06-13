import { useState, useEffect, useRef } from "react"
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Logo } from "@/components/Logo"
import { useAuth } from "@/hooks/useAuth"

export default function LoginScreen() {
  const router = useRouter()
  const { signInWithGoogle, user, isAnonymous } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  // Tracks whether we're in the middle of a fresh sign-in attempt,
  // so the success alert only fires after the session is actually confirmed.
  const justSignedIn = useRef(false)

  // Navigate to account once onAuthStateChange has confirmed a real
  // (non-anonymous) user. Show the success alert here — not in
  // handleGoogleSignIn — so it only fires after the session is established.
  useEffect(() => {
    if (user && !isAnonymous) {
      if (justSignedIn.current) {
        justSignedIn.current = false
        Alert.alert("登入成功！", "歡迎使用文言教室 📚", [{ text: "確定" }])
      }
      router.replace("/account")
    }
  }, [user, isAnonymous])

  async function handleGoogleSignIn() {
    setSigningIn(true)
    justSignedIn.current = true
    try {
      await signInWithGoogle()
    } catch (e: unknown) {
      justSignedIn.current = false
      const message = e instanceof Error ? e.message : "登入失敗，請再試一次"
      if (!message.includes("cancelled")) {
        Alert.alert("登入錯誤", message)
      }
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Back button */}
      <View className="px-5 pt-4">
        <Pressable onPress={() => router.back()} hitSlop={12} className="self-start">
          <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-8 gap-8">
        <View className="items-center gap-3">
          <Logo size={96} />
          <Text className="text-2xl font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>
            文言教室
          </Text>
          <Text className="text-sm text-slate-400 text-center">
            登入以記錄學習進度及錯題分析
          </Text>
        </View>

        <View className="w-full gap-3">
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={signingIn}
            className="bg-white border border-slate-200 rounded-2xl py-4 flex-row items-center justify-center gap-3 active:opacity-70 shadow-sm"
          >
            {signingIn ? (
              <ActivityIndicator size="small" color="#475569" />
            ) : (
              <>
                <Text className="text-2xl">G</Text>
                <Text className="text-slate-700 font-semibold text-base">
                  以 Google 帳號登入
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text className="text-sm text-slate-400 underline">以訪客身份繼續</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
