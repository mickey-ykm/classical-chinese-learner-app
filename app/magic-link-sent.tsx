import { View, Text, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter, useLocalSearchParams } from "expo-router"
import { JianColors, JianTypography, getSerifFont, Button } from "@/components/jian"
import Svg, { Rect, Path } from "react-native-svg"

function EmailIcon() {
  return (
    <View style={{
      width: 78,
      height: 78,
      borderRadius: 39,
      backgroundColor: JianColors.jadeTint,
      borderWidth: 1,
      borderColor: JianColors.jadeBorder,
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={JianColors.jade} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="5" width="18" height="14" rx="2.5" />
        <Path d="M3.5 7l8.5 6 8.5-6" />
      </Svg>
    </View>
  )
}

export default function MagicLinkSentScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const email = params.email as string || ""

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: JianColors.paper }}>
      {/* Back button */}
      <View style={{ paddingHorizontal: 30, paddingTop: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ fontFamily: JianTypography.serif, fontSize: 14, color: JianColors.vermilion }}>
            ‹ 返回
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 24 }}>
        <EmailIcon />

        <Text style={{ fontFamily: getSerifFont('700'), fontSize: 24, color: JianColors.ink, marginTop: 22, textAlign: 'center' }}>
          登入連結已寄出
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 14, lineHeight: 25, color: JianColors.ink2, marginTop: 11, textAlign: 'center' }}>
          我們已將登入連結寄至
        </Text>

        <Text style={{ fontFamily: getSerifFont('600'), fontSize: 16, color: JianColors.ink, marginTop: 4, textAlign: 'center' }}>
          {email}
        </Text>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, lineHeight: 23, color: JianColors.ink2, marginTop: 12, textAlign: 'center' }}>
          請於郵件中點擊連結，即可完成登入。連結 15 分鐘內有效。
        </Text>

        <View style={{ width: '100%', marginTop: 26 }}>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={() => {/* TODO: Open email app */}}
          >
            開啟郵件 App
          </Button>
        </View>

        <Text style={{ fontFamily: JianTypography.serif, fontSize: 13, color: JianColors.ink3, marginTop: 16, textAlign: 'center' }}>
          沒收到郵件？<Text style={{ color: JianColors.ink3 }}>59 秒後可重新發送</Text>
        </Text>
      </View>

      {/* Use different email button at bottom */}
      <View style={{ paddingHorizontal: 32, paddingBottom: 34, alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontFamily: JianTypography.serif, fontSize: 14, color: JianColors.ink2 }}>
            使用其他電郵地址
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
