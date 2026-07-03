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
import { Card, Button, JianColors, JianTypography, JianRadius, getSerifFont } from "@/components/jian"

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
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Pressable
              onPress={() => setTabMode("original")}
              style={{ flex: 1 }}
            >
              {({ pressed }) => (
                <View
                  style={{
                    paddingVertical: 12,
                    borderRadius: JianRadius.button,
                    alignItems: 'center',
                    backgroundColor: tabMode === "original" ? JianColors.vermilion : JianColors.surface,
                    borderWidth: 1,
                    borderColor: tabMode === "original" ? JianColors.vermilion : JianColors.line,
                    opacity: pressed ? 0.7 : 1
                  }}
                >
                  <Text
                    style={{
                      fontFamily: JianTypography.serif,
                      fontSize: JianTypography.body,
                      fontWeight: '600',
                      color: tabMode === "original" ? JianColors.paper : JianColors.ink2
                    }}
                  >
                    原文
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => setTabMode("translation")}
              style={{ flex: 1 }}
            >
              {({ pressed }) => (
                <View
                  style={{
                    paddingVertical: 12,
                    borderRadius: JianRadius.button,
                    alignItems: 'center',
                    backgroundColor: tabMode === "translation" ? JianColors.vermilion : JianColors.surface,
                    borderWidth: 1,
                    borderColor: tabMode === "translation" ? JianColors.vermilion : JianColors.line,
                    opacity: pressed ? 0.7 : 1
                  }}
                >
                  <Text
                    style={{
                      fontFamily: JianTypography.serif,
                      fontSize: JianTypography.body,
                      fontWeight: '600',
                      color: tabMode === "translation" ? JianColors.paper : JianColors.ink2
                    }}
                  >
                    白話文語譯
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Tab Content */}
          {tabMode === "original" ? (
            <>
              <Card variant="default" padding={20}>
                <ArticleText
                  segments={article.segments}
                  footnotes={article.footnotes}
                  onFootnoteTap={handleFootnoteTap}
                />
              </Card>

              {article.footnotes.length > 0 && (
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3, textAlign: 'center', marginTop: 16 }}>
                  點擊 <Text style={{ fontFamily: getSerifFont('700'), color: JianColors.vermilion }}>(1)</Text> 查看注釋
                </Text>
              )}
            </>
          ) : (
            <Card variant="default" padding={20} style={{ gap: 12 }}>
              {article.modernTranslation.map((p, i) => (
                <Text key={i} style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.bodySmall, color: JianColors.ink, lineHeight: 28 }}>
                  {p}
                </Text>
              ))}
            </Card>
          )}

          <View style={{ marginTop: 32 }}>
            <Button
              variant="primary"
              size="large"
              fullWidth
              onPress={() => router.push({ pathname: "/quiz", params: { id } })}
            >
              開始測驗 →
            </Button>
          </View>
        </ScrollView>

        {tabMode === "original" && (
          <FootnotePanel footnote={activeFootnote} onClose={() => setActiveFootnote(null)} />
        )}
      </View>
    </SafeAreaView>
  )
}
