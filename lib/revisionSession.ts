import { supabase } from "@/lib/supabase"
import { getAllQuestions, getArticleIndex } from "@/lib/data"
import type { Question } from "@/lib/types"

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
  score: number,
  totalPoints: number,
  totalSeconds: number,
): Promise<void> {
  await supabase.from("exercise_sessions").insert({
    user_id: userId,
    kind: "revision",
    article_id: null,
    question_ids: null,
    started_at: new Date(Date.now() - totalSeconds * 1000).toISOString(),
    finished_at: new Date().toISOString(),
    total_seconds: totalSeconds,
    score,
    total_points: totalPoints,
  })
}
