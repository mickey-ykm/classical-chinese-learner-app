import { useEffect, useState } from "react"
import { View, ActivityIndicator, Text } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { supabase } from "@/lib/supabase"

export default function OAuthCallback() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      // Check for magic link/OAuth errors first
      const errorParam = params.error as string | undefined
      const errorCode = params.error_code as string | undefined
      const errorDescription = params.error_description as string | undefined

      if (errorParam || errorCode) {
        let errorMessage = "登入連結已過期或無效，請重新發送"
        if (errorCode === "otp_expired") {
          errorMessage = "登入連結已過期（60秒內有效），請重新發送"
        }

        setError(errorMessage)
        setTimeout(() => router.replace("/login"), 3000)
        return
      }

      // Check for authorization code (both OAuth and magic link use this)
      const code = params.code as string | undefined

      if (code) {
        // Exchange the authorization code for a session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          setError("登入失敗，請重試")
          setTimeout(() => router.replace("/login"), 2000)
          return
        }

        // Verify we have a real (non-anonymous) session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user || session.user.is_anonymous) {
          setError("無法完成登入，請再試一次")
          setTimeout(() => router.replace("/login"), 2000)
          return
        }
      }

      // Wait briefly for AuthContext's onAuthStateChange to fire, then redirect
      setTimeout(() => {
        router.replace("/(tabs)")
      }, 100)
    } catch (err) {
      setError("登入失敗，請重試")
      setTimeout(() => router.replace("/login"), 2000)
    }
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <Text className="text-red-600 text-center">{error}</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator size="large" color="#d97706" />
    </View>
  )
}
