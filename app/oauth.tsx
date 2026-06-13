import { useEffect } from "react"
import { View, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"

export default function OAuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // OAuth callback landed here - redirect to home
    // The AuthContext will handle the session establishment
    const timer = setTimeout(() => {
      router.replace("/(tabs)")
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator size="large" color="#d97706" />
    </View>
  )
}
