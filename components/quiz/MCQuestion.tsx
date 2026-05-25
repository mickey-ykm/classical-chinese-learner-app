import React, { useState } from "react"
import { View, Text, TouchableOpacity, Pressable } from "react-native"
import { Mascot } from "@/components/Mascot"

interface MCOption {
  key: string
  text: string
}

interface MCQuestionProps {
  stem: string
  options: MCOption[]
  correctAnswer: string // "A" for single/true-false; "A,C,E" for multi
  selectCount: number
  points?: number
  onAnswer: (isCorrect: boolean, selected: string[]) => void
  onNext: () => void
  isLastQuestion: boolean
}

export default function MCQuestion({
  stem,
  options,
  correctAnswer,
  selectCount,
  points,
  onAnswer,
  onNext,
  isLastQuestion,
}: MCQuestionProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const correctSet = new Set(correctAnswer.split(",").map((k) => k.trim()))

  function toggleOption(key: string) {
    if (revealed) return
    if (selectCount === 1) {
      // Single select — immediately reveal
      const correct = correctSet.has(key) && correctSet.size === 1
      setSelected([key])
      setRevealed(true)
      setIsCorrect(correct)
      onAnswer(correct, [key])
    } else {
      setSelected((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      )
    }
  }

  function handleSubmit() {
    if (revealed || selected.length !== selectCount) return
    const selectedSet = new Set(selected)
    const correct =
      selectedSet.size === correctSet.size &&
      [...selectedSet].every((k) => correctSet.has(k))
    setRevealed(true)
    setIsCorrect(correct)
    onAnswer(correct, selected)
  }

  function optionStyle(key: string): string {
    if (!revealed) {
      return selected.includes(key)
        ? "border-amber-500 bg-amber-50"
        : "border-slate-200 bg-white"
    }
    if (correctSet.has(key)) return "border-green-500 bg-green-50"
    if (selected.includes(key)) return "border-red-400 bg-red-50"
    return "border-slate-200 bg-white opacity-60"
  }

  return (
    <View className="px-4 py-4">
      {/* Stem */}
      <Text className="text-base text-slate-800 mb-4 leading-6">{stem}</Text>

      {/* Count hint for multi-select */}
      {selectCount > 1 && (
        <Text className="text-sm text-amber-600 mb-3">
          選擇 {selectCount} 個答案（已選 {selected.length}）
        </Text>
      )}

      {/* Options */}
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          activeOpacity={0.7}
          onPress={() => toggleOption(opt.key)}
          className={`flex-row items-start border rounded-xl px-4 py-3 mb-3 ${optionStyle(opt.key)}`}
        >
          {/* Checkbox / radio indicator */}
          <View
            className={`w-6 h-6 rounded-full border-2 mr-3 mt-0.5 items-center justify-center flex-shrink-0 ${
              selected.includes(opt.key)
                ? "border-amber-500 bg-amber-500"
                : "border-slate-300 bg-white"
            }`}
          >
            {selected.includes(opt.key) && (
              <View className="w-2.5 h-2.5 rounded-full bg-white" />
            )}
          </View>
          <Text className="text-sm text-slate-700 flex-1 leading-5">
            <Text className="font-semibold">{opt.key}. </Text>
            {opt.text}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Submit button for multi-select */}
      {selectCount > 1 && !revealed && (
        <Pressable
          onPress={handleSubmit}
          disabled={selected.length !== selectCount}
          className={`mt-2 rounded-xl py-3 items-center ${
            selected.length === selectCount ? "bg-amber-500" : "bg-slate-200"
          }`}
        >
          <Text
            className={`font-semibold text-base ${
              selected.length === selectCount ? "text-white" : "text-slate-400"
            }`}
          >
            提交
          </Text>
        </Pressable>
      )}

      {/* Feedback + Next after reveal */}
      {revealed && (
        <View className="mt-4 items-center gap-3">
          <Mascot mood={isCorrect ? "happy" : "sad"} size={90} />
          <View className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Text className="text-xs font-semibold text-amber-700 mb-1">正確答案</Text>
            <Text className="text-sm text-slate-700">{correctAnswer}</Text>
          </View>
          <Pressable
            onPress={onNext}
            className="w-full py-3.5 rounded-xl bg-amber-500 items-center active:opacity-80 mt-1"
          >
            <Text className="text-white font-semibold text-base">
              {isLastQuestion ? "查看成績" : "下一題 →"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
