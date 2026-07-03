import { useState, useCallback, useEffect, useRef } from "react"
import { View, Pressable, Text, ScrollView } from "react-native"
import type { Question, QuizAnswer, OptionKey } from "@/lib/types"
import { checkAnswer, calculateScore } from "@/lib/quiz"
import { getArticle } from "@/lib/data"
import { useAuth } from "@/hooks/useAuth"
import { saveQuizAttemptToExerciseSessions } from "@/lib/quizHistory"
import type { Article } from "@/lib/types"
import QuizProgressBar from "./QuizProgressBar"
import QuizQuestion from "./QuizQuestion"
import MCQuestion from "./MCQuestion"
import FillBlankQuestion from "./FillBlankQuestion"
import SentenceOrderQuestion from "./SentenceOrderQuestion"
import ScoreScreen from "./ScoreScreen"
import ArticlePopup from "./ArticlePopup"
import { JianColors, JianTypography, JianRadius } from "@/components/jian"

interface Props {
  questions: Question[]
  partTitles?: Record<number, string>
  articleId?: string
  articles?: Array<{ id: string; title: string }>  // Multi-article mode
  relatedArticlesMap?: Record<string, Array<{ id: string; title: string }>>  // For weight-training
  expectedMinutes?: number
  exerciseType?: "weight-training" | "dse-training" | "regular"
  onSave?: (score: number, total: number, answersOrTotalSeconds: number | Record<string | number, QuizAnswer>) => void
  onExit?: () => void
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

export default function QuizShell({
  questions: rawQuestions,
  partTitles = {},
  articleId,
  articles,
  relatedArticlesMap,
  expectedMinutes,
  exerciseType = "regular",
  onSave,
  onExit,
  onFinished
}: Props) {
  const [questions] = useState<Question[]>(() =>
    rawQuestions.map((q) => {
      if (q.format === "mc" && q.options && q.options.length > 0) {
        // Don't shuffle True/False questions (2 options with 正確/錯誤)
        const isTrueFalse = q.options.length === 2 &&
          q.options.some(opt => opt.text.includes('正確')) &&
          q.options.some(opt => opt.text.includes('錯誤'))

        if (isTrueFalse) {
          return q // Keep True/False in original order
        }

        // Shuffle other MC questions
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
  const [answers, setAnswers] = useState<Record<string | number, QuizAnswer>>({})
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [waitingForNext, setWaitingForNext] = useState(false)
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [showArticle, setShowArticle] = useState(false)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [hasSaved, setHasSaved] = useState(false)

  const startedAtRef = useRef(Date.now())
  const { user } = useAuth()

  // Multi-article mode: load article dynamically based on current question
  const currentQuestion = questions[currentIndex]
  const currentArticleId = articles && currentQuestion?.articleId ? currentQuestion.articleId : articleId
  const currentArticle: Article | null = currentArticleId ? getArticle(currentArticleId) : null
  const currentArticleTitle = articles?.find(a => a.id === currentArticleId)?.title || currentArticle?.title

  // For weight-training: show the selected related article
  const articleToShow = selectedArticleId ? getArticle(selectedArticleId) : currentArticle

  useEffect(() => {
    if (isFinished) return
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isFinished])

  // Save quiz results when finished
  useEffect(() => {
    if (!isFinished) return
    if (hasSaved) return

    const totalSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000)
    const { earned, total } = calculateScore(questions, answers)

    if (onSave) {
      // Custom save handler provided (weight-training, dse-training, revision)
      if (exerciseType === "weight-training" || exerciseType === "dse-training") {
        // Pass answers object for backend processing
        onSave(earned, total, answers)
      } else {
        // Regular article quiz: pass totalSeconds
        onSave(earned, total, totalSeconds)
      }
      setHasSaved(true)
    } else if (articleId) {
      // Default save for article quiz (no custom handler)
      saveQuizAttemptToExerciseSessions(
        user?.id ?? null,
        articleId,
        questions,
        answers,
        earned,
        total,
        totalSeconds,
        expectedMinutes != null ? expectedMinutes * 60 : undefined,
      ).then(() => {
        setHasSaved(true)
        onFinished?.()
      }).catch(() => {})
    }
  }, [isFinished, hasSaved])

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
    setHasSaved(false)
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
        onExit={onExit}
      />
    )
  }

  const isFirstOfPart =
    currentIndex === 0 || questions[currentIndex - 1]?.part !== currentQuestion.part

  return (
    <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View className="gap-6">{/* Gap between major sections */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <QuizProgressBar current={currentIndex + 1} total={questions.length} />
          </View>
          <Text className={`text-sm font-semibold tabular-nums ${timerColor}`}>
            {formatTimer(elapsedSeconds)}
          </Text>
          {currentArticle && !articles && (
            <Pressable
              onPress={() => setShowArticle(true)}
              hitSlop={8}
              className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5 active:opacity-70"
            >
              <Text className="text-amber-700 font-semibold text-xs">📖 文章</Text>
            </Pressable>
          )}
        </View>

        {/* Article badge for multi-article mode */}
        {articles && currentArticleTitle && (
          <Pressable
            onPress={() => setShowArticle(true)}
            className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 active:opacity-70"
          >
            <View className="flex-row items-center">
              <Text className="text-amber-600 text-base mr-2">📄</Text>
              <Text className="text-slate-700 text-sm font-medium flex-1" style={{ fontFamily: "Georgia" }}>
                {currentArticleTitle}
              </Text>
              <Text className="text-amber-500 text-xs">點擊查看</Text>
            </View>
          </Pressable>
        )}

        {/* Related articles buttons for weight-training mode */}
        {relatedArticlesMap && relatedArticlesMap[currentQuestion.id] && (
          <View className="gap-2">
            <Text className="text-xs text-slate-500 font-semibold uppercase tracking-wide">相關文章</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
              <View className="flex-row gap-2">
                {relatedArticlesMap[currentQuestion.id].map((article) => (
                  <Pressable
                    key={article.id}
                    onPress={() => {
                      setSelectedArticleId(article.id)
                      setShowArticle(true)
                    }}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 active:opacity-70"
                  >
                    <View className="flex-row items-center">
                      <Text className="text-amber-600 text-sm mr-2">📄</Text>
                      <Text className="text-slate-700 text-sm font-medium" style={{ fontFamily: "Georgia" }}>
                        {article.title}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

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
      ) : (currentQuestion.selectCount ?? 1) > 1 ? (
        <MCQuestion
          key={currentQuestion.id}
          stem={currentQuestion.stem}
          options={currentQuestion.options ?? []}
          correctAnswer={currentQuestion.correctAnswer}
          selectCount={currentQuestion.selectCount ?? 2}
          points={currentQuestion.points}
          explanation={currentQuestion.explanation}
          onAnswer={(correct, selected, pointsEarned) => {
            setAnswers((prev) => ({
              ...prev,
              [currentQuestion.id]: {
                questionId: currentQuestion.id,
                selectedOption: selected.join(","),
                isCorrect: correct,
                pointsEarned,
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
        article={articleToShow}
        onClose={() => {
          setShowArticle(false)
          setSelectedArticleId(null)
        }}
      />
    </View>
    </ScrollView>
  )
}
