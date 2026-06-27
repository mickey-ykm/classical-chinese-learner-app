import { supabase } from "@/lib/supabase"
import type { Question, QuizAnswer } from "@/lib/types"

const OPTION_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }

export async function saveQuizAttempt(
  userId: string,
  articleId: string,
  questions: Question[],
  answers: Record<string | number, QuizAnswer>,
  score: number,
  totalPoints: number,
  totalSeconds?: number,
  expectedSeconds?: number,
): Promise<void> {
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: userId,
      article_id: articleId,
      score,
      total_points: totalPoints,
      ...(totalSeconds != null ? { total_seconds: totalSeconds } : {}),
      ...(expectedSeconds != null ? { expected_seconds: expectedSeconds } : {}),
    })
    .select("id")
    .single()

  if (error || !attempt) return

  const rows = questions.map((q) => {
    const answer = answers[q.id]
    // user_choice: only meaningful for single-select mc (single letter key).
    // For mc-multi, selectedOption is comma-separated — store null for user_choice
    // since the DB column expects a single integer index.
    const isSingleKey = answer?.selectedOption != null && !String(answer.selectedOption).includes(",")
    return {
      attempt_id: attempt.id,
      question_id: String(q.id),
      part_number: q.part,
      user_choice: isSingleKey ? (OPTION_INDEX[answer!.selectedOption!] ?? null) : null,
      correct_choice: OPTION_INDEX[q.correctAnswer] ?? null,
      is_correct: answer?.isCorrect ?? false,
      // Use pointsEarned if present (partial credit for mc-multi), else fall back
      points_earned: answer?.pointsEarned ?? (answer?.isCorrect ? q.points : 0),
    }
  })

  await supabase.from("quiz_answers").insert(rows)
}

export async function saveQuizAttemptToExerciseSessions(
  userId: string | null,
  articleId: string,
  questions: Question[],
  answers: Record<string | number, QuizAnswer>,
  score: number,
  totalPoints: number,
  totalSeconds?: number,
  expectedSeconds?: number,
): Promise<void> {
  // Insert session
  const { data: session, error: sessErr } = await supabase
    .from("exercise_sessions")
    .insert({
      user_id: userId,
      kind: "article-quiz",
      article_id: articleId,
      score,
      total_points: totalPoints,
      total_seconds: totalSeconds ?? null,
      expected_seconds: expectedSeconds ?? null,
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
      points_earned: answer?.pointsEarned ?? (answer?.isCorrect ? (q.points || 1) : 0),
      answered_at: new Date().toISOString(),
    }
  })

  const { error: ansErr } = await supabase
    .from("exercise_answers")
    .insert(answerRows)

  if (ansErr) throw ansErr
}
