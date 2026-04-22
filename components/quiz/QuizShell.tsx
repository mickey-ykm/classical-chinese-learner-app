import { useState, useCallback } from "react"
import { View } from "react-native"
import type { Question, QuizAnswer, OptionKey } from "@/lib/types"
import { checkAnswer } from "@/lib/quiz"
import QuizProgressBar from "./QuizProgressBar"
import QuizQuestion from "./QuizQuestion"
import ScoreScreen from "./ScoreScreen"

interface Props {
  questions: Question[]
  partTitles: Record<number, string>
  articleId: string
}

export default function QuizShell({ questions, partTitles, articleId }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, QuizAnswer>>({})
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

  const currentQuestion = questions[currentIndex]

  const handleSelect = useCallback(
    (key: OptionKey) => {
      if (revealAnswer || selectedOption !== null) return
      const result = checkAnswer(currentQuestion, key)
      setSelectedOption(key)
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: result }))
      setRevealAnswer(true)

      setTimeout(() => {
        setRevealAnswer(false)
        setSelectedOption(null)
        if (currentIndex + 1 >= questions.length) {
          setIsFinished(true)
        } else {
          setCurrentIndex((i) => i + 1)
        }
      }, 1200)
    },
    [currentQuestion, currentIndex, questions.length, revealAnswer, selectedOption]
  )

  function handleRestart() {
    setCurrentIndex(0)
    setAnswers({})
    setSelectedOption(null)
    setRevealAnswer(false)
    setIsFinished(false)
  }

  if (isFinished) {
    return (
      <ScoreScreen
        questions={questions}
        answers={answers}
        partTitles={partTitles}
        articleId={articleId}
        onRestart={handleRestart}
      />
    )
  }

  const isFirstOfPart =
    currentIndex === 0 || questions[currentIndex - 1].part !== currentQuestion.part

  return (
    <View className="gap-6">
      <QuizProgressBar current={currentIndex + 1} total={questions.length} />
      <QuizQuestion
        question={currentQuestion}
        partTitle={partTitles[currentQuestion.part] ?? ""}
        isFirstOfPart={isFirstOfPart}
        selectedOption={selectedOption}
        revealAnswer={revealAnswer}
        onSelect={handleSelect}
      />
    </View>
  )
}
