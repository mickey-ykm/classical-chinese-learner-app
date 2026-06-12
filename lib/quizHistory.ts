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
    return {
      attempt_id: attempt.id,
      question_id: String(q.id),
      part_number: q.part,
      user_choice: answer?.selectedOption != null ? OPTION_INDEX[answer.selectedOption] : null,
      correct_choice: OPTION_INDEX[q.correctAnswer],
      is_correct: answer?.isCorrect ?? false,
      points_earned: answer?.isCorrect ? q.points : 0,
    }
  })

  await supabase.from("quiz_answers").insert(rows)
}
