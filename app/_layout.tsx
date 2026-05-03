import { Stack } from "expo-router"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { useEffect, useRef } from "react"
import { Animated, ActivityIndicator } from "react-native"
import { Logo } from "@/components/Logo"
import { AuthProvider } from "@/contexts/AuthContext"
import "../global.css"

function SplashOverlay() {
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start()
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Animated.View
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#fafaf9",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        zIndex: 999,
        opacity,
      }}
      pointerEvents="none"
    >
      <Logo size={120} />
      <ActivityIndicator size="small" color="#d97706" />
    </Animated.View>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="dark" />
        <SplashOverlay />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
