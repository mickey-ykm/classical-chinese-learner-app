import { View, Text, ScrollView, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { JianColors, JianTypography, getSerifFont } from "@/components/jian"

export default function AboutScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 14, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ fontFamily: JianTypography.serif, fontSize: 28, color: JianColors.ink }}>
              ‹
            </Text>
          </Pressable>
          <Text style={{ fontFamily: getSerifFont('700'), fontSize: 31, lineHeight: 40, color: JianColors.ink, marginLeft: 14 }}>
            關於我們
          </Text>
        </View>

        <View style={{ height: 2, backgroundColor: JianColors.ink, marginBottom: 22 }} />

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, lineHeight: 28, color: JianColors.ink, marginBottom: 20 }}>
          Classical Chinese Learner 是一個專為香港中學文憑試（DSE）考生設計的文言文學習平台。
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, lineHeight: 28, color: JianColors.ink, marginBottom: 20 }}>
          我們的使命是透過科技輔助，讓學生更有效地掌握文言文閱讀理解能力，並在DSE中文科取得理想成績。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 20, color: JianColors.ink, marginTop: 12, marginBottom: 14 }}>
          核心功能
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, lineHeight: 28, color: JianColors.ink, marginBottom: 12 }}>
          • 精選DSE範文及經典文言文篇章
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, lineHeight: 28, color: JianColors.ink, marginBottom: 12 }}>
          • 針對性題目練習，覆蓋八大題型
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, lineHeight: 28, color: JianColors.ink, marginBottom: 12 }}>
          • 智能追蹤學習進度與弱項分析
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, lineHeight: 28, color: JianColors.ink, marginBottom: 12 }}>
          • 錯題自動收集與重溫功能
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 20, color: JianColors.ink, marginTop: 24, marginBottom: 14 }}>
          聯絡我們
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 16, lineHeight: 28, color: JianColors.ink }}>
          如有任何查詢或建議，歡迎透過電郵聯絡我們：
        </Text>

        <Text style={{ fontFamily: JianTypography.sans, fontSize: 16, lineHeight: 28, color: JianColors.vermilion, marginTop: 8 }}>
          support@classicalchinese.app
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
