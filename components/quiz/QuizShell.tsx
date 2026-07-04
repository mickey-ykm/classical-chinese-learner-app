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
import { JianColors, JianTypography, JianRadius, getSerifFont } from "@/components/jian"

interface Props {
  questions: Question[]
  partTitles?: Record<number, string>
  articleId?: string
  articles?: Array<{ id: string; title: string }>  // Multi-article mode
  relatedArticlesMap?: Record<string, Array<{ id: string; title: string }>>  // For weight-training
  expectedMinutes?: number
  exerciseType?: "weight-training" | "dse-training" | "regular"
  hideHeader?: boolean  // Hide the built-in header (for screens with custom headers)
  hideArticleButton?: boolean  // Hide the article view button
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
  hideHeader = false,
  hideArticleButton = false,
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

  // For multi-article mode: show exercise type instead of article title in header
  const headerTitle = articles && articles.length > 1
    ? (exerciseType === "dse-training" ? "DSE 模擬考題" : "練習")
    : currentArticleTitle

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
    <View style={{ flex: 1, backgroundColor: '#f4f0e6' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 22 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View>{/* Container for quiz sections */}
        {/* Header: Exit | Title | Timer */}
        {!hideHeader && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 4,
            paddingBottom: 11,
            borderBottomWidth: 1,
            borderBottomColor: '#e7ddc9'
          }}>
            <Pressable onPress={onExit} hitSlop={8}>
              <Text style={{ fontFamily: "Georgia", fontSize: 14, color: '#6f665a' }}>‹ 離開</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={{ fontFamily: "Georgia", fontSize: 13, fontWeight: '600', color: '#2c2722' }}>
                {headerTitle}
              </Text>
            </View>
            <Text style={{ fontFamily: 'Newsreader', fontSize: 13, color: timerColor === 'text-amber-600' ? '#bb8a2e' : timerColor === 'text-red-500' ? '#dc2626' : '#94a3b8' }}>
              ⏱ {formatTimer(elapsedSeconds)}
            </Text>
          </View>
        )}

        {/* Progress bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24 }}>
          <View style={{ flex: 1 }}>
            <QuizProgressBar current={currentIndex + 1} total={questions.length} />
          </View>
          <Text style={{ fontFamily: 'Newsreader', fontSize: 13, color: '#6f665a' }}>
            {String(currentIndex + 1).padStart(2, '0')} / {questions.length}
          </Text>
        </View>

        {/* Article badge for multi-article mode (DSE mock or weight training) */}
        {!hideArticleButton && (
          (articles && articles.length > 1) || (relatedArticlesMap && relatedArticlesMap[currentQuestion.id] && relatedArticlesMap[currentQuestion.id].length > 0)
        ) && (
          <Pressable
            onPress={() => setShowArticle(true)}
            hitSlop={8}
            style={{ marginTop: 24 }}
          >
            {({ pressed }) => (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                backgroundColor: JianColors.surface2,
                borderWidth: 1,
                borderColor: JianColors.line,
                borderRadius: 8,
                paddingVertical: 9,
                paddingLeft: 14,
                paddingRight: 10,
                opacity: pressed ? 0.7 : 1
              }}>
                <Text style={{
                  fontFamily: getSerifFont('400'),
                  fontSize: 13,
                  lineHeight: 20,
                  color: JianColors.ink2,
                  flex: 1
                }}>
                  {partTitles[currentQuestion.part] || `第${currentQuestion.part}部分`}
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: JianColors.surface,
                  borderWidth: 1,
                  borderColor: JianColors.vermilionBorder,
                  borderRadius: 7,
                  paddingVertical: 6,
                  paddingHorizontal: 11,
                  shadowColor: '#2c2722',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2
                }}>
                  <Text style={{ fontSize: 13, color: JianColors.vermilion }}>📖</Text>
                  <Text style={{
                    fontFamily: getSerifFont('600'),
                    fontSize: 12,
                    lineHeight: 18,
                    color: JianColors.vermilion
                  }}>
                    查看原文
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        )}

      <View style={{ marginTop: 24 }}>
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
          onShowArticle={currentArticle ? () => setShowArticle(true) : undefined}
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
          onShowArticle={currentArticle ? () => setShowArticle(true) : undefined}
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
          partTitle={partTitles[currentQuestion.part] ?? ""}
          onShowArticle={currentArticle ? () => setShowArticle(true) : undefined}
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
          onShowArticle={currentArticle ? () => setShowArticle(true) : undefined}
        />
      )}
      </View>

      <ArticlePopup
        visible={showArticle}
        article={articleToShow}
        articles={articles || (relatedArticlesMap && relatedArticlesMap[currentQuestion.id])}
        onClose={() => {
          setShowArticle(false)
          setSelectedArticleId(null)
        }}
      />
    </View>
    </ScrollView>
    </View>
  )
}
