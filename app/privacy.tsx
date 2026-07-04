import { View, Text, ScrollView, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { JianColors, JianTypography, getSerifFont } from "@/components/jian"

export default function PrivacyScreen() {
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
          <Text style={{ fontFamily: getSerifFont('700'), fontSize: 31, color: JianColors.ink, marginLeft: 14 }}>
            私隱政策
          </Text>
        </View>

        <View style={{ height: 2, backgroundColor: JianColors.ink, marginBottom: 22 }} />

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          1. 資料收集
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          我們收集您在註冊及使用服務時提供的資料，包括電郵地址及學習進度記錄。我們不會收集您的姓名或其他個人識別資料，除非您主動提供。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          2. 資料用途
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          我們使用您的資料來：
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 12 }}>
          • 提供及改善我們的服務
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 12 }}>
          • 記錄及追蹤您的學習進度
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 12 }}>
          • 分析您的學習表現及弱項
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          • 向您發送服務相關通知
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          3. 資料共享
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          我們不會向第三方出售、交易或轉讓您的個人資料。我們可能會與服務供應商（如雲端儲存服務）分享必要的資料，以提供及維護我們的服務。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          4. 資料安全
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          我們採用業界標準的安全措施來保護您的資料，包括加密傳輸及安全儲存。然而，互聯網傳輸方式並非絕對安全，我們無法保證資料的絕對安全。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          5. Cookie及追蹤技術
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          我們可能使用Cookie及類似技術來改善使用體驗及收集使用數據。您可以通過裝置設定選擇拒絕Cookie，但這可能影響部分功能的使用。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          6. 您的權利
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          您有權查閱、更正或刪除我們持有的您的個人資料。如需行使這些權利，請透過電郵聯絡我們。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          7. 政策修改
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          我們可能會不時更新本私隱政策。任何修改將在應用程式內公布，並在公布時生效。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          8. 聯絡我們
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 8 }}>
          如對本私隱政策有任何疑問，請聯絡：
        </Text>

        <Text style={{ fontFamily: JianTypography.sans, fontSize: 15, lineHeight: 26, color: JianColors.vermilion, marginBottom: 24 }}>
          support@classicalchinese.app
        </Text>

        <Text style={{ fontFamily: JianTypography.sans, fontSize: 13, color: JianColors.ink3, marginTop: 24 }}>
          最後更新：2026年7月
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
