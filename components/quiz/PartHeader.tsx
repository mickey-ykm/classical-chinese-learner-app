import { View, Text } from "react-native"

const PART_COLORS: Record<number, string> = {
  1: "bg-blue-50 border-blue-200",
  2: "bg-purple-50 border-purple-200",
  3: "bg-green-50 border-green-200",
  4: "bg-rose-50 border-rose-200",
}

const TEXT_COLORS: Record<number, string> = {
  1: "text-blue-800",
  2: "text-purple-800",
  3: "text-green-800",
  4: "text-rose-800",
}

interface Props {
  partNumber: 1 | 2 | 3 | 4
  title: string
  pointsPerQuestion: number
}

export default function PartHeader({ partNumber, title, pointsPerQuestion }: Props) {
  return (
    <View className={`rounded-xl border px-4 py-3 mb-4 ${PART_COLORS[partNumber]}`}>
      <Text className={`text-xs font-semibold uppercase tracking-wide opacity-70 ${TEXT_COLORS[partNumber]}`}>
        第{partNumber}部分
      </Text>
      <Text className={`font-medium text-sm mt-0.5 ${TEXT_COLORS[partNumber]}`}>{title}</Text>
      <Text className={`text-xs opacity-60 mt-0.5 ${TEXT_COLORS[partNumber]}`}>
        每題 {pointsPerQuestion} 分
      </Text>
    </View>
  )
}
