import { useEffect, useRef } from "react"
import { View, Text, Pressable, Animated, Dimensions } from "react-native"
import type { Footnote } from "@/lib/types"

const PANEL_HEIGHT = 160
const { height: SCREEN_HEIGHT } = Dimensions.get("window")

interface Props {
  footnote: Footnote | null
  onClose: () => void
}

export default function FootnotePanel({ footnote, onClose }: Props) {
  const translateY = useRef(new Animated.Value(PANEL_HEIGHT)).current

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: footnote ? 0 : PANEL_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [footnote])

  return (
    <Animated.View
      style={{ transform: [{ translateY }] }}
      className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 rounded-t-2xl shadow-lg"
      pointerEvents={footnote ? "auto" : "none"}
    >
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-amber-600 font-bold text-base" style={{ fontFamily: "Georgia" }}>
          「{footnote?.term}」
        </Text>
        <Pressable onPress={onClose} hitSlop={12} className="p-1">
          <Text className="text-slate-400 text-xl">✕</Text>
        </Pressable>
      </View>
      <Text className="px-5 pb-6 text-slate-700 text-sm leading-relaxed">
        {footnote?.explanation}
      </Text>
    </Animated.View>
  )
}
