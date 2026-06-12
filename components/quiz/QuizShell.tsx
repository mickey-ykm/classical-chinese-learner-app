import { useState, useCallback, useEffect, useRef } from "react"
import { View, Pressable, Text } from "react-native"
import type { Question, QuizAnswer, OptionKey } from "@/lib/types"
import { checkAnswer, calculateScore } from "@/lib/quiz"
import { getArticle } from "@/lib/data"
import { useAuth } from "@/hooks/useAuth"
import { saveQuizAttempt } from "@/lib/quizHistory"
import type { Article } from "@/lib/types"
import QuizProgressBar from "./QuizProgressBar"
import QuizQuestion from "./QuizQuestion"
import MCQuestion from "./MCQuestion"
import FillBlankQuestion from "./FillBlankQuestion"
import SentenceOrderQuestion from "./SentenceOrderQuestion"
import ScoreScreen from "./ScoreScreen"
import ArticlePopup from "./ArticlePopup"

interface Props {
  questions: Question[]
  partTitles: Record<number, string>
  articleId?: string
  expectedMinutes?: number
  onSave?: (score: number, total: number, totalSeconds: number) => void
  onFinished?: () => void
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuizShell({ questions: rawQuestions, partTitles, articleId, expectedMinutes, onSave, onFinished }: Props) {
  const [questions] = useState<Question[]>(() =>
    rawQuestions.map((q) => {
      if (q.format === "mc" && q.options && q.options.length > 0) {
        const shuffled = shuffleArray(q.options)
        // Re-assign keys A, B, C... in alphabetical order after shuffle
        const keys = ["A", "B", "C", "D", "E", "F", "G", "H"] as const
        const oldKeyToNew: Record<string, string> = {}
        const reKeyed = shuffled.map((opt, i) => {
          const newKey = keys[i]
          oldKeyToNew[opt.key] = newKey
          return { ...opt, key: newKey }
        })
        // Remap correctAnswer to new keys
        const remappedCorrect = q.correctAnswer
          .split(",")
          .map((k) => oldKeyToNew[k.trim()] ?? k.trim())
          .join(",")
        return { ...q, options: reKeyed, correctAnswer: remappedCorrect }
      }
      return q
    })
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, QuizAnswer>>({})
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [waitingForNext, setWaitingForNext] = useState(false)
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [showArticle, setShowArticle] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const startedAtRef = useRef(Date.now())
  const { user } = useAuth()
  const article: Article | null = articleId ? getArticle(articleId) : null

  useEffect(() => {
    if (isFinished) return
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isFinished])

  useEffect(() => {
    if (!isFinished || !user) return
    const totalSecs = Math.floor((Date.now() - startedAtRef.current) / 1000)
    const { earned, total } = calculateScore(questions, answers)
    if (onSave) {
      onSave(earned, total, totalSecs)
    } else if (articleId) {
      saveQuizAttempt(
        user.id, articleId, questions, answers, earned, total,
        totalSecs,
        expectedMinutes != null ? expectedMinutes * 60 : undefined,
      ).then(() => { onFinished?.() }).catch((e) => { console.error("[QuizShell] saveQuizAttempt threw:", e) })
    }
  }, [isFinished])

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex + 1 >= questions.length

  const timerColor =
    expectedMinutes == null
      ? "text-slate-400"
      : elapsedSeconds <= expectedMinutes * 60
      ? "text-amber-600"
      : "text-red-500"

  const handleSelect = useCallback(
    (key: OptionKey) => {
      if (waitingForNext || selectedOption !== null) return
      const result = checkAnswer(currentQuestion, key)
      setSelectedOption(key)
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: result }))
      setRevealAnswer(true)
      setLastAnswerCorrect(result.isCorrect)
      setWaitingForNext(true)
    },
    [currentQuestion, waitingForNext, selectedOption]
  )

  const handleNext = useCallback(() => {
    setRevealAnswer(false)
    setSelectedOption(null)
    setWaitingForNext(false)
    if (isLastQuestion) {
      setIsFinished(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }, [isLastQuestion])

  function handleRestart() {
    setCurrentIndex(0)
    setAnswers({})
    setSelectedOption(null)
    setRevealAnswer(false)
    setWaitingForNext(false)
    setIsFinished(false)
    startedAtRef.current = Date.now()
    setElapsedSeconds(0)
  }

  if (isFinished) {
    return (
      <ScoreScreen
        questions={questions}
        answers={answers}
        partTitles={partTitles}
        articleId={articleId ?? ""}
        onRestart={handleRestart}
      />
    )
  }

  const isFirstOfPart =
    currentIndex === 0 || questions[currentIndex - 1]?.part !== currentQuestion.part

  return (
    <View className="gap-6">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <QuizProgressBar current={currentIndex + 1} total={questions.length} />
        </View>
        <Text className={`text-sm font-semibold tabular-nums ${timerColor}`}>
          {formatTimer(elapsedSeconds)}
        </Text>
        {article && (
          <Pressable
            onPress={() => setShowArticle(true)}
            hitSlop={8}
            className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-amber-700 font-semibold text-xs">📖 文章</Text>
          </Pressable>
        )}
      </View>

      {currentQuestion.format === "fill-blank" ? (
        <FillBlankQuestion
          key={currentQuestion.id}
          question={currentQuestion}
          partTitle={partTitles[currentQuestion.part] ?? ""}
          isFirstOfPart={isFirstOfPart}
          isLastQuestion={isLastQuestion}
          onAnswer={(result) => {
            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: result }))
            setLastAnswerCorrect(result.isCorrect)
            setRevealAnswer(true)
            setWaitingForNext(true)
          }}
          onNext={handleNext}
          revealAnswer={revealAnswer}
          isCorrect={lastAnswerCorrect}
        />
      ) : currentQuestion.format === "sentence-order" ? (
        <SentenceOrderQuestion
          question={currentQuestion}
          partTitle={partTitles[currentQuestion.part] ?? ""}
          isFirstOfPart={isFirstOfPart}
          isLastQuestion={isLastQuestion}
          onAnswer={(result) => {
            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: result }))
            setLastAnswerCorrect(result.isCorrect)
            setRevealAnswer(true)
            setWaitingForNext(true)
          }}
          onNext={handleNext}
          revealAnswer={revealAnswer}
          isCorrect={lastAnswerCorrect}
        />
      ) : (currentQuestion.selectCount ?? 1) > 1 ? (
        <MCQuestion
          key={currentQuestion.id}
          stem={currentQuestion.stem}
          options={currentQuestion.options ?? []}
          correctAnswer={currentQuestion.correctAnswer}
          selectCount={currentQuestion.selectCount ?? 2}
          points={currentQuestion.points}
          onAnswer={(correct, selected) => {
            setAnswers((prev) => ({
              ...prev,
              [currentQuestion.id]: {
                questionId: currentQuestion.id,
                selectedOption: selected.join(","),
                isCorrect: correct,
                pointsEarned: correct ? (currentQuestion.points ?? 1) : 0,
              },
            }))
            setLastAnswerCorrect(correct)
          }}
          onNext={handleNext}
          isLastQuestion={isLastQuestion}
        />
      ) : (
        <QuizQuestion
          question={currentQuestion}
          partTitle={partTitles[currentQuestion.part] ?? ""}
          isFirstOfPart={isFirstOfPart}
          selectedOption={selectedOption}
          revealAnswer={revealAnswer}
          waitingForNext={waitingForNext}
          isCorrect={lastAnswerCorrect}
          isLastQuestion={isLastQuestion}
          onSelect={handleSelect}
          onNext={handleNext}
        />
      )}

      <ArticlePopup
        visible={showArticle}
        article={article}
        onClose={() => setShowArticle(false)}
      />
    </View>
  )
}
