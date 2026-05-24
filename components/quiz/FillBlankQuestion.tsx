import React, { useState } from "react"
import { View, Text, TextInput, Pressable } from "react-native"

interface FillBlankQuestionProps {
  stem: string
  correctAnswer: string // pipe-separated accepted answers e.g. "學則不固|學則不固。"
  points: number
  onAnswer: (correct: boolean, userAnswer: string) => void
}

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[。，、；：！？]/g, "")
}

export function FillBlankQuestion({
  stem,
  correctAnswer,
  points,
  onAnswer,
}: FillBlankQuestionProps) {
  const [input, setInput] = useState("")
  const [revealed, setRevealed] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const acceptedAnswers = correctAnswer.split("|").map(normalise)

  function handleSubmit() {
    if (revealed) return
    const correct = acceptedAnswers.includes(normalise(input))
    setIsCorrect(correct)
    setRevealed(true)
    onAnswer(correct, input)
  }

  // Split stem by ___ to render inline inputs
  const parts = stem.split(/_{2,}/)

  return (
    <View className="px-4 py-2">
      {/* Stem with blank indicator */}
      <Text
        className="text-slate-800 text-base leading-7 mb-4"
        style={{ fontFamily: "Georgia" }}
      >
        {stem}
      </Text>

      {/* Answer input */}
      <View className="mb-4">
        <Text className="text-slate-500 text-sm mb-1">請填寫答案：</Text>
        <TextInput
          className="border border-slate-300 rounded-lg px-3 py-2 text-base text-slate-800 bg-white"
          style={{ fontFamily: "Georgia" }}
          value={input}
          onChangeText={setInput}
          editable={!revealed}
          multiline
          placeholder="在此輸入答案……"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Submit button */}
      {!revealed && (
        <Pressable
          className={`rounded-lg py-3 items-center ${
            input.trim() ? "bg-amber-500" : "bg-slate-200"
          }`}
          onPress={handleSubmit}
          disabled={!input.trim()}
        >
          <Text
            className={`font-semibold text-base ${
              input.trim() ? "text-white" : "text-slate-400"
            }`}
          >
            提交
          </Text>
        </Pressable>
      )}

      {/* Reveal feedback */}
      {revealed && (
        <View
          className={`rounded-lg p-3 mt-2 ${
            isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}
        >
          <Text
            className={`font-semibold mb-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}
          >
            {isCorrect ? `✓ 正確！+${points} 分` : "✗ 答案不正確"}
          </Text>
          {!isCorrect && (
            <>
              <Text className="text-slate-500 text-sm">你的答案：</Text>
              <Text
                className="text-slate-700 text-sm mb-2"
                style={{ fontFamily: "Georgia" }}
              >
                {input}
              </Text>
            </>
          )}
          <Text className="text-slate-500 text-sm">正確答案：</Text>
          <Text
            className="text-slate-800 text-sm"
            style={{ fontFamily: "Georgia" }}
          >
            {correctAnswer.split("|")[0]}
          </Text>
        </View>
      )}
    </View>
  )
}
