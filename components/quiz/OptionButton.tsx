import { useRef } from "react"
import { Pressable, Text, View, Animated } from "react-native"
import type { OptionKey } from "@/lib/types"

interface Props {
  optionKey: OptionKey
  text: string
  isSelected: boolean
  isCorrect: boolean
  revealAnswer: boolean
  disabled: boolean
  onSelect: () => void
}

export default function OptionButton({
  optionKey,
  text,
  isSelected,
  isCorrect,
  revealAnswer,
  disabled,
  onSelect,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
  }

  let bgColor = "bg-white"
  let borderColor = "border-slate-200"
  let textColor = "text-slate-800"
  let opacity = 1

  if (revealAnswer) {
    if (isCorrect) {
      bgColor = "bg-green-100"; borderColor = "border-green-500"; textColor = "text-green-900"
    } else if (isSelected) {
      bgColor = "bg-red-100"; borderColor = "border-red-500"; textColor = "text-red-900"
    } else {
      opacity = 0.4
    }
  } else if (isSelected) {
    bgColor = "bg-slate-100"; borderColor = "border-blue-400"; textColor = "text-blue-900"
  }

  const icon = revealAnswer ? (isCorrect ? "✓" : isSelected ? "✗" : "") : ""

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        onPress={onSelect}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        className={`flex-row items-start gap-3 px-4 py-3 rounded-xl border-2 ${bgColor} ${borderColor}`}
        style={{ minHeight: 44 }}
      >
        <View className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 items-center justify-center shrink-0">
          <Text className="text-xs font-bold text-slate-600">{optionKey}</Text>
        </View>
        <Text className={`flex-1 text-sm leading-snug ${textColor}`}>{text}</Text>
        {icon ? <Text className={`font-bold ${textColor}`}>{icon}</Text> : null}
      </Pressable>
    </Animated.View>
  )
}
