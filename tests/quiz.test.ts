import { describe, it, expect } from "@jest/globals"
import { checkAnswer, calculateScore, getPartScore } from "@/lib/quiz"
import quizData from "@/data/quizzes/wang-rong-he-jiao.json"
import type { Question, QuizAnswer, OptionKey } from "@/lib/types"

const allQuestions = quizData.parts.flatMap((p) => p.questions) as unknown as Question[]

const ANSWER_KEY: Record<string | number, OptionKey> = {
  1: "B", 2: "C", 3: "C", 4: "B", 5: "D",
  6: "B", 7: "B", 8: "C", 9: "A", 10: "C",
  11: "C", 12: "B", 13: "B", 14: "A", 15: "C",
  16: "A", 17: "B", 18: "C", 19: "C", 20: "C",
  21: "B", 22: "C", 23: "B", 24: "C", 25: "B",
  26: "C", 27: "B", 28: "D", 29: "C", 30: "C", 31: "B",
}

describe("checkAnswer", () => {
  it("returns isCorrect=true when selected option matches correctAnswer", () => {
    const q = allQuestions.find((q) => q.id === 21)!
    const result = checkAnswer(q, "B")
    expect(result.isCorrect).toBe(true)
    expect(result.selectedOption).toBe("B")
    expect(result.questionId).toBe(21)
  })

  it("returns isCorrect=false when selected option does not match", () => {
    const q = allQuestions.find((q) => q.id === 21)!
    expect(checkAnswer(q, "A").isCorrect).toBe(false)
  })

  it("validates all 31 answer key entries", () => {
    for (const q of allQuestions) {
      const result = checkAnswer(q, ANSWER_KEY[q.id])
      expect(result.isCorrect).toBe(true)
    }
  })

  it("returns isCorrect=false for every wrong option on Q28 (D)", () => {
    const q = allQuestions.find((q) => q.id === 28)!
    for (const opt of ["A", "B", "C"] as OptionKey[]) {
      expect(checkAnswer(q, opt).isCorrect).toBe(false)
    }
    expect(checkAnswer(q, "D").isCorrect).toBe(true)
  })
})

describe("calculateScore", () => {
  it("returns 0/46 when no questions are answered", () => {
    const { earned, total } = calculateScore(allQuestions, {})
    expect(earned).toBe(0)
    expect(total).toBe(46)
  })

  it("returns 100% when all answers are correct", () => {
    const answers: Record<string | number, QuizAnswer> = {}
    for (const q of allQuestions) {
      answers[q.id] = { questionId: q.id, selectedOption: q.correctAnswer, isCorrect: true }
    }
    const { earned, total, percentage } = calculateScore(allQuestions, answers)
    expect(earned).toBe(46)
    expect(total).toBe(46)
    expect(percentage).toBe(100)
  })

  it("weights Part 3 questions at 3 points each", () => {
    const part3 = allQuestions.filter((q) => q.part === 3)
    const answers: Record<string | number, QuizAnswer> = {}
    for (const q of part3) {
      answers[q.id] = { questionId: q.id, selectedOption: q.correctAnswer, isCorrect: true }
    }
    expect(calculateScore(part3, answers).earned).toBe(12)
  })

  it("scores Part 1 only correct as 20 points", () => {
    const answers: Record<string | number, QuizAnswer> = {}
    for (const q of allQuestions.filter((q) => q.part === 1)) {
      answers[q.id] = { questionId: q.id, selectedOption: q.correctAnswer, isCorrect: true }
    }
    expect(calculateScore(allQuestions, answers).earned).toBe(20)
  })

  it("rounds percentage correctly for a non-integer result", () => {
    const q = allQuestions.find((q) => q.part === 3)!
    const answers: Record<string | number, QuizAnswer> = {
      [q.id]: { questionId: q.id, selectedOption: q.correctAnswer, isCorrect: true },
    }
    const { percentage } = calculateScore(allQuestions, answers)
    expect(percentage).toBe(Math.round((3 / 46) * 100))
  })
})

describe("getPartScore", () => {
  it("returns correct totals for each part", () => {
    const expected: Record<number, number> = { 1: 20, 2: 6, 3: 12, 4: 8 }
    for (const part of [1, 2, 3, 4] as const) {
      const { total } = getPartScore(part, allQuestions, {})
      expect(total).toBe(expected[part])
    }
  })

  it("sums all part totals to 46", () => {
    const sum = ([1, 2, 3, 4] as const)
      .map((p) => getPartScore(p, allQuestions, {}).total)
      .reduce((a, b) => a + b, 0)
    expect(sum).toBe(46)
  })
})
