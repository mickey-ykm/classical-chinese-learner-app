import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

export default function PracticeTab() {
  const router = useRouter()

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="text-2xl font-bold text-slate-800" style={{ fontFamily: "Georgia" }}>
            操練
          </Text>
          <Text className="text-xs text-slate-600 mt-1">
            重點操練，全面備試。
          </Text>
        </View>

        {/* DSE Mock Exam - Primary Card */}
        <View className="px-6 mt-5">
          <Pressable
            className="bg-slate-800 rounded-2xl p-5 active:opacity-90"
            onPress={() => router.push("/(tabs)/dse-training?mode=mock")}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1">
                <Text className="text-lg font-bold text-white leading-snug" style={{ fontFamily: "Georgia" }}>
                  DSE 模擬考題
                </Text>
                <Text className="text-xs text-slate-400 mt-1">
                  隨機抽選 2-3 篇 · 22 題/篇
                </Text>
              </View>
              {/* Placeholder for mascot icon */}
              <View className="w-12 h-12 bg-slate-700 rounded-full" />
            </View>
            <Text className="text-xs text-slate-400 leading-5 mb-4">
              每次隨機組合，模擬真實考試節奏，完成後自動記錄。
            </Text>
            <View className="bg-amber-500 rounded-xl py-3">
              <Text className="text-center text-white font-semibold" style={{ fontFamily: "Georgia" }}>
                開始模擬
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Article Mistakes Review */}
        <Pressable
          className="mx-6 mt-3 bg-white rounded-2xl p-4 border border-slate-200 flex-row items-center active:opacity-70"
          onPress={() => router.push("/revision-article")}
        >
          {/* Placeholder for icon */}
          <View className="w-12 h-12 bg-amber-100 rounded-full mr-3" />
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-800" style={{ fontFamily: "Georgia" }}>
              文章錯題重溫
            </Text>
            <Text className="text-xs text-slate-600 mt-1">
              按文章分類 · 針對薄弱篇章
            </Text>
          </View>
          <Text className="text-amber-500 text-lg">›</Text>
        </Pressable>

        {/* Grammar Basics Mistakes Review */}
        <Pressable
          className="mx-6 mt-3 bg-white rounded-2xl p-4 border border-slate-200 flex-row items-center active:opacity-70"
          onPress={() => router.push("/revision-part")}
        >
          {/* Placeholder for icon */}
          <View className="w-12 h-12 bg-blue-100 rounded-full mr-3" />
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-800" style={{ fontFamily: "Georgia" }}>
              語基能力錯題重溫
            </Text>
            <Text className="text-xs text-slate-600 mt-1">
              按題型分類 · 一詞多義 · 句式等
            </Text>
          </View>
          <Text className="text-amber-500 text-lg">›</Text>
        </Pressable>

        {/* Weight Training */}
        <Pressable
          className="mx-6 mt-3 bg-white rounded-2xl p-4 border border-slate-200 flex-row items-center active:opacity-70"
          onPress={() => router.push("/weight-training")}
        >
          {/* Placeholder for icon */}
          <View className="w-12 h-12 bg-slate-100 rounded-full mr-3" />
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-800" style={{ fontFamily: "Georgia" }}>
              針對性難題訓練
            </Text>
            <Text className="text-xs text-slate-600 mt-1">
              跨文章 Part 7 & 8 專項
            </Text>
          </View>
          <Text className="text-amber-500 text-lg">›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
