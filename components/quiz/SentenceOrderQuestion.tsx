import React, { useState, useCallback } from "react"
import { View, Text, TouchableOpacity, Pressable } from "react-native"

interface SentenceOrderQuestionProps {
  tokens: string[]
  correctAnswer: string // ">" delimited correct sequence e.g. "明>月>松>間>照"
  points?: number
  onSubmit: (isCorrect: boolean, pointsEarned: number) => void
}

export default function SentenceOrderQuestion({
  tokens,
  correctAnswer,
  points = 1,
  onSubmit,
}: SentenceOrderQuestionProps) {
  // Shuffle tokens on mount
  const [shuffled] = useState<string[]>(() => [...tokens].sort(() => Math.random() - 0.5))
  const [arranged, setArranged] = useState<string[]>([])
  const [remaining, setRemaining] = useState<string[]>(shuffled)
  const [revealed, setRevealed] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const handlePickToken = useCallback(
    (token: string, index: number) => {
      if (revealed) return
      setArranged((prev) => [...prev, token])
      setRemaining((prev) => prev.filter((_, i) => i !== index))
    },
    [revealed]
  )

  const handleRemoveToken = useCallback(
    (index: number) => {
      if (revealed) return
      const token = arranged[index]
      setRemaining((prev) => [...prev, token])
      setArranged((prev) => prev.filter((_, i) => i !== index))
    },
    [arranged, revealed]
  )

  const handleSubmit = useCallback(() => {
    if (arranged.length !== tokens.length) return
    const correctSeq = correctAnswer.split(">")
    const correct = arranged.join(">") === correctSeq.join(">")
    setIsCorrect(correct)
    setRevealed(true)
    onSubmit(correct, correct ? points : 0)
  }, [arranged, tokens.length, correctAnswer, points, onSubmit])

  const correctSeq = correctAnswer.split(">")

  return (
    <View className="flex-1 px-4 pb-4">
      {/* Answer slots */}
      <Text className="text-sm font-medium text-slate-500 mb-2">已排列順序</Text>
      <View className="min-h-[56px] flex-row flex-wrap gap-2 bg-slate-100 rounded-xl p-3 mb-4 border border-slate-200">
        {arranged.length === 0 && (
          <Text className="text-slate-400 text-sm self-center">點擊下方字詞加入</Text>
        )}
        {arranged.map((token, i) => {
          const tokenCorrect = revealed ? token === correctSeq[i] : null
          return (
            <Pressable
              key={`arranged-${i}`}
              onPress={() => handleRemoveToken(i)}
              className={`px-3 py-2 rounded-lg border ${
                revealed
                  ? tokenCorrect
                    ? "bg-green-100 border-green-400"
                    : "bg-red-100 border-red-400"
                  : "bg-amber-100 border-amber-400"
              }`}
            >
              <Text
                className={`text-base font-medium ${
                  revealed
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

      {/* Remaining tokens */}
      <Text className="text-sm font-medium text-slate-500 mb-2">可用字詞</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {remaining.map((token, i) => (
          <Pressable
            key={`remaining-${i}`}
            onPress={() => handlePickToken(token, i)}
            disabled={revealed}
            className="px-3 py-2 rounded-lg bg-white border border-slate-300"
          >
            <Text className="text-base font-medium text-slate-700" style={{ fontFamily: "Georgia" }}>
              {token}
            </Text>
          </Pressable>
        ))}
        {remaining.length === 0 && !revealed && (
          <Text className="text-slate-400 text-sm">所有字詞已排列</Text>
        )}
      </View>

      {/* Submit button */}
      {!revealed && (
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
      )}

      {/* Reveal feedback */}
      {revealed && (
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
        </View>
      )}
    </View>
  )
}
