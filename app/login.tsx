import { useState, useEffect, useRef } from "react"
import { View, Text, Pressable, ActivityIndicator, Alert, TextInput } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Logo } from "@/components/Logo"
import { useAuth } from "@/hooks/useAuth"
import { Button, Card, JianColors, JianTypography, JianRadius, getSerifFont } from "@/components/jian"

export default function LoginScreen() {
  const router = useRouter()
  const { signInWithGoogle, signInWithEmail, user, isAnonymous } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [email, setEmail] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
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
      // Navigate to magic link sent page
      router.push(`/magic-link-sent?email=${encodeURIComponent(email)}`)
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
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      {/* Back button */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: '600', color: JianColors.vermilion }}>
            ← 返回
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <Logo size={96} />
          <Text style={{ fontFamily: getSerifFont('700'), fontSize: JianTypography.title, color: JianColors.ink }}>
            文言教室
          </Text>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink3, textAlign: 'center' }}>
            登入以記錄學習進度及錯題分析
          </Text>
        </View>

        <View style={{ width: '100%', gap: 12 }}>
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={signingIn}
          >
            {({ pressed }) => (
              <Card variant="default" style={{ opacity: pressed ? 0.7 : 1, opacity: signingIn ? 0.5 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 4 }}>
                  {signingIn ? (
                    <ActivityIndicator size="small" color={JianColors.ink2} />
                  ) : (
                    <>
                      <Text style={{ fontSize: 24 }}>G</Text>
                      <Text style={{ fontFamily: getSerifFont('600'), fontSize: JianTypography.body, color: JianColors.ink }}>
                        以 Google 帳號登入
                      </Text>
                    </>
                  )}
                </View>
              </Card>
            )}
          </Pressable>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: JianColors.line }} />
            <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink3 }}>或</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: JianColors.line }} />
          </View>

          {/* Email input section */}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="電郵地址"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!sendingEmail}
            style={{
              fontFamily: JianTypography.sans,
              fontSize: JianTypography.body,
              color: JianColors.ink,
              backgroundColor: JianColors.surface,
              borderWidth: 1,
              borderColor: JianColors.line,
              borderRadius: JianRadius.card,
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
            placeholderTextColor={JianColors.ink3}
          />
          <Button
            variant="primary"
            size="large"
            fullWidth
            loading={sendingEmail}
            disabled={sendingEmail || !email.trim()}
            onPress={handleEmailSignIn}
          >
            發送登入連結
          </Button>
        </View>
      </View>

      {/* Guest continue button at bottom */}
      <View style={{ paddingHorizontal: 32, paddingBottom: 32, alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink3, textDecorationLine: 'underline' }}>
            以訪客身份繼續
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
