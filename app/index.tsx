import { ScrollView, View, Text, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { getArticleIndex } from "@/lib/data"

export default function HomeScreen() {
  const router = useRouter()
  const articles = getArticleIndex()

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5" contentContainerClassName="py-10">
        <View className="mb-8">
          <Text className="text-xs tracking-widest text-slate-400 uppercase mb-1">文言文學習</Text>
          <Text className="text-2xl font-bold text-slate-800">選擇文章</Text>
        </View>

        <View className="gap-4">
          {articles.map((article) => (
            <View
              key={article.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <View className="px-5 pt-5 pb-4">
                <Text
                  className="text-lg font-bold text-slate-800 leading-snug mb-1"
                  style={{ fontFamily: "Georgia" }}
                >
                  {article.title}
                </Text>
                <Text className="text-xs text-slate-400 mb-4">{article.source}</Text>
                <Text className="text-xs text-slate-400 mb-4">
                  共 {article.totalQuestions} 題 · {article.totalPoints} 分
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => router.push({ pathname: "/read", params: { id: article.id } })}
                    className="flex-1 py-3 rounded-xl bg-amber-500 items-center active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-sm">閱讀文章</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push({ pathname: "/quiz", params: { id: article.id } })}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 bg-white items-center active:opacity-80"
                  >
                    <Text className="text-slate-700 font-semibold text-sm">開始測驗</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
