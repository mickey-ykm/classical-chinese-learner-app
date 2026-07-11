import { View, Text, Pressable } from "react-native"
import type { ArticleSegment, Footnote } from "@/lib/types"
import { JianColors, getSerifFont } from "@/components/jian"

interface Props {
  segments: ArticleSegment[]
  footnotes: Footnote[]
  onFootnoteTap: (id: string) => void
}

export default function ArticleText({ segments, footnotes, onFootnoteTap }: Props) {
  return (
    <View>
      <Text
        style={{ fontFamily: getSerifFont('400'), fontSize: 18, lineHeight: 36, color: JianColors.ink }}
      >
        {segments.map((seg, i) =>
          seg.footnoteId ? (
            <Text key={i}>
              <Pressable
                onPress={() => onFootnoteTap(seg.footnoteId!)}
                hitSlop={8}
                style={{ display: "inline" }}
              >
                <Text style={{ fontFamily: getSerifFont('700'), fontSize: 14, lineHeight: 14, color: JianColors.vermilion }}>
                  {seg.text}
                </Text>
              </Pressable>
            </Text>
          ) : (
            <Text key={i}>{seg.text}</Text>
          )
        )}
      </Text>
    </View>
  )
}
