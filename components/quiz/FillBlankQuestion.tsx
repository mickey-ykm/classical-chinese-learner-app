import React, { useState } from "react"
import { View, Text, TextInput, Pressable } from "react-native"
import type { Question, QuizAnswer } from "@/lib/types"
import PartHeader from "./PartHeader"

interface Props {
  question: Question
  partTitle: string
  isFirstOfPart: boolean
  isLastQuestion: boolean
  revealAnswer: boolean
  isCorrect: boolean
  onAnswer: (result: QuizAnswer) => void
  onNext: () => void
}

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[。，、；：！？]/g, "")
}

export default function FillBlankQuestion({
  question,
  partTitle,
  isFirstOfPart,
  isLastQuestion,
  revealAnswer,
  isCorrect,
  onAnswer,
  onNext,
}: Props) {
  const [input, setInput] = useState("")

  const acceptedAnswers = question.correctAnswer.split("|").map(normalise)

  function handleSubmit() {
    if (revealAnswer) return
    const correct = acceptedAnswers.includes(normalise(input))
    onAnswer({
      questionId: question.id,
      selectedOption: null,
      isCorrect: correct,
      pointsEarned: correct ? question.points : 0,
    })
  }

  return (
    <View className="gap-4">
      {isFirstOfPart && partTitle ? <PartHeader title={partTitle} /> : null}

      <Text className="text-base text-slate-800 leading-7" style={{ fontFamily: "Georgia" }}>
        {question.stem}
      </Text>

      <TextInput
        value={input}
        onChangeText={setInput}
        editable={!revealAnswer}
        placeholder="輸入答案…"
        placeholderTextColor="#94a3b8"
        className={`border rounded-xl px-4 py-3 text-base text-slate-800 bg-white ${
          revealAnswer
            ? isCorrect
              ? "border-green-400 bg-green-50"
              : "border-red-400 bg-red-50"
            : "border-slate-300"
        }`}
        style={{ fontFamily: "Georgia" }}
      />

      {revealAnswer && (
        <View className={`rounded-xl p-4 ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
          <Text className={`font-semibold text-base mb-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}>
            {isCorrect ? "✓ 答對了！" : "✗ 答錯了"}
          </Text>
          {!isCorrect && (
            <Text className="text-sm text-slate-600">
              正確答案：
              <Text className="text-green-700 font-medium" style={{ fontFamily: "Georgia" }}>
                {question.correctAnswer.split("|")[0]}
              </Text>
            </Text>
          )}
          {question.explanation ? (
            <Text className="text-sm text-slate-500 mt-2">{question.explanation}</Text>
          ) : null}
        </View>
      )}

      {!revealAnswer ? (
        <Pressable
          onPress={handleSubmit}
          disabled={input.trim().length === 0}
          className={`py-3 rounded-xl items-center ${
            input.trim().length > 0 ? "bg-amber-500 active:bg-amber-600" : "bg-slate-200"
          }`}
        >
          <Text className={`text-base font-semibold ${input.trim().length > 0 ? "text-white" : "text-slate-400"}`}>
            提交答案
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={onNext}
          className="py-3 rounded-xl items-center bg-amber-500 active:bg-amber-600"
        >
          <Text className="text-base font-semibold text-white">
            {isLastQuestion ? "查看成績" : "下一題"}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
