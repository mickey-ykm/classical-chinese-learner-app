import { Modal, View, Text, Pressable, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useState } from "react"
import type { Article } from "@/lib/types"
import ArticleText from "@/components/reading/ArticleText"
import { getArticle } from "@/lib/data"
import { JianColors, JianTypography, JianRadius, getSerifFont } from "@/components/jian"

interface Props {
  visible: boolean
  article: Article | null
  articles?: Array<{ id: string; title: string }>  // Multi-article mode
  onClose: () => void
}

export default function ArticlePopup({ visible, article, articles, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Multi-article mode
  const isMultiArticle = articles && articles.length > 1
  const currentArticle = isMultiArticle
    ? getArticle(articles[selectedIndex].id)
    : article

  // Debug logging
  if (isMultiArticle && visible) {
    console.log(`ArticlePopup: Loading article ${articles[selectedIndex].id} (${articles[selectedIndex].title})`)
    console.log(`Article data:`, currentArticle ? 'loaded' : 'null')
    if (currentArticle) {
      console.log(`Segments: ${currentArticle.segments?.length || 0}`)
    }
  }

  // Don't render if no article available
  if (!isMultiArticle && !article) return null

  // For multi-article mode, if current article fails to load, show error state
  const hasNoContent = isMultiArticle && (!currentArticle || !currentArticle.segments || currentArticle.segments.length === 0)

  const numberLabels = ['①', '②', '③', '④', '⑤']

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(44, 39, 34, 0.34)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          style={{
            paddingBottom: insets.bottom + 8,
            backgroundColor: JianColors.surface,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            maxHeight: '85%',
            shadowColor: '#2c2722',
            shadowOffset: { width: 0, height: -14 },
            shadowOpacity: 0.32,
            shadowRadius: 16,
            elevation: 10
          }}
        >
          {/* Drag handle */}
          <View style={{
            width: 38,
            height: 4,
            backgroundColor: JianColors.line2,
            borderRadius: 3,
            marginTop: 11,
            marginBottom: 0,
            alignSelf: 'center'
          }} />

          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 22,
            paddingTop: 11,
            paddingBottom: 0
          }}>
            <View>
              <Text style={{
                fontFamily: getSerifFont('700'),
                fontSize: 18,
                lineHeight: 26,
                color: JianColors.ink
              }}>
                原文檢視
              </Text>
              {isMultiArticle && (
                <Text style={{
                  fontFamily: getSerifFont('400'),
                  fontSize: 12,
                  lineHeight: 18,
                  color: JianColors.vermilion,
                  marginTop: 2
                }}>
                  本題涉及 {articles.length} 篇文章，可切換查閱
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{
                width: 31,
                height: 31,
                borderRadius: 15.5,
                backgroundColor: JianColors.surface2,
                borderWidth: 1,
                borderColor: JianColors.line2,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {({ pressed }) => (
                <Text style={{
                  fontFamily: getSerifFont('400'),
                  fontSize: 16,
                  color: JianColors.ink2,
                  opacity: pressed ? 0.7 : 1
                }}>
                  ✕
                </Text>
              )}
            </Pressable>
          </View>

          {/* Article tabs for multi-article mode */}
          {isMultiArticle && (
            <View style={{
              flexDirection: 'row',
              gap: 8,
              paddingHorizontal: 22,
              paddingTop: 13,
              paddingBottom: 0
            }}>
              {articles.map((art, index) => (
                <Pressable
                  key={art.id}
                  onPress={() => setSelectedIndex(index)}
                  style={{ flex: 1 }}
                >
                  {({ pressed }) => (
                    <View style={{
                      paddingVertical: 10,
                      borderRadius: 9,
                      alignItems: 'center',
                      backgroundColor: selectedIndex === index ? JianColors.vermilion : JianColors.surface2,
                      borderWidth: selectedIndex === index ? 0 : 1,
                      borderColor: JianColors.line2,
                      opacity: pressed ? 0.7 : 1
                    }}>
                      <Text style={{
                        fontFamily: getSerifFont('600'),
                        fontSize: 14,
                        lineHeight: 20,
                        color: selectedIndex === index ? '#fff' : JianColors.ink2
                      }}>
                        {numberLabels[index] || `${index + 1}`} {art.title}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Tab bar: 原文 / 白話語譯 */}
          <View style={{
            flexDirection: 'row',
            gap: 22,
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: 11,
            borderBottomWidth: 1,
            borderBottomColor: JianColors.line
          }}>
            <Text style={{
              fontFamily: getSerifFont('600'),
              fontSize: 14,
              lineHeight: 20,
              color: JianColors.ink,
              borderBottomWidth: 2,
              borderBottomColor: JianColors.vermilion,
              paddingBottom: 6
            }}>
              原文
            </Text>
            <Text style={{
              fontFamily: getSerifFont('400'),
              fontSize: 14,
              lineHeight: 20,
              color: JianColors.ink3,
              paddingBottom: 6
            }}>
              白話語譯
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1, paddingHorizontal: 22, paddingTop: 13 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {hasNoContent ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{
                  fontFamily: getSerifFont('400'),
                  fontSize: 14,
                  lineHeight: 24,
                  color: JianColors.ink3,
                  textAlign: 'center'
                }}>
                  此文章內容暫時無法載入
                </Text>
              </View>
            ) : currentArticle ? (
              <>
                {/* Author/Source */}
                {currentArticle.source && (
                  <Text style={{
                    fontFamily: getSerifFont('400'),
                    fontSize: 12,
                    lineHeight: 18,
                    color: JianColors.ink3
                  }}>
                    {currentArticle.source}
                  </Text>
                )}

                {/* Article text */}
                <View style={{ marginTop: 8 }}>
                  <ArticleText
                    segments={currentArticle.segments}
                    footnotes={currentArticle.footnotes}
                    onFootnoteTap={() => {}}
                  />
                </View>

                {/* Footnotes */}
                {currentArticle.footnotes.length > 0 && (
                  <View style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTopWidth: 1,
                    borderTopColor: JianColors.line
                  }}>
                    <Text style={{
                      fontFamily: JianTypography.sans,
                      fontSize: 10,
                      letterSpacing: 2,
                      color: JianColors.ink3,
                      marginBottom: 10
                    }}>
                      註 釋
                    </Text>
                    <View style={{ gap: 11 }}>
                      {currentArticle.footnotes.map((fn) => (
                        <View key={fn.id} style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
                          <Text style={{
                            fontFamily: getSerifFont('700'),
                            fontSize: 13,
                            color: JianColors.vermilion,
                            flexShrink: 0
                          }}>
                            {fn.marker}
                          </Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontFamily: getSerifFont('400'),
                              fontSize: 14,
                              lineHeight: 24,
                              color: JianColors.ink2
                            }}>
                              <Text style={{ color: JianColors.ink, fontWeight: '600' }}>{fn.term}</Text>
                              　{fn.explanation}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>

          {/* Footer button */}
          <View style={{
            paddingHorizontal: 22,
            paddingTop: 12,
            paddingBottom: 22,
            borderTopWidth: 1,
            borderTopColor: JianColors.line
          }}>
            <Pressable onPress={onClose}>
              {({ pressed }) => (
                <View style={{
                  backgroundColor: JianColors.ink,
                  borderRadius: 6,
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: pressed ? 0.9 : 1
                }}>
                  <Text style={{
                    fontFamily: getSerifFont('600'),
                    fontSize: 16,
                    lineHeight: 24,
                    color: JianColors.paper
                  }}>
                    返回作答
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
