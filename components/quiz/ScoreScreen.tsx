import { View, Text, Pressable, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import type { Question, QuizAnswer } from "@/lib/types"
import { calculateScore, getPartScore } from "@/lib/quiz"
import { getNextQuizId, getArticleIndex, STANDARD_PART_TITLES } from "@/lib/data"
import { Mascot } from "@/components/Mascot"
import { Card, Button, JianColors, JianTypography, JianSpacing, getSerifFont } from "@/components/jian"

interface Props {
  questions: Question[]
  answers: Record<number, QuizAnswer>
  partTitles: Record<number, string>
  articleId: string
  onRestart: () => void
  onExit?: () => void
}

export default function ScoreScreen({ questions, answers, partTitles, articleId, onRestart, onExit }: Props) {
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
      : "再接再厵！"

  const parts = [...new Set(questions.map((q) => q.part))].sort() as (1 | 2 | 3 | 4)[]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: JianColors.paper }} contentContainerStyle={{ alignItems: 'center', gap: 24, paddingVertical: 24, paddingHorizontal: 20 }}>
      <Mascot mood={percentage >= 60 ? "happy" : "sad"} size={110} />

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontFamily: JianTypography.number, fontSize: 48, fontWeight: '700', color: JianColors.ink }}>
          {percentage}%
        </Text>
        <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, color: JianColors.ink2 }}>
          {earned} / {total} 分
        </Text>
        <Text style={{ fontFamily: getSerifFont('500'), fontSize: JianTypography.body, color: JianColors.amber, marginTop: 4 }}>
          {message}
        </Text>
      </View>

      <Card variant="default" style={{ width: '100%' }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: JianColors.surface2 }}>
          <Text style={{ flex: 1, fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: '500', color: JianColors.ink2 }}>
            部分
          </Text>
          <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.bodySmall, fontWeight: '500', color: JianColors.ink2 }}>
            得分
          </Text>
        </View>
        {parts.map((part, idx) => {
          const { earned: pe, total: pt } = getPartScore(part, questions, answers)
          return (
            <View
              key={part}
              style={{
                flexDirection: 'row',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderTopWidth: idx > 0 ? 1 : 0,
                borderTopColor: JianColors.line
              }}
            >
              <Text style={{ flex: 1, fontFamily: JianTypography.serif, fontSize: JianTypography.bodySmall, color: JianColors.ink }}>
                {partTitles[part] ?? STANDARD_PART_TITLES[part] ?? `第${part}部分`}
              </Text>
              <Text style={{ fontFamily: JianTypography.number, fontSize: JianTypography.bodySmall, fontWeight: '500', color: JianColors.ink }}>
                {pe} / {pt}
              </Text>
            </View>
          )
        })}
      </Card>

      <View style={{ width: '100%', gap: 12 }}>
        {nextTitle && (
          <Pressable onPress={() => router.replace({ pathname: "/read", params: { id: nextQuizId! } })}>
            {({ pressed }) => (
              <View style={{
                width: '100%',
                paddingVertical: 14,
                borderRadius: 11,
                backgroundColor: JianColors.vermilion,
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1
              }}>
                <Text style={{ fontFamily: getSerifFont('600'), fontSize: JianTypography.body, color: JianColors.paper }}>
                  下一課 →
                </Text>
                <Text style={{ fontFamily: JianTypography.sans, fontSize: JianTypography.caption, color: JianColors.surface2, marginTop: 2 }}>
                  {nextTitle}
                </Text>
              </View>
            )}
          </Pressable>
        )}
        <Button variant="outline" size="large" fullWidth onPress={onRestart}>
          重新挑戰
        </Button>
        <Button variant="outline" size="large" fullWidth onPress={() => onExit ? onExit() : router.push("/")}>
          返回
        </Button>
      </View>
    </ScrollView>
  )
}
