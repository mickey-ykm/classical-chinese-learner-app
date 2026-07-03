import { useEffect, useRef } from "react"
import { View, Text, Animated } from "react-native"
import { JianColors, JianTypography } from "@/components/jian"

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
    <View style={{ width: '100%' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3 }}>
          題目進度
        </Text>
        <Text style={{ fontFamily: JianTypography.number, fontSize: JianTypography.caption, color: JianColors.ink3 }}>
          {current} / {total}
        </Text>
      </View>
      <View style={{ height: 4, width: '100%', backgroundColor: JianColors.line, borderRadius: 2, overflow: 'hidden' }}>
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: JianColors.vermilion,
            borderRadius: 2,
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
