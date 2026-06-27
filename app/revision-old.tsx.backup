import { useEffect, useState, useRef } from "react"
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/hooks/useAuth"
import { fetchRevisionQuestions, saveRevisionSession, type WrongQuestion } from "@/lib/revisionSession"
import { calculateScore, checkAnswer } from "@/lib/quiz"
import { getArticleIndex, getArticle, STANDARD_PART_TITLES } from "@/lib/data"
import type { Question, QuizAnswer, OptionKey, Article } from "@/lib/types"
import QuizProgressBar from "@/components/quiz/QuizProgressBar"
import QuizQuestion from "@/components/quiz/QuizQuestion"
import FillBlankQuestion from "@/components/quiz/FillBlankQuestion"
import SentenceOrderQuestion from "@/components/quiz/SentenceOrderQuestion"
import ScoreScreen from "@/components/quiz/ScoreScreen"
import ArticlePopup from "@/components/quiz/ArticlePopup"

export default function RevisionScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([])
  const [questions, setQuestions] = useState<Question[]>([])

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string | number, QuizAnswer>>({})
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [waitingForNext, setWaitingForNext] = useState(false)
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showArticle, setShowArticle] = useState(false)

  const startedAtRef = useRef(Date.now())

  useEffect(() => {
    if (!user) return
    fetchRevisionQuestions(user.id).then((wq) => {
      setWrongQuestions(wq)
      setQuestions(wq.map((w) => w.question))
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (isFinished || loading) return
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isFinished, loading])

  useEffect(() => {
    if (!isFinished || !user || questions.length === 0) return
    const totalSecs = Math.floor((Date.now() - startedAtRef.current) / 1000)
    const { earned, total } = calculateScore(questions, answers)
    saveRevisionSession(user.id, questions, answers, earned, total, totalSecs).catch((err) => {
      console.error('Revision save error:', err)
    })
  }, [isFinished])

  function handleSelect(key: OptionKey) {
    if (waitingForNext || selectedOption !== null) return
    const q = questions[currentIndex]
    const result = checkAnswer(q, key)
    setSelectedOption(key)
    setAnswers((prev) => ({ ...prev, [q.id]: result }))
    setRevealAnswer(true)
    setLastAnswerCorrect(result.isCorrect)
    setWaitingForNext(true)
  }

  function handleNext() {
    setRevealAnswer(false)
    setSelectedOption(null)
    setWaitingForNext(false)
    if (currentIndex + 1 >= questions.length) {
      setIsFinished(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

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

  if (!user || user.is_anonymous) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-5 pt-4 pb-2">
          <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-6">
            <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">🔒</Text>
          <Text className="text-lg font-bold text-slate-800 text-center mb-2">需要登入</Text>
          <Text className="text-sm text-slate-500 text-center leading-relaxed">
            溫故知新功能適用於已登入的用戶，讓你集中練習曾經答錯的題目。
          </Text>
          <Pressable
            onPress={() => router.push("/login")}
            className="mt-6 bg-amber-500 px-6 py-3 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-sm">立即登入</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="small" color="#d97706" />
        <Text className="text-slate-400 text-sm mt-3">載入複習題目…</Text>
      </SafeAreaView>
    )
  }

  if (questions.length < 15) {
    const hasAny = questions.length > 0
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-5 pt-4 pb-2">
          <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-6">
            <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">{hasAny ? "📚" : "🎉"}</Text>
          <Text className="text-lg font-bold text-slate-800 text-center mb-2">
            {hasAny ? "失誤題目不足 15 題" : "尚無失誤記錄"}
          </Text>
          <Text className="text-sm text-slate-500 text-center leading-relaxed">
            {hasAny
              ? `目前累積了 ${questions.length} 題失誤記錄。繼續練習，累積至 15 題後即可開始溫故知新。`
              : "先完成練習，累積足夠的失誤記錄後，即可開始溫故知新。"}
          </Text>
          <Pressable onPress={() => router.replace("/")} className="mt-6">
            <Text className="text-amber-600 font-semibold text-sm">開始練習 →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (isFinished) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-5 pt-4">
          <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-2">
            <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
          </Pressable>
        </View>
        <ScoreScreen
          questions={questions}
          answers={answers}
          partTitles={STANDARD_PART_TITLES}
          articleId=""
          onRestart={handleRestart}
        />
      </SafeAreaView>
    )
  }

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex + 1 >= questions.length
  const articleId = wrongQuestions[currentIndex]?.articleId
  const articleTitle = articleId
    ? (getArticleIndex().find((a) => a.id === articleId)?.title ?? articleId)
    : null
  const article: Article | null = articleId ? getArticle(articleId) : null

  function formatTimer(s: number): string {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-6">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text className="text-amber-600 font-semibold text-sm">← 返回</Text>
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-slate-400 font-medium">複習章節</Text>
            <Text className="text-sm font-semibold tabular-nums text-slate-400">
              {formatTimer(elapsedSeconds)}
            </Text>
          </View>
        </View>

        {articleTitle && (
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs text-amber-600 font-medium flex-1" style={{ fontFamily: "Georgia" }}>
              {articleTitle}
            </Text>
            {article && (
              <Pressable
                onPress={() => setShowArticle(true)}
                className="ml-2 bg-amber-500 px-3 py-1.5 rounded-lg active:opacity-80"
              >
                <Text className="text-white text-xs font-semibold">📖 文章</Text>
              </Pressable>
            )}
          </View>
        )}

        <View className="mb-6">
          <QuizProgressBar current={currentIndex + 1} total={questions.length} />
        </View>

        {currentQuestion.format === "fill-blank" ? (
          <FillBlankQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            partTitle=""
            isFirstOfPart={false}
            isLastQuestion={isLastQuestion}
            revealAnswer={revealAnswer}
            isCorrect={lastAnswerCorrect}
            onAnswer={(result) => {
              setAnswers((prev) => ({ ...prev, [currentQuestion.id]: result }))
              setLastAnswerCorrect(result.isCorrect)
              setRevealAnswer(true)
              setWaitingForNext(true)
            }}
            onNext={handleNext}
          />
        ) : currentQuestion.format === "sentence-order" ? (
          <SentenceOrderQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            partTitle=""
            isFirstOfPart={false}
            isLastQuestion={isLastQuestion}
            revealAnswer={revealAnswer}
            isCorrect={lastAnswerCorrect}
            onAnswer={(result) => {
              setAnswers((prev) => ({ ...prev, [currentQuestion.id]: result }))
              setLastAnswerCorrect(result.isCorrect)
              setRevealAnswer(true)
              setWaitingForNext(true)
            }}
            onNext={handleNext}
          />
        ) : (
          <QuizQuestion
            key={currentQuestion.id}
            question={currentQuestion}
            partTitle=""
            isFirstOfPart={false}
            selectedOption={selectedOption}
            revealAnswer={revealAnswer}
            waitingForNext={waitingForNext}
            isCorrect={lastAnswerCorrect}
            isLastQuestion={isLastQuestion}
            onSelect={handleSelect}
            onNext={handleNext}
          />
        )}
      </ScrollView>

      <ArticlePopup
        visible={showArticle}
        article={article}
        onClose={() => setShowArticle(false)}
      />
    </SafeAreaView>
  )
}
