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
        <Text style={{ fontFamily: getSerifFont('700'), fontSize: 31, lineHeight: 40, color: JianColors.ink, marginBottom: 18 }}>
          帳戶
        </Text>

        {isAnonymous ? (
          <>
            {/* Free Registration Module */}
            <View style={{ marginBottom: 28 }}>
              <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3, marginBottom: 12 }}>
                免 費 註 冊
              </Text>
              <Text style={{ fontFamily: getSerifFont('700'), fontSize: 24, color: JianColors.ink, marginBottom: 10 }}>
                記錄你的
              </Text>
              <Text style={{ fontFamily: getSerifFont('700'), fontSize: 24, color: JianColors.ink, marginBottom: 14 }}>
                學習進度
              </Text>
              <Text style={{ fontFamily: JianTypography.serif, fontSize: 14, lineHeight: 22, color: JianColors.ink2, marginBottom: 18 }}>
                登入後記錄每次答題、追蹤最弱項，並獲每日個人化課業推薦。只需電郵，免輸入姓名。
              </Text>
              <Button variant="primary" size="medium" onPress={() => router.push("/login")}>
                免費註冊｜登入 →
              </Button>
            </View>

            {/* Promotional Features Module */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3, marginBottom: 12 }}>
                註 冊 後 解 鎖
              </Text>

              {/* Feature 1 */}
              <View style={{ paddingVertical: 18, borderBottomWidth: 1, borderColor: JianColors.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink }}>
                    文言文能力分析
                  </Text>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 4,
                    backgroundColor: JianColors.amberTint,
                    borderWidth: 1,
                    borderColor: JianColors.amberBorder
                  }}>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: 10, color: JianColors.amber }}>
                      🔒 鎖定
                    </Text>
                  </View>
                </View>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 13, color: JianColors.ink3 }}>
                  八大題型＋語基弱項追蹤
                </Text>
              </View>

              {/* Feature 2 */}
              <View style={{ paddingVertical: 18, borderBottomWidth: 1, borderColor: JianColors.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink }}>
                    錯題自動收集重溫
                  </Text>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 4,
                    backgroundColor: JianColors.amberTint,
                    borderWidth: 1,
                    borderColor: JianColors.amberBorder
                  }}>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: 10, color: JianColors.amber }}>
                      🔒 鎖定
                    </Text>
                  </View>
                </View>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 13, color: JianColors.ink3 }}>
                  按文章／題型分類
                </Text>
              </View>

              {/* Feature 3 */}
              <View style={{ paddingVertical: 18, borderBottomWidth: 1, borderColor: JianColors.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink }}>
                    每日個人化課業
                  </Text>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 4,
                    backgroundColor: JianColors.amberTint,
                    borderWidth: 1,
                    borderColor: JianColors.amberBorder
                  }}>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: 10, color: JianColors.amber }}>
                      🔒 鎖定
                    </Text>
                  </View>
                </View>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 13, color: JianColors.ink3 }}>
                  針對最弱項自動推薦
                </Text>
              </View>
            </View>
          </>
        ) : (
          <>
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
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, color: JianColors.ink3, marginTop: 2 }}>
                  免費版 · 以電郵登入
                </Text>
              </View>
            </View>

            {/* Border line after profile */}
            <View style={{ height: 2, backgroundColor: JianColors.ink, marginTop: 18, marginBottom: 22 }} />

            {/* Stats Row - Placeholder */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 26 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: getSerifFont('700'), fontSize: 32, color: JianColors.ink }}>82%</Text>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 12, color: JianColors.ink3, marginTop: 4 }}>平均準確</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: getSerifFont('700'), fontSize: 32, color: JianColors.ink }}>19</Text>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 12, color: JianColors.ink3, marginTop: 4 }}>累計練習</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: getSerifFont('700'), fontSize: 32, color: JianColors.ink }}>6</Text>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: 12, color: JianColors.ink3, marginTop: 4 }}>連續天數</Text>
              </View>
            </View>
          </>
        )}

        {/* Analytics Section */}
        {!isAnonymous && !loadingRevision && revisionSummary && revisionSummary.overall.totalMistakes > 0 && (
          <View style={{ marginBottom: 26 }}>
            <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3 }}>
              能 力 分 析
            </Text>
            <View style={{ marginTop: 11 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontFamily: getSerifFont('700'), fontSize: 22, color: JianColors.ink }}>
                    最弱 ·
                  </Text>
                  <Text style={{ fontFamily: getSerifFont('700'), fontSize: 22, color: JianColors.vermilion, marginTop: 4 }}>
                    {revisionSummary.overall.weakestPart ? STANDARD_PART_TITLES[revisionSummary.overall.weakestPart] : '---'}
                  </Text>
                </View>
                <Text style={{ fontFamily: JianTypography.number, fontSize: 18, color: JianColors.amber }}>
                  {revisionSummary.overall.weakestPartCount}題
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, color: JianColors.ink2 }}>
                  累計失誤 {revisionSummary.overall.totalMistakes} 題
                </Text>
                <Pressable onPress={() => router.push("/performance-report")} hitSlop={8}>
                  <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, color: JianColors.vermilion }}>
                    詳細報告 →
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Exercise History Button */}
        {!isAnonymous && (
          <Pressable onPress={() => router.push("/exercise-history")} style={{ marginBottom: 26 }}>
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

        {/* Subscription Promotion Card - Placeholder */}
        {!isAnonymous && !isPro && (
          <Pressable onPress={() => {/* TODO: Navigate to subscription */}} style={{ marginBottom: 26 }}>
            {({ pressed }) => (
              <View style={{
                backgroundColor: JianColors.ink,
                borderRadius: 11,
                padding: 20,
                opacity: pressed ? 0.9 : 1
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: getSerifFont('700'), fontSize: 18, color: JianColors.paper }}>
                      升級付費版
                    </Text>
                    <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, color: JianColors.ink3, marginTop: 6 }}>
                      解鎖全部 26 篇與難題訓練
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: JianColors.amber,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 6
                  }}>
                    <Text style={{ fontFamily: getSerifFont('600'), fontSize: 15, color: JianColors.ink }}>
                      升級
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Pressable>
        )}

        {/* Settings Section */}
        <View style={{ marginTop: isAnonymous ? 0 : 32 }}>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: 11, letterSpacing: 2, color: JianColors.ink3, marginBottom: 12 }}>
            {isAnonymous ? '設 定' : '內 容 同 步'}
          </Text>

          <Pressable onPress={handleRefreshContent} disabled={syncing}>
            {({ pressed }) => (
              <View style={{
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderColor: JianColors.line,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.7 : syncing ? 0.5 : 1
              }}>
                {syncing ? (
                  <ActivityIndicator size="small" color={JianColors.amber} />
                ) : (
                  <>
                    <View>
                      <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, color: JianColors.ink }}>
                        檢查更新
                      </Text>
                      <Text style={{ fontFamily: JianTypography.sans, fontSize: 12, color: JianColors.ink3, marginTop: 2 }}>
                        {syncMsg ?? "增量同步（推薦）"}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: JianTypography.serif, fontSize: 14, color: JianColors.vermilion }}>
                      執行→
                    </Text>
                  </>
                )}
              </View>
            )}
          </Pressable>

          <Pressable onPress={handleClearCacheAndResync} disabled={syncing}>
            {({ pressed }) => (
              <View style={{
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderColor: JianColors.line,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.7 : syncing ? 0.5 : 1
              }}>
                <View>
                  <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, color: JianColors.ink }}>
                    清除快取並重新同步
                  </Text>
                  <Text style={{ fontFamily: JianTypography.sans, fontSize: 12, color: JianColors.ink3, marginTop: 2 }}>
                    完整重新下載
                  </Text>
                </View>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 24, color: JianColors.ink3 }}>
                  →
                </Text>
              </View>
            )}
          </Pressable>

          {/* About Us */}
          <Pressable onPress={() => router.push("/about")}>
            {({ pressed }) => (
              <View style={{
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderColor: JianColors.line,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.7 : 1
              }}>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, color: JianColors.ink }}>
                  關於我們
                </Text>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 24, color: JianColors.ink3 }}>
                  →
                </Text>
              </View>
            )}
          </Pressable>

          {/* Terms of Service */}
          <Pressable onPress={() => router.push("/terms")}>
            {({ pressed }) => (
              <View style={{
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderColor: JianColors.line,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.7 : 1
              }}>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, color: JianColors.ink }}>
                  服務條款
                </Text>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 24, color: JianColors.ink3 }}>
                  →
                </Text>
              </View>
            )}
          </Pressable>

          {/* Privacy Policy */}
          <Pressable onPress={() => router.push("/privacy")}>
            {({ pressed }) => (
              <View style={{
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderColor: JianColors.line,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.7 : 1
              }}>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, color: JianColors.ink }}>
                  私隱政策
                </Text>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: 24, color: JianColors.ink3 }}>
                  →
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
                paddingVertical: 16,
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
