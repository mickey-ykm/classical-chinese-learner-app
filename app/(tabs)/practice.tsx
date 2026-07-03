import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Card, Button, JianColors, JianTypography, JianSpacing, getSerifFont } from "@/components/jian"

export default function PracticeTab() {
  const router = useRouter()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: getSerifFont('700'), fontSize: JianTypography.title, color: JianColors.ink }}>
            操練
          </Text>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink2, marginTop: 4 }}>
            重點操練，全面備試。
          </Text>
        </View>

        {/* DSE Mock Exam - Primary Card */}
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <Pressable onPress={() => router.push("/(tabs)/dse-training?mode=mock")}>
            {({ pressed }) => (
              <Card variant="ink" style={{ opacity: pressed ? 0.9 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: getSerifFont('700'), fontSize: JianTypography.heading, color: JianColors.paper, lineHeight: 24 }}>
                      DSE 模擬考題
                    </Text>
                    <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3, marginTop: 4 }}>
                      隨機抽選 2-3 篇 · 22 題/篇
                    </Text>
                  </View>
                  {/* Placeholder for mascot icon */}
                  <View style={{ width: 48, height: 48, backgroundColor: '#1a1614', borderRadius: 24 }} />
                </View>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink3, lineHeight: 20, marginBottom: 16 }}>
                  每次隨機組合，模擬真實考試節奏，完成後自動記錄。
                </Text>
                <Button variant="primary" size="medium" fullWidth onPress={() => router.push("/(tabs)/dse-training?mode=mock")}>
                  開始模擬
                </Button>
              </Card>
            )}
          </Pressable>
        </View>

        {/* Article Mistakes Review */}
        <Pressable onPress={() => router.push("/revision-article")} style={{ marginHorizontal: 24, marginTop: 12 }}>
          {({ pressed }) => (
            <Card variant="default" style={{ opacity: pressed ? 0.7 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Placeholder for icon */}
                <View style={{ width: 48, height: 48, backgroundColor: JianColors.vermilionTint, borderRadius: 24, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: getSerifFont('600'), fontSize: JianTypography.body, color: JianColors.ink }}>
                    文章錯題重溫
                  </Text>
                  <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink2, marginTop: 2 }}>
                    按文章分類 · 針對薄弱篇章
                  </Text>
                </View>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.heading, color: JianColors.vermilion }}>›</Text>
              </View>
            </Card>
          )}
        </Pressable>

        {/* Grammar Basics Mistakes Review */}
        <Pressable onPress={() => router.push("/revision-part")} style={{ marginHorizontal: 24, marginTop: 12 }}>
          {({ pressed }) => (
            <Card variant="default" style={{ opacity: pressed ? 0.7 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Placeholder for icon */}
                <View style={{ width: 48, height: 48, backgroundColor: JianColors.jadeTint, borderRadius: 24, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: getSerifFont('600'), fontSize: JianTypography.body, color: JianColors.ink }}>
                    語基能力錯題重溫
                  </Text>
                  <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink2, marginTop: 2 }}>
                    按題型分類 · 一詞多義 · 句式等
                  </Text>
                </View>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.heading, color: JianColors.vermilion }}>›</Text>
              </View>
            </Card>
          )}
        </Pressable>

        {/* Weight Training */}
        <Pressable onPress={() => router.push("/weight-training")} style={{ marginHorizontal: 24, marginTop: 12 }}>
          {({ pressed }) => (
            <Card variant="default" style={{ opacity: pressed ? 0.7 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Placeholder for icon */}
                <View style={{ width: 48, height: 48, backgroundColor: JianColors.amberTint, borderRadius: 24, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: getSerifFont('600'), fontSize: JianTypography.body, color: JianColors.ink }}>
                    針對性難題訓練
                  </Text>
                  <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.ink2, marginTop: 2 }}>
                    跨文章 Part 7 & 8 專項
                  </Text>
                </View>
                <Text style={{ fontFamily: JianTypography.serif, fontSize: JianTypography.heading, color: JianColors.vermilion }}>›</Text>
              </View>
            </Card>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
