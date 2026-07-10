import { View, Text, ScrollView, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { JianColors, JianTypography, getSerifFont } from "@/components/jian"

export default function TermsScreen() {
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
            服務條款
          </Text>
        </View>

        <View style={{ height: 2, backgroundColor: JianColors.ink, marginBottom: 22 }} />

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          1. 接受條款
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          使用本應用程式即表示您同意遵守本服務條款。如您不同意本條款，請勿使用本服務。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          2. 服務內容
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          本應用程式提供文言文學習相關內容及練習題目。我們保留隨時修改、暫停或終止服務的權利，恕不另行通知。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          3. 用戶帳戶
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          您有責任維護帳戶資料的保密性，並對在您帳戶下進行的所有活動負責。如發現任何未經授權使用您帳戶的情況，請立即通知我們。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          4. 知識產權
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          本應用程式的所有內容，包括但不限於文字、圖片、設計、軟件等，均受知識產權法保護。未經授權，不得複製、修改或分發。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          5. 免責聲明
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          本服務按「現狀」提供，不提供任何明示或暗示的保證。我們不對服務的準確性、可靠性或適用性作出保證。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          6. 責任限制
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          在法律允許的最大範圍內，我們不對因使用或無法使用本服務而產生的任何直接、間接、附帶或後果性損害承擔責任。
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 18, color: JianColors.ink, marginBottom: 12 }}>
          7. 條款修改
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 15, lineHeight: 26, color: JianColors.ink, marginBottom: 20 }}>
          我們保留隨時修改本服務條款的權利。修改後的條款將在應用程式內公布，繼續使用本服務即表示您接受修改後的條款。
        </Text>

        <Text style={{ fontFamily: JianTypography.sans, fontSize: 13, color: JianColors.ink3, marginTop: 24 }}>
          最後更新：2026年7月
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
