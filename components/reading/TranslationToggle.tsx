import { useState } from "react"
import { View, Text, Pressable } from "react-native"

interface Props {
  paragraphs: string[]
}

export default function TranslationToggle({ paragraphs }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <View className="mt-6">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center gap-2 self-start border border-amber-300 bg-amber-50 rounded-full px-4 py-2 active:opacity-70"
      >
        <Text className="text-sm font-medium text-amber-700">
          {open ? "隱藏語譯" : "顯示語譯"}
        </Text>
        <Text className="text-xs text-amber-700">{open ? "▲" : "▼"}</Text>
      </Pressable>

      {open && (
        <View className="mt-4 border-l-4 border-amber-200 pl-4 gap-3">
          {paragraphs.map((p, i) => (
            <Text key={i} className="text-slate-500 text-sm leading-7">
              {p}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}
