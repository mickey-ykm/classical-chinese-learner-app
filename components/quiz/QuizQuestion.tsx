import { useEffect } from "react"
import { View, Text, Pressable } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated"
import type { Question, OptionKey } from "@/lib/types"
import { Mascot } from "@/components/Mascot"
import OptionButton from "./OptionButton"
import PartHeader from "./PartHeader"

interface Props {
  question: Question
  partTitle: string
  isFirstOfPart: boolean
  selectedOption: OptionKey | null
  revealAnswer: boolean
  waitingForNext: boolean
  isCorrect: boolean
  isLastQuestion: boolean
  onSelect: (key: OptionKey) => void
  onNext: () => void
}

export default function QuizQuestion({
  question,
  partTitle,
  isFirstOfPart,
  selectedOption,
  revealAnswer,
  waitingForNext,
  isCorrect,
  isLastQuestion,
  onSelect,
  onNext,
}: Props) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(24)
  const mascotScale = useSharedValue(0.5)

  useEffect(() => {
    if (waitingForNext) {
      opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) })
      translateY.value = withSpring(0, { damping: 18, stiffness: 180 })
      mascotScale.value = withSpring(1, { damping: 12, stiffness: 200 })
    } else {
      opacity.value = 0
      translateY.value = 24
      mascotScale.value = 0.5
    }
  }, [waitingForNext])

  const revealStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
  }))

  return (
    <View>
      {isFirstOfPart && (
        <PartHeader
          partNumber={question.part}
          title={partTitle}
          pointsPerQuestion={question.points}
        />
      )}
      <Text
        className="text-base font-semibold text-slate-800 mb-4 leading-relaxed"
        style={{ fontFamily: "Georgia" }}
      >
        {question.stem}
      </Text>
      <View className="gap-2">
        {(question.options ?? []).map((opt) => (
          <OptionButton
            key={opt.key}
            optionKey={opt.key}
            text={opt.text}
            isSelected={selectedOption === opt.key}
            isCorrect={question.correctAnswer === opt.key}
            revealAnswer={revealAnswer}
            disabled={revealAnswer || selectedOption !== null}
            onSelect={() => onSelect(opt.key)}
          />
        ))}
      </View>

      {waitingForNext && (
        <Animated.View style={revealStyle} className="mt-4 items-center gap-3">
          <Animated.View style={mascotStyle}>
            <Mascot mood={isCorrect ? "happy" : "sad"} size={90} />
          </Animated.View>

          {question.explanation ? (
            <View className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Text className="text-xs font-semibold text-amber-700 mb-1">解析</Text>
              <Text className="text-sm text-slate-700 leading-relaxed">
                {question.explanation}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={onNext}
            className="w-full py-3.5 rounded-xl bg-amber-500 items-center active:opacity-80 mt-1"
          >
            <Text className="text-white font-semibold text-base">
              {isLastQuestion ? "查看成績" : "下一題 →"}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  )
}
