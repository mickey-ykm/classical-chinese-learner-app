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
