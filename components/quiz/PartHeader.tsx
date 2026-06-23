import { View, Text } from "react-native"

const PART_COLORS: Record<number, string> = {
  1: "bg-blue-50 border-blue-200",
  2: "bg-purple-50 border-purple-200",
  3: "bg-green-50 border-green-200",
  4: "bg-rose-50 border-rose-200",
  5: "bg-amber-50 border-amber-200",
  6: "bg-teal-50 border-teal-200",
}

const TEXT_COLORS: Record<number, string> = {
  1: "text-blue-800",
  2: "text-purple-800",
  3: "text-green-800",
  4: "text-rose-800",
  5: "text-amber-800",
  6: "text-teal-800",
}

const DEFAULT_PART_COLOR = "bg-slate-50 border-slate-200"
const DEFAULT_TEXT_COLOR = "text-slate-800"

interface Props {
  partNumber?: 1 | 2 | 3 | 4 | 5 | 6
  title: string
}

export default function PartHeader({ partNumber, title }: Props) {
  const partColor = partNumber != null ? (PART_COLORS[partNumber] ?? DEFAULT_PART_COLOR) : DEFAULT_PART_COLOR
  const textColor = partNumber != null ? (TEXT_COLORS[partNumber] ?? DEFAULT_TEXT_COLOR) : DEFAULT_TEXT_COLOR
  return (
    <View className={`rounded-xl border px-4 py-3 mb-4 ${partColor}`}>
      {partNumber != null && (
        <Text className={`text-xs font-semibold uppercase tracking-wide opacity-70 ${textColor}`}>
          第{partNumber}部分
        </Text>
      )}
      <Text className={`font-medium text-sm mt-0.5 ${textColor}`}>{title}</Text>
    </View>
  )
}
