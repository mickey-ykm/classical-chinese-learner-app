import { useEffect, useRef } from "react"
import { View, Text, Pressable, Animated } from "react-native"
import type { Footnote } from "@/lib/types"
import { JianColors, getSerifFont } from "@/components/jian"

const PANEL_HEIGHT = 160
const BUTTON_BAR_HEIGHT = 80 // Height of the sticky button bar

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
      style={{
        transform: [{ translateY }],
        position: 'absolute',
        bottom: BUTTON_BAR_HEIGHT,
        left: 0,
        right: 0,
        backgroundColor: JianColors.surface,
        borderTopWidth: 1,
        borderTopColor: JianColors.line,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
      }}
      pointerEvents={footnote ? "auto" : "none"}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: getSerifFont('700'), fontSize: 14, color: JianColors.vermilion }}>
            {footnote?.marker}
          </Text>
          <Text style={{ fontFamily: getSerifFont('700'), fontSize: 16, color: JianColors.vermilion }}>
            「{footnote?.term}」
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={{ padding: 4 }}>
          <Text style={{ color: JianColors.ink3, fontSize: 20 }}>✕</Text>
        </Pressable>
      </View>
      <Text style={{ paddingHorizontal: 20, paddingBottom: 24, fontSize: 14, color: JianColors.ink2, lineHeight: 22 }}>
        {footnote?.explanation}
      </Text>
    </Animated.View>
  )
}
