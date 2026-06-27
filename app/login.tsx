import { useState, useEffect, useRef } from "react"
import { View, Text, Pressable, ActivityIndicator, Alert, TextInput } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Logo } from "@/components/Logo"
import { useAuth } from "@/hooks/useAuth"

export default function LoginScreen() {
  const router = useRouter()
  const { signInWithGoogle, signInWithEmail, user, isAnonymous } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [email, setEmail] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
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

  async function handleEmailSignIn() {
    if (!email.trim()) {
      Alert.alert("請輸入電郵地址", "")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert("電郵格式不正確", "請檢查你的電郵地址")
      return
    }

    setSendingEmail(true)
    justSignedIn.current = true
    try {
      await signInWithEmail(email)
      setEmailSent(true)
    } catch (e: unknown) {
      justSignedIn.current = false
      const message = e instanceof Error ? e.message : "發送失敗，請再試一次"

      // Customize message for known errors
      let displayMessage = message
      if (message.toLowerCase().includes("rate limit")) {
        displayMessage = "請稍後再試（每分鐘限一次）"
      }

      Alert.alert("發送錯誤", displayMessage)
    } finally {
      setSendingEmail(false)
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

          {/* Divider */}
          <View className="flex-row items-center gap-3">
            <View className="flex-1 h-px bg-slate-200" />
            <Text className="text-slate-400 text-sm">或</Text>
            <View className="flex-1 h-px bg-slate-200" />
          </View>

          {/* Email input section */}
          {!emailSent ? (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="電郵地址"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!sendingEmail}
                className="bg-white border border-slate-200 rounded-2xl px-4 py-4 text-slate-700"
              />
              <Pressable
                onPress={handleEmailSignIn}
                disabled={sendingEmail || !email.trim()}
                className="bg-amber-500 rounded-2xl py-4 items-center active:opacity-80"
                style={{ opacity: sendingEmail || !email.trim() ? 0.5 : 1 }}
              >
                {sendingEmail ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    發送登入連結
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 gap-2">
              <Text className="text-amber-800 font-semibold text-center">
                ✉️ 登入連結已發送
              </Text>
              <Text className="text-amber-700 text-sm text-center">
                請檢查你的電郵收件箱（{email}）並點擊連結以登入
              </Text>
              <Pressable onPress={() => setEmailSent(false)} className="mt-2">
                <Text className="text-amber-600 text-sm text-center underline">
                  重新輸入電郵地址
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text className="text-sm text-slate-400 underline">以訪客身份繼續</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
