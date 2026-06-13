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
