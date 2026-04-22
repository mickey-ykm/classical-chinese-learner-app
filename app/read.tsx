import { useState } from "react"
import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { getArticle } from "@/lib/data"
import type { Footnote } from "@/lib/types"
import ArticleText from "@/components/reading/ArticleText"
import FootnotePanel from "@/components/reading/FootnotePanel"
import TranslationToggle from "@/components/reading/TranslationToggle"

export default function ReadScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const article = getArticle(id)
  const [activeFootnote, setActiveFootnote] = useState<Footnote | null>(null)

  function handleFootnoteTap(footnoteId: string) {
    const fn = article.footnotes.find((f) => f.id === footnoteId) ?? null
    setActiveFootnote(fn)
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1">
        <ScrollView className="flex-1 px-5" contentContainerClassName="py-8 pb-12">
          <Pressable onPress={() => router.back()} className="mb-6" hitSlop={12}>
            <Text className="text-sm text-slate-400">← 返回</Text>
          </Pressable>

          <Text className="text-xl font-bold text-slate-800 mb-1" style={{ fontFamily: "Georgia" }}>
            {article.title}
          </Text>
          <Text className="text-xs text-slate-400 mb-6">{article.source ?? ""}</Text>

          <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <ArticleText
              segments={article.segments}
              footnotes={article.footnotes}
              onFootnoteTap={handleFootnoteTap}
            />
          </View>

          {article.footnotes.length > 0 && (
            <Text className="text-xs text-slate-400 text-center mt-4">
              點擊 <Text className="text-amber-600 font-bold">(1)</Text> 查看注釋
            </Text>
          )}

          <TranslationToggle paragraphs={article.modernTranslation} />

          <Pressable
            onPress={() => router.push({ pathname: "/quiz", params: { id } })}
            className="mt-8 w-full py-3.5 rounded-xl bg-amber-500 items-center active:opacity-80"
          >
            <Text className="text-white font-semibold text-base">開始測驗 →</Text>
          </Pressable>
        </ScrollView>

        <FootnotePanel footnote={activeFootnote} onClose={() => setActiveFootnote(null)} />
      </View>
    </SafeAreaView>
  )
}
