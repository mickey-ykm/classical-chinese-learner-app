import { supabase } from "@/lib/supabase"
import { getAllQuestions, getArticleIndex } from "@/lib/data"
import type { Question, QuizAnswer } from "@/lib/types"

export interface WrongQuestion {
  question: Question
  articleId: string
  wrongCount: number
}

interface QuizAnswerRow {
  question_id: string
  article_id: string
  is_correct: boolean
}

const REVISION_SAMPLE_SIZE = 15

export async function fetchRevisionQuestions(userId: string): Promise<WrongQuestion[]> {
  const { data, error } = await supabase
    .from("quiz_answers")
    .select("question_id, is_correct, quiz_attempts!inner(article_id, user_id)")
    .eq("quiz_attempts.user_id", userId)
    .eq("is_correct", false)

  if (error || !data) return []

  // Tally wrong counts per (article_id, question_id)
  const tally = new Map<string, { articleId: string; questionId: string; count: number }>()
  for (const row of data as unknown as Array<{ question_id: string; is_correct: boolean; quiz_attempts: { article_id: string } }>) {
    const articleId = row.quiz_attempts.article_id
    const key = `${articleId}::${row.question_id}`
    const existing = tally.get(key)
    if (existing) {
      existing.count += 1
    } else {
      tally.set(key, { articleId, questionId: row.question_id, count: 1 })
    }
  }

  if (tally.size === 0) return []

  // Sort by wrong count descending (most-frequently-wrong first)
  const sorted = Array.from(tally.values()).sort((a, b) => b.count - a.count)

  // Resolve Question objects from contentStore
  const results: WrongQuestion[] = []
  const knownArticleIds = new Set(getArticleIndex().map((a) => a.id))

  for (const { articleId, questionId, count } of sorted) {
    if (results.length >= REVISION_SAMPLE_SIZE) break
    if (!knownArticleIds.has(articleId)) continue
    let questions: Question[]
    try {
      questions = getAllQuestions(articleId)
    } catch {
      continue
    }
    const question = questions.find((q) => String(q.id) === questionId)
    if (!question) continue
    results.push({ question, articleId, wrongCount: count })
  }

  return results
}

export async function countRevisionMistakes(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("quiz_answers")
    .select("question_id, quiz_attempts!inner(user_id)", { count: "exact", head: true })
    .eq("quiz_attempts.user_id", userId)
    .eq("is_correct", false)

  if (error) return 0
  return count ?? 0
}

export async function saveRevisionSession(
  userId: string,
  questions: Question[],
  answers: Record<string | number, QuizAnswer>,
  score: number,
  totalPoints: number,
  totalSeconds: number,
): Promise<void> {
  const { data: session, error: sessErr } = await supabase
    .from("exercise_sessions")
    .insert({
      user_id: userId,
      kind: "revision",
      article_id: null,
      score,
      total_points: totalPoints,
      total_seconds: totalSeconds,
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (sessErr || !session) throw sessErr

  // Insert answers
  const answerRows = questions.map((q) => {
    const answer = answers[q.id]
    // Serialize user_answer based on answer structure
    let userAnswer: string | null = null
    if (answer) {
      if ('selectedOption' in answer && answer.selectedOption != null) {
        userAnswer = answer.selectedOption // MC single-select
      } else if ('selectedOptions' in answer && Array.isArray((answer as any).selectedOptions)) {
        userAnswer = (answer as any).selectedOptions.join(',') // MC multi-select
      } else if ('input' in answer) {
        userAnswer = (answer as any).input // Fill-blank
      } else if ('submittedTokens' in answer && Array.isArray((answer as any).submittedTokens)) {
        userAnswer = (answer as any).submittedTokens.join('>') // Sentence-order
      }
    }

    return {
      session_id: session.id,
      question_id: String(q.id),
      user_answer: userAnswer,
      is_correct: answer?.isCorrect ?? false,
      points_earned: answer?.pointsEarned ?? (answer?.isCorrect ? 1 : 0),
      answered_at: new Date().toISOString(),
    }
  })

  const { error: ansErr } = await supabase
    .from("exercise_answers")
    .insert(answerRows)

  if (ansErr) throw ansErr
}
