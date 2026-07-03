import { useEffect } from "react"
import { View, Text, Pressable } from "react-native"
import Svg, { Path, Line } from "react-native-svg"
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
  onShowArticle?: () => void
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
  onShowArticle,
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
      {/* Question info card with "查看原文" button */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        backgroundColor: '#faf5ea',
        borderWidth: 1,
        borderColor: '#e7ddc9',
        borderRadius: 8,
        paddingVertical: 9,
        paddingLeft: 14,
        paddingRight: 10,
        marginBottom: 11
      }}>
        <Text style={{
          fontFamily: "Georgia",
          fontSize: 13,
          color: '#6f665a'
        }}>
          {partTitle}
        </Text>
        {onShowArticle && (
          <Pressable
            onPress={onShowArticle}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: '#fdfbf6',
              borderWidth: 1,
              borderColor: '#e5c9c2',
              borderRadius: 7,
              paddingVertical: 6,
              paddingHorizontal: 11,
              shadowColor: '#2c2722',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2
            }}
            className="active:opacity-70"
          >
            <Svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b0392c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 6.5C10.4 5.3 8 4.5 5 4.5V17c3 0 5.4.8 7 2 1.6-1.2 4-2 7-2V4.5c-3 0-5.4.8-7 2z" />
              <Line x1="12" y1="6.5" x2="12" y2="19" />
            </Svg>
            <Text style={{
              fontFamily: "Georgia",
              fontSize: 12,
              fontWeight: '600',
              color: '#b0392c'
            }}>
              查看原文
            </Text>
          </Pressable>
        )}
      </View>
      <Text
        style={{
          fontFamily: "Georgia",
          fontSize: 18,
          lineHeight: 18 * 1.7,
          color: "#2c2722",
          marginTop: 11,
          marginBottom: waitingForNext ? 16 : 8
        }}
      >
        {question.stem}
      </Text>
      {!waitingForNext && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
          <Mascot mood="thinking" size={52} />
        </View>
      )}
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
        <Animated.View style={revealStyle} className="mt-4">
          {question.explanation ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ flexShrink: 0 }}>
                <Animated.View style={mascotStyle}>
                  <Mascot mood={isCorrect ? "happy" : "sad"} size={52} />
                </Animated.View>
              </View>
              <View style={{
                flex: 1,
                paddingLeft: 14,
                borderLeftWidth: 2,
                borderLeftColor: '#b0392c'
              }}>
                <Text style={{
                  fontFamily: 'Noto Sans TC',
                  fontSize: 11,
                  letterSpacing: 0.16 * 11,
                  color: '#b0392c',
                  marginBottom: 6
                }}>
                  解析
                </Text>
                <Text style={{
                  fontFamily: "Georgia",
                  fontSize: 14,
                  lineHeight: 14 * 1.8,
                  color: '#6f665a'
                }}>
                  {question.explanation}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Animated.View style={mascotStyle}>
                <Mascot mood={isCorrect ? "happy" : "sad"} size={90} />
              </Animated.View>
            </View>
          )}

          <Pressable
            onPress={onNext}
            style={{
              width: '100%',
              paddingVertical: 13,
              borderRadius: 6,
              backgroundColor: '#2c2722',
              alignItems: 'center',
              marginTop: 18
            }}
            className="active:opacity-80"
          >
            <Text style={{
              fontFamily: "Georgia",
              color: '#f4f0e6',
              fontSize: 16
            }}>
              {isLastQuestion ? "查看成績" : "下一題　›"}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  )
}
