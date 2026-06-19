import { View, Text, Pressable } from "react-native"
import type { ArticleSegment, Footnote } from "@/lib/types"

interface Props {
  segments: ArticleSegment[]
  footnotes: Footnote[]
  onFootnoteTap: (id: string) => void
}

export default function ArticleText({ segments, footnotes, onFootnoteTap }: Props) {
  return (
    <View>
      <Text
        className="text-lg tracking-wide text-slate-800"
        style={{ fontFamily: "Georgia", lineHeight: 42 }}
      >
        {segments.map((seg, i) =>
          seg.footnoteId ? (
            <Text
              key={i}
              onPress={() => onFootnoteTap(seg.footnoteId!)}
              className="text-amber-600 font-bold text-sm"
            >
              {seg.text}
            </Text>
          ) : (
            <Text key={i}>{seg.text}</Text>
          )
        )}
      </Text>
    </View>
  )
}
