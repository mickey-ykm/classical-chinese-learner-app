import type { Question, QuizAnswer, OptionKey } from "./types"

// ── Normalise fill-blank input ────────────────────────────────────────────────

function normalise(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, " ")
}

// ── Check answer (single question) ───────────────────────────────────────────

export function checkAnswer(question: Question, selected: OptionKey): QuizAnswer {
  return {
    questionId: question.id,
    selectedOption: selected,
    isCorrect: selected === question.correctAnswer,
  }
}

/**
 * Check mc-multi answer with partial credit.
 * selectedKeys: array of selected option keys e.g. ["A", "C"]
 * correctAnswer: comma-separated string e.g. "A,C,E"
 * Returns pointsEarned = number of correct selections (1 point per correct answer)
 */
export function checkMultiAnswer(
  question: Question,
  selectedKeys: OptionKey[]
): { questionId: string | number; selectedOptions: OptionKey[]; isCorrect: boolean; pointsEarned: number } {
  const correctSet = new Set(
    (question.correctAnswer as string).split(",").map((k) => k.trim())
  )
  const selectedSet = new Set(selectedKeys.map((k) => k.trim()))

  // Count how many correct answers were selected
  let correctSelections = 0
  for (const key of selectedSet) {
    if (correctSet.has(key)) {
      correctSelections++
    }
  }

  // Deduct points for wrong selections (but don't go below 0)
  const wrongSelections = selectedSet.size - correctSelections
  const pointsEarned = Math.max(0, correctSelections - wrongSelections)

  // Fully correct = all correct answers selected and no wrong answers
  const isCorrect =
    correctSet.size === selectedSet.size &&
    [...correctSet].every((k) => selectedSet.has(k))

  return {
    questionId: question.id,
    selectedOptions: selectedKeys,
    isCorrect,
    pointsEarned
  }
}

/**
 * Check fill-blank answer: exact match after normalisation.
 * correctAnswer: pipe-separated accepted answers e.g. "answer1|answer2"
 */
export function checkFillBlankAnswer(
  question: Question,
  input: string
): { questionId: string | number; input: string; isCorrect: boolean } {
  const accepted = (question.correctAnswer as string)
    .split("|")
    .map(normalise)
  const isCorrect = accepted.includes(normalise(input))
  return { questionId: question.id, input, isCorrect }
}

/**
 * Check sentence-order answer: exact token sequence match.
 * correctAnswer: ">"-delimited correct order e.g. "明>月>松>間>照>清>泉>石>上>流"
 */
export function checkSentenceOrderAnswer(
  question: Question,
  submittedTokens: string[]
): { questionId: string | number; submittedTokens: string[]; isCorrect: boolean } {
  const correctTokens = (question.correctAnswer as string).split(">")
  const isCorrect =
    correctTokens.length === submittedTokens.length &&
    correctTokens.every((t, i) => t === submittedTokens[i])
  return { questionId: question.id, submittedTokens, isCorrect }
}

// ── Score calculation ─────────────────────────────────────────────────────────

export function calculateScore(
  questions: Question[],
  answers: Record<string | number, QuizAnswer>
): { earned: number; total: number; percentage: number } {
  let earned = 0
  let total = 0
  for (const q of questions) {
    total += q.points
    const ans = answers[q.id]
    if (ans) {
      // Use pointsEarned when present (supports partial credit for mc-multi)
      earned += ans.pointsEarned != null ? ans.pointsEarned : (ans.isCorrect ? q.points : 0)
    }
  }
  return { earned, total, percentage: total === 0 ? 0 : Math.round((earned / total) * 100) }
}

export function getPartScore(
  part: 1 | 2 | 3 | 4,
  questions: Question[],
  answers: Record<string | number, QuizAnswer>
): { earned: number; total: number } {
  const partQuestions = questions.filter((q) => q.part === part)
  let earned = 0
  let total = 0
  for (const q of partQuestions) {
    total += q.points
    const ans = answers[q.id]
    if (ans) {
      earned += ans.pointsEarned != null ? ans.pointsEarned : (ans.isCorrect ? q.points : 0)
    }
  }
  return { earned, total }
}
