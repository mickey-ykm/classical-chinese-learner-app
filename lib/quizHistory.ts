import { supabase } from "@/lib/supabase"
import type { Question, QuizAnswer } from "@/lib/types"

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
    return {
      session_id: session.id,
      question_id: String(q.id),
      user_answer: answer?.selectedOption ?? null,
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
