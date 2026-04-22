import { useEffect, useRef } from "react"
import { View, Text, Animated } from "react-native"

interface Props {
  current: number
  total: number
}

export default function QuizProgressBar({ current, total }: Props) {
  const widthAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: current / total,
      duration: 500,
      useNativeDriver: false,
    }).start()
  }, [current, total])

  return (
    <View className="w-full">
      <View className="flex-row justify-between mb-1">
        <Text className="text-xs text-slate-400">題目進度</Text>
        <Text className="text-xs text-slate-400">
          {current} / {total}
        </Text>
      </View>
      <View className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <Animated.View
          className="h-full bg-amber-400 rounded-full"
          style={{
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          }}
        />
      </View>
    </View>
  )
}
