import { useState, useRef } from "react"
import { ScrollView, View, Text, Pressable, NativeSyntheticEvent, NativeScrollEvent } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { getArticle, isArticleFree } from "@/lib/data"
import { markAsRead } from "@/lib/readProgress"
import { useAuth } from "@/hooks/useAuth"
import UpgradeModal from "@/components/UpgradeModal"
import type { Footnote } from "@/lib/types"
import ArticleText from "@/components/reading/ArticleText"
import FootnotePanel from "@/components/reading/FootnotePanel"
import TranslationToggle from "@/components/reading/TranslationToggle"

export default function ReadScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const article = getArticle(id)
  const { user, profile, isAnonymous } = useAuth()
  const [activeFootnote, setActiveFootnote] = useState<Footnote | null>(null)
  const markedRead = useRef(false)

  const isPro = profile?.is_pro ?? false
  const gated = !isArticleFree(id) && !isPro

  function handleFootnoteTap(footnoteId: string) {
    const fn = article.footnotes.find((f) => f.id === footnoteId) ?? null
    setActiveFootnote(fn)
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (markedRead.current) return
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
    const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80
    if (nearBottom) {
      markedRead.current = true
      markAsRead(id, !isAnonymous && user ? user.id : undefined)
    }
  }

  if (gated) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <UpgradeModal visible={true} onClose={() => router.back()} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1">
        <ScrollView
          className="flex-1 px-5"
          contentContainerClassName="py-8 pb-12"
          onScroll={handleScroll}
          scrollEventThrottle={200}
        >
          <Pressable onPress={() => router.back()} className="mb-6" hitSlop={12}>
            <Text className="text-sm text-slate-400">← 返回</Text>
          </Pressable>

          <View className="flex-row items-baseline mb-1">
            <Text className="text-xl font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>
              {article.title}
            </Text>
            {article.titleFootnoteId && (
              <Text
                onPress={() => handleFootnoteTap(article.titleFootnoteId!)}
                className="text-amber-600 font-bold text-sm ml-0.5"
              >
                {article.footnotes.find((f) => f.id === article.titleFootnoteId)?.marker ?? `(${article.titleFootnoteId})`}
              </Text>
            )}
          </View>
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
