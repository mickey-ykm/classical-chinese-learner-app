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
import { Card, Button, JianColors, JianTypography, JianRadius, getSerifFont, SegmentedControl } from "@/components/jian"

type TabMode = "original" | "translation"

export default function ReadScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const article = getArticle(id)
  const { user, profile, isAnonymous } = useAuth()
  const [activeFootnote, setActiveFootnote] = useState<Footnote | null>(null)
  const [tabMode, setTabMode] = useState<TabMode>("original")
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
      <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
        <UpgradeModal visible={true} onClose={() => router.back()} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingTop: 32, paddingBottom: 48 }}
          onScroll={handleScroll}
          scrollEventThrottle={200}
        >
          <Pressable onPress={() => router.back()} style={{ marginBottom: 24 }} hitSlop={12}>
            <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: '600', color: JianColors.vermilion }}>
              ← 返回
            </Text>
          </Pressable>

          {/* Category Badge */}
          {article.meta?.articleType && (
            <View style={{ marginBottom: 12 }}>
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  backgroundColor: JianColors.vermilionLight,
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, fontWeight: '600', color: JianColors.vermilion }}>
                  {article.meta.articleType === 'dse-exam' ? 'DSE 甲部指定篇章' :
                   article.meta.articleType === 'dse-non-exam' ? 'DSE 高中課文' :
                   '其他範文'}
                </Text>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
            <Text style={{ fontFamily: getSerifFont('700'), fontSize: JianTypography.title, color: JianColors.ink }}>
              {article.title}
            </Text>
            {article.titleFootnoteId && (
              <Text
                onPress={() => handleFootnoteTap(article.titleFootnoteId!)}
                style={{ fontFamily: getSerifFont('700'), fontSize: JianTypography.bodySmall, color: JianColors.vermilion, marginLeft: 2 }}
              >
                {article.footnotes.find((f) => f.id === article.titleFootnoteId)?.marker ?? `(${article.titleFootnoteId})`}
              </Text>
            )}
          </View>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3, marginBottom: 24 }}>
            {article.source ?? ""}
          </Text>

          {/* Tab Selector */}
          <SegmentedControl
            options={[
              { label: '原文', value: 'original' },
              { label: '白話文語譯', value: 'translation' }
            ]}
            value={tabMode}
            onChange={(value) => setTabMode(value as TabMode)}
            style={{ marginBottom: 16 }}
          />

          {/* Tab Content */}
          {tabMode === "original" ? (
            <>
              <ArticleText
                segments={article.segments}
                footnotes={article.footnotes}
                onFootnoteTap={handleFootnoteTap}
              />

              {article.footnotes.length > 0 && (
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3, textAlign: 'center', marginTop: 16 }}>
                  點擊 <Text style={{ fontFamily: getSerifFont('700'), color: JianColors.vermilion }}>(1)</Text> 查看注釋
                </Text>
              )}
            </>
          ) : (
            <View style={{ gap: 12 }}>
              {article.modernTranslation.map((p, i) => (
                <Text key={i} style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.bodySmall, color: JianColors.ink, lineHeight: 28 }}>
                  {p}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Sticky Button */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: JianColors.paper, borderTopWidth: 1, borderTopColor: JianColors.line }}>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={() => router.push({ pathname: "/quiz", params: { id } })}
          >
            開始測驗 →
          </Button>
        </View>

        {tabMode === "original" && (
          <FootnotePanel footnote={activeFootnote} onClose={() => setActiveFootnote(null)} />
        )}
      </View>
    </SafeAreaView>
  )
}
