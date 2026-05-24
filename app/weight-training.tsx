import { View, Text, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

export default function WeightTrainingScreen() {
  const router = useRouter()

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 items-center justify-center px-8">
        <View className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-10 items-center w-full max-w-sm">
          <Text className="text-5xl mb-4">🏋️</Text>
          <Text
            className="text-xl font-bold text-slate-800 text-center mb-2"
            style={{ fontFamily: "Georgia" }}
          >
            文言用字訓練
          </Text>
          <Text className="text-sm text-slate-500 text-center mb-1">
            Weight Training
          </Text>
          <View className="h-px bg-slate-100 w-full my-4" />
          <Text className="text-sm text-slate-500 text-center leading-relaxed mb-6">
            針對文言文用字的專項訓練，橫跨多篇文章的詞義練習。
          </Text>
          <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 w-full items-center mb-6">
            <Text className="text-amber-700 font-semibold text-sm">🚧 即將推出</Text>
            <Text className="text-amber-600 text-xs mt-1 text-center">
              此功能正在開發中，敬請期待！
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            className="py-3 px-6 rounded-xl bg-slate-100 items-center active:opacity-70 w-full"
          >
            <Text className="text-slate-600 font-semibold text-sm">返回</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}
