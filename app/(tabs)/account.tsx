import { useEffect, useState } from "react"
import { View, Text, Pressable, Image, Alert, ScrollView, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { getArticleIndex, STANDARD_PART_TITLES } from "@/lib/data"
import { refresh as refreshContent, clearCacheAndResync } from "@/lib/contentStore"
import UpgradeModal from "@/components/UpgradeModal"
import { Button, JianColors, JianTypography, getSerifFont } from "@/components/jian"
import Svg, { Circle, Path } from "react-native-svg"

const API_URL = process.env.EXPO_PUBLIC_ADMIN_URL || "https://ccladmin.mickey-calligraphy.art"

interface RevisionSummary {
  overall: {
    totalMistakes: number
    weakestPart: number | null
    weakestPartCount: number
  }
}

function AccountIconLarge({ isPro }: { isPro: boolean }) {
  const color = isPro ? JianColors.vermilion : JianColors.ink2
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6">
      <Circle cx="12" cy="8" r="3.4" />
      <Path d="M5.5 19c0-3.7 2.9-5.7 6.5-5.7s6.5 2 6.5 5.7" />
    </Svg>
  )
}

export default function AccountScreen() {
  const router = useRouter()
  const { user, profile, signOut, loading, isAnonymous: isAnonymousCtx } = useAuth()
  const isAnonymous = isAnonymousCtx || !user?.email
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [upgradeVisible, setUpgradeVisible] = useState(false)
  const [revisionSummary, setRevisionSummary] = useState<RevisionSummary | null>(null)
  const [loadingRevision, setLoadingRevision] = useState(true)

  useEffect(() => {
    if (!user || isAnonymous) {
      setLoadingRevision(false)
      return
    }

    fetch(`${API_URL}/api/revision/summary?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setRevisionSummary(data)
        setLoadingRevision(false)
      })
      .catch(() => {
        setLoadingRevision(false)
      })
  }, [user, isAnonymous])

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="small" color={JianColors.amber} />
    </SafeAreaView>
  )

  async function handleSignOut() {
    try {
      await signOut()
      router.replace("/")
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "登出失敗，請再試一次"
      Alert.alert("錯誤", message)
    }
  }

  async function handleRefreshContent() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const { updated, errors } = await refreshContent()
      if (updated === 0) setSyncMsg("已是最新")
      else if (errors > 0) setSyncMsg(`已更新 ${updated} 篇，${errors} 篇有問題`)
      else setSyncMsg(`已更新 ${updated} 篇`)
    } catch {
      setSyncMsg("更新失敗，請稍後再試")
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 3000)
    }
  }

  async function handleClearCacheAndResync() {
    Alert.alert(
      "清除快取並重新同步",
      "這會刪除本地快取的所有文章，並從伺服器重新下載。確定要繼續嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "確定",
          style: "destructive",
          onPress: async () => {
            setSyncing(true)
            setSyncMsg(null)
            try {
              const { updated, errors } = await clearCacheAndResync()
              if (errors > 0) setSyncMsg(`已重新同步 ${updated} 篇，${errors} 篇有問題`)
              else setSyncMsg(`已重新同步 ${updated} 篇`)
            } catch {
              setSyncMsg("重新同步失敗，請稍後再試")
            } finally {
              setSyncing(false)
              setTimeout(() => setSyncMsg(null), 3000)
            }
          },
        },
      ]
    )
  }

  const displayName = isAnonymous ? "訪客" : (profile?.display_name ?? user?.email ?? "用戶")
  const isPro = !isAnonymous && (profile?.is_pro ?? false)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 14, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={{ fontFamily: getSerifFont('700'), fontSize: 31, color: JianColors.ink, marginBottom: 18 }}>
          帳戶
        </Text>

        {/* Profile Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{
            width: 50,
            height: 50,
            borderWidth: 1.5,
            borderColor: isPro ? JianColors.vermilion : JianColors.line,
            borderRadius: 25,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isPro ? JianColors.vermilionTint : JianColors.surface,
            flexShrink: 0
          }}>
            <AccountIconLarge isPro={isPro} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: getSerifFont('600'), fontSize: 17, color: JianColors.ink }}>
              {displayName}
            </Text>
            {!isAnonymous && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 12, color: JianColors.ink2 }}>
                  {user?.email}
                </Text>
                {isPro && (
                  <View style={{
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 3,
                    backgroundColor: JianColors.amberTint,
                    borderWidth: 1,
                    borderColor: JianColors.amberBorder
                  }}>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: 9, fontWeight: '600', color: JianColors.amber }}>
                      付費會員
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {isAnonymous && (
          <Button variant="primary" size="medium" onPress={() => router.push("/login")} style={{ marginTop: 16 }}>
            登入 / 建立帳戶
          </Button>
        )}

        {/* Analytics Section */}
        {!isAnonymous && !loadingRevision && revisionSummary && revisionSummary.overall.totalMistakes > 0 && (
          <View style={{ marginTop: 26 }}>
            <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3 }}>
              能 力 分 析
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 11 }}>
              <Text style={{ fontFamily: getSerifFont('700'), fontSize: 22, color: JianColors.ink }}>
                最弱 ·
              </Text>
              <Text style={{ fontFamily: getSerifFont('700'), fontSize: 22, color: JianColors.vermilion }}>
                {revisionSummary.overall.weakestPart ? STANDARD_PART_TITLES[revisionSummary.overall.weakestPart] : '---'}
              </Text>
              <Text style={{ fontFamily: JianTypography.number, fontSize: 18, color: JianColors.amber, marginLeft: 'auto' }}>
                {revisionSummary.overall.weakestPartCount}題
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, color: JianColors.ink2 }}>
                累計失誤 {revisionSummary.overall.totalMistakes} 題
              </Text>
              <Pressable onPress={() => router.push("/revision")} hitSlop={8}>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, color: JianColors.vermilion }}>
                  詳細報告 →
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Exercise History Button */}
        {!isAnonymous && (
          <Pressable onPress={() => router.push("/exercise-history")} style={{ marginTop: 26 }}>
            {({ pressed }) => (
              <View style={{
                paddingVertical: 16,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: JianColors.line,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.7 : 1
              }}>
                <View>
                  <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink }}>
                    所有練習紀錄
                  </Text>
                  <Text style={{ fontFamily: JianTypography.sans, fontSize: 12, color: JianColors.ink2, marginTop: 3 }}>
                    查看完整練習歷史
                  </Text>
                </View>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 24, color: JianColors.ink3 }}>
                  ›
                </Text>
              </View>
            )}
          </Pressable>
        )}

        {/* Sync Section */}
        <View style={{ marginTop: 32 }}>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3, marginBottom: 12 }}>
            內 容 同 步
          </Text>

          <Pressable onPress={handleRefreshContent} disabled={syncing}>
            {({ pressed }) => (
              <View style={{
                paddingVertical: 14,
                alignItems: 'center',
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: JianColors.line,
                opacity: pressed ? 0.7 : syncing ? 0.5 : 1
              }}>
                {syncing ? (
                  <ActivityIndicator size="small" color={JianColors.amber} />
                ) : (
                  <>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: 14, fontWeight: '600', color: JianColors.amber }}>
                      {syncMsg ?? "檢查更新"}
                    </Text>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, color: JianColors.ink3, marginTop: 2 }}>
                      增量同步（推薦）
                    </Text>
                  </>
                )}
              </View>
            )}
          </Pressable>

          <Pressable onPress={handleClearCacheAndResync} disabled={syncing} style={{ marginTop: 12 }}>
            {({ pressed }) => (
              <View style={{
                paddingVertical: 14,
                alignItems: 'center',
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: JianColors.line,
                opacity: pressed ? 0.7 : syncing ? 0.5 : 1
              }}>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 14, fontWeight: '600', color: JianColors.vermilion }}>
                  清除快取並重新同步
                </Text>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, color: JianColors.ink3, marginTop: 2 }}>
                  完整重新下載（修復用）
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Sign Out */}
        {!isAnonymous && (
          <Pressable onPress={handleSignOut} style={{ marginTop: 26 }}>
            {({ pressed }) => (
              <View style={{
                paddingVertical: 14,
                alignItems: 'center',
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: JianColors.line,
                opacity: pressed ? 0.7 : 1
              }}>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 14, fontWeight: '600', color: JianColors.ink2 }}>
                  登出
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </ScrollView>

      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
    </SafeAreaView>
  )
}
