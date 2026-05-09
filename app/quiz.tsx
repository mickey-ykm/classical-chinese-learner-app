import { View, Text, Pressable, ScrollView } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { getAllQuestions, getPartTitles, getArticleIndex, isArticleFree } from "@/lib/data"
import { useAuth } from "@/hooks/useAuth"
import UpgradeModal from "@/components/UpgradeModal"
import QuizShell from "@/components/quiz/QuizShell"

export default function QuizScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { profile } = useAuth()

  const isPro = profile?.is_pro ?? false
  const gated = !isArticleFree(id) && !isPro

  if (gated) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <UpgradeModal visible={true} onClose={() => router.back()} />
      </SafeAreaView>
    )
  }

  const questions = getAllQuestions(id)
  const partTitles = getPartTitles(id)
  const expectedMinutes = getArticleIndex().find((a) => a.id === id)?.expectedMinutes

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-5" contentContainerClassName="py-8">
        <Pressable onPress={() => router.back()} className="mb-6" hitSlop={12}>
          <Text className="text-sm text-slate-400">← 返回</Text>
        </Pressable>

        <Text className="text-lg font-bold text-slate-800 mb-6">閱讀理解測驗</Text>

        <QuizShell questions={questions} partTitles={partTitles} articleId={id} expectedMinutes={expectedMinutes} />
      </ScrollView>
    </SafeAreaView>
  )
}
