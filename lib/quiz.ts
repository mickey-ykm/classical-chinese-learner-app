import type { Question, QuizAnswer, OptionKey } from "./types"

export function checkAnswer(question: Question, selected: OptionKey): QuizAnswer {
  return {
    questionId: question.id,
    selectedOption: selected,
    isCorrect: selected === question.correctAnswer,
  }
}

export function calculateScore(
  questions: Question[],
  answers: Record<number, QuizAnswer>
): { earned: number; total: number; percentage: number } {
  let earned = 0
  let total = 0
  for (const q of questions) {
    total += q.points
    if (answers[q.id]?.isCorrect) earned += q.points
  }
  return { earned, total, percentage: total === 0 ? 0 : Math.round((earned / total) * 100) }
}

export function getPartScore(
  part: 1 | 2 | 3 | 4,
  questions: Question[],
  answers: Record<number, QuizAnswer>
): { earned: number; total: number } {
  const partQuestions = questions.filter((q) => q.part === part)
  let earned = 0
  let total = 0
  for (const q of partQuestions) {
    total += q.points
    if (answers[q.id]?.isCorrect) earned += q.points
  }
  return { earned, total }
}
