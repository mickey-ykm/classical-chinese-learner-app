import { Modal, View, Text, Pressable, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { Article } from "@/lib/types"
import ArticleText from "@/components/reading/ArticleText"

interface Props {
  visible: boolean
  article: Article | null
  onClose: () => void
}

export default function ArticlePopup({ visible, article, onClose }: Props) {
  const insets = useSafeAreaInsets()

  if (!article) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <Pressable
          onPress={onClose}
          className="absolute inset-0"
        />
        <View
          style={{ paddingBottom: insets.bottom + 8 }}
          className="bg-white rounded-t-2xl max-h-[85%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
            <View>
              <Text className="font-bold text-slate-800 text-base">{article.title}</Text>
              {article.source ? (
                <Text className="text-xs text-slate-500 mt-0.5">{article.source}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="bg-slate-100 rounded-full w-8 h-8 items-center justify-center"
            >
              <Text className="text-slate-600 font-bold text-base leading-none">✕</Text>
            </Pressable>
          </View>

          <ScrollView
            className="px-5 py-4"
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <ArticleText
              segments={article.segments}
              footnotes={article.footnotes}
              onFootnoteTap={() => {}}
            />

            {article.footnotes.length > 0 && (
              <View className="mt-6 gap-2">
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  註釋
                </Text>
                {article.footnotes.map((fn) => (
                  <View key={fn.id} className="flex-row gap-2">
                    <Text className="text-amber-600 font-bold text-sm min-w-[32px]">{fn.marker}</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-700">{fn.term}</Text>
                      <Text className="text-xs text-slate-500 leading-relaxed">{fn.explanation}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
