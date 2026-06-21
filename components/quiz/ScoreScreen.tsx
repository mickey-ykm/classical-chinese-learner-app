import { View, Text, Pressable, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import type { Question, QuizAnswer } from "@/lib/types"
import { calculateScore, getPartScore } from "@/lib/quiz"
import { getNextQuizId, getArticleIndex, STANDARD_PART_TITLES } from "@/lib/data"
import { Mascot } from "@/components/Mascot"

interface Props {
  questions: Question[]
  answers: Record<number, QuizAnswer>
  partTitles: Record<number, string>
  articleId: string
  onRestart: () => void
}

export default function ScoreScreen({ questions, answers, partTitles, articleId, onRestart }: Props) {
  const router = useRouter()
  const { earned, total, percentage } = calculateScore(questions, answers)

  const nextQuizId = getNextQuizId(articleId)
  const nextTitle = nextQuizId
    ? getArticleIndex().find((a) => a.id === nextQuizId)?.title ?? "下一課"
    : null

  const message =
    percentage >= 80
      ? "出色！文言功底深厚！"
      : percentage >= 60
      ? "不錯！繼續努力！"
      : percentage >= 40
      ? "加油！多讀原文！"
      : "再接再厲！"

  const parts = [...new Set(questions.map((q) => q.part))].sort() as (1 | 2 | 3 | 4)[]

  return (
    <ScrollView className="flex-1" contentContainerClassName="items-center gap-6 py-6 px-5">
      <Mascot mood={percentage >= 60 ? "happy" : "sad"} size={110} />

      <View className="items-center gap-1">
        <Text className="text-4xl font-bold text-slate-800">{percentage}%</Text>
        <Text className="text-slate-500 text-sm">
          {earned} / {total} 分
        </Text>
        <Text className="text-amber-700 font-medium mt-1">{message}</Text>
      </View>

      <View className="w-full border border-slate-100 rounded-xl overflow-hidden">
        <View className="bg-slate-50 flex-row px-4 py-2">
          <Text className="flex-1 text-slate-500 font-medium text-sm">部分</Text>
          <Text className="text-slate-500 font-medium text-sm">得分</Text>
        </View>
        {parts.map((part) => {
          const { earned: pe, total: pt } = getPartScore(part, questions, answers)
          return (
            <View key={part} className="flex-row px-4 py-2 border-t border-slate-100">
              <Text className="flex-1 text-slate-700 text-sm">
                {partTitles[part] ?? STANDARD_PART_TITLES[part] ?? `第${part}部分`}
              </Text>
              <Text className="font-medium text-slate-800 text-sm">{pe} / {pt}</Text>
            </View>
          )
        })}
      </View>

      <View className="w-full gap-3">
        {nextTitle && (
          <Pressable
            onPress={() => router.replace({ pathname: "/read", params: { id: nextQuizId! } })}
            className="w-full py-3.5 rounded-xl bg-amber-500 items-center active:opacity-80"
          >
            <Text className="text-white font-semibold text-base">下一課 →</Text>
            <Text className="text-amber-100 text-xs mt-0.5">{nextTitle}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onRestart}
          className="w-full py-3.5 rounded-xl border-2 border-slate-200 items-center active:opacity-80"
        >
          <Text className="text-slate-700 font-semibold text-base">重新挑戰</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/")}
          className="w-full py-3.5 rounded-xl border-2 border-slate-200 items-center active:opacity-80"
        >
          <Text className="text-slate-700 font-semibold text-base">返回主頁</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
