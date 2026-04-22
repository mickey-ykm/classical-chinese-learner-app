import { View, Text } from "react-native"
import type { Question, OptionKey } from "@/lib/types"
import OptionButton from "./OptionButton"
import PartHeader from "./PartHeader"

interface Props {
  question: Question
  partTitle: string
  isFirstOfPart: boolean
  selectedOption: OptionKey | null
  revealAnswer: boolean
  onSelect: (key: OptionKey) => void
}

export default function QuizQuestion({
  question,
  partTitle,
  isFirstOfPart,
  selectedOption,
  revealAnswer,
  onSelect,
}: Props) {
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
        Q{question.id}. {question.stem}
      </Text>
      <View className="gap-2">
        {question.options.map((opt) => (
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
      {revealAnswer && question.explanation ? (
        <View className="mt-3 bg-slate-50 rounded-lg px-3 py-2">
          <Text className="text-xs text-slate-500 leading-relaxed">{question.explanation}</Text>
        </View>
      ) : null}
    </View>
  )
}
