import { supabase } from "@/lib/supabase"
import type { Question, QuizAnswer } from "@/lib/types"

export async function saveDSETrainingSession(
  userId: string | null,
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
      kind: "dse-training",
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
    return {
      session_id: session.id,
      question_id: String(q.id),
      user_answer: answer?.selectedOption ?? null,
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
