import React, { useState, useCallback } from "react"
import { View, Text, TouchableOpacity, Pressable } from "react-native"
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

export default function SentenceOrderQuestion({
  question,
  partTitle,
  isFirstOfPart,
  isLastQuestion,
  revealAnswer,
  isCorrect,
  onAnswer,
  onNext,
}: Props) {
  const tokens: string[] = question.sequenceTokens ?? []
  const correctAnswer = question.correctAnswer ?? ""

  const [shuffled] = useState<string[]>(() => [...tokens].sort(() => Math.random() - 0.5))
  const [arranged, setArranged] = useState<string[]>([])
  const [remaining, setRemaining] = useState<string[]>(shuffled)
  const [submitted, setSubmitted] = useState(false)

  const correctSeq = correctAnswer.includes(",")
    ? correctAnswer.split(",").map(t => t.trim())
    : correctAnswer.split(">").map(t => t.trim())

  const handlePickToken = useCallback(
    (token: string, index: number) => {
      if (submitted) return
      setArranged((prev) => [...prev, token])
      setRemaining((prev) => prev.filter((_, i) => i !== index))
    },
    [submitted]
  )

  const handleRemoveToken = useCallback(
    (index: number) => {
      if (submitted) return
      const token = arranged[index]
      setRemaining((prev) => [...prev, token])
      setArranged((prev) => prev.filter((_, i) => i !== index))
    },
    [arranged, submitted]
  )

  const handleSubmit = useCallback(() => {
    if (arranged.length !== tokens.length || submitted) return
    const correct = arranged.join(">") === correctSeq.join(">")
    setSubmitted(true)
    const result: QuizAnswer = {
      questionId: question.id,
      selectedOption: arranged.join(">"), // Store the user's arranged sequence here
      isCorrect: correct,
      pointsEarned: correct ? question.points : 0,
    }
    onAnswer(result)
  }, [arranged, tokens.length, correctSeq, submitted, question, onAnswer])

  return (
    <View className="gap-4">
      {isFirstOfPart && <PartHeader title={partTitle} />}

      <Text className="text-base text-slate-800 leading-relaxed" style={{ fontFamily: "Georgia" }}>
        {question.stem}
      </Text>

      {/* Answer slots */}
      <View>
        <Text className="text-sm font-medium text-slate-500 mb-2">已排列順序</Text>
        <View className="min-h-[56px] flex-row flex-wrap gap-2 bg-slate-100 rounded-xl p-3 border border-slate-200">
          {arranged.length === 0 && (
            <Text className="text-slate-400 text-sm self-center">點擊下方字詞加入</Text>
          )}
          {arranged.map((token, i) => {
            const tokenCorrect = submitted ? token === correctSeq[i] : null
            return (
              <Pressable
                key={`arranged-${i}`}
                onPress={() => handleRemoveToken(i)}
                disabled={submitted}
                className={`px-3 py-2 rounded-lg border ${
                  submitted
                    ? tokenCorrect
                      ? "bg-green-100 border-green-400"
                      : "bg-red-100 border-red-400"
                    : "bg-amber-100 border-amber-400"
                }`}
              >
                <Text
                  className={`text-base font-medium ${
                    submitted
                      ? tokenCorrect
                        ? "text-green-700"
                        : "text-red-700"
                      : "text-amber-800"
                  }`}
                  style={{ fontFamily: "Georgia" }}
                >
                  {token}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Remaining tokens */}
      <View>
        <Text className="text-sm font-medium text-slate-500 mb-2">可用字詞</Text>
        <View className="flex-row flex-wrap gap-2">
          {remaining.map((token, i) => (
            <Pressable
              key={`remaining-${i}`}
              onPress={() => handlePickToken(token, i)}
              disabled={submitted}
              className="px-3 py-2 rounded-lg bg-white border border-slate-300"
            >
              <Text className="text-base font-medium text-slate-700" style={{ fontFamily: "Georgia" }}>
                {token}
              </Text>
            </Pressable>
          ))}
          {remaining.length === 0 && !submitted && (
            <Text className="text-slate-400 text-sm">所有字詞已排列</Text>
          )}
        </View>
      </View>

      {/* Submit / feedback */}
      {!submitted ? (
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={arranged.length !== tokens.length}
          className={`py-3 rounded-xl items-center ${
            arranged.length === tokens.length ? "bg-amber-500" : "bg-slate-200"
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              arranged.length === tokens.length ? "text-white" : "text-slate-400"
            }`}
          >
            提交答案
          </Text>
        </TouchableOpacity>
      ) : (
        <View className={`rounded-xl p-4 ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
          <Text className={`font-semibold text-base mb-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}>
            {isCorrect ? "✓ 答對了！" : "✗ 答錯了"}
          </Text>
          {!isCorrect && (
            <>
              <Text className="text-sm text-slate-600 mb-1">正確順序：</Text>
              <View className="flex-row flex-wrap gap-1">
                {correctSeq.map((t, i) => (
                  <Text
                    key={i}
                    className="text-base font-medium text-green-700 bg-green-100 px-2 py-1 rounded"
                    style={{ fontFamily: "Georgia" }}
                  >
                    {t}
                  </Text>
                ))}
              </View>
            </>
          )}
          <TouchableOpacity
            onPress={onNext}
            className="mt-3 py-2.5 rounded-xl items-center bg-amber-500"
          >
            <Text className="text-white font-semibold text-base">
              {isLastQuestion ? "查看結果" : "下一題"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
