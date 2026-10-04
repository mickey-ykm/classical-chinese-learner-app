/**
 * Unit tests — cross-article batch import validation (pure, no Supabase needed)
 */
const { normalizeImportQuestion } = require("../lib/cross-article-helpers")

const base = { part: 7, questionText: "題目", relatedArticleIds: ["a1"] }

describe("normalizeImportQuestion", () => {
  test("accepts a valid single-select MC and forces draft", () => {
    const { errors, question } = normalizeImportQuestion({
      ...base, options: ["甲", "乙", "丙"], correctAnswer: "b", status: "published",
    })
    expect(errors).toEqual([])
    expect(question.correctAnswer).toBe("B")
    expect(question.selectCount).toBe(1)
    expect(question.status).toBe("draft")
  })

  test("multi-select derives selectCount and rejects a mismatch", () => {
    expect(normalizeImportQuestion({ ...base, options: ["a", "b", "c"], correctAnswer: "A,C" }).question.selectCount).toBe(2)
    expect(normalizeImportQuestion({ ...base, options: ["a", "b", "c"], correctAnswer: "A,C", selectCount: 1 }).errors.length).toBe(1)
  })

  test("rejects bad part, missing articles, missing option key", () => {
    const { errors } = normalizeImportQuestion({ part: 9, questionText: "x", options: ["a", "b"], correctAnswer: "D" })
    expect(errors.join("|")).toMatch(/part must be 7 or 8/)
    expect(errors.join("|")).toMatch(/relatedArticleIds/)
    expect(errors.join("|")).toMatch(/missing option/)
  })

  test("sentence-order answer must be a permutation of the tokens", () => {
    const so = { ...base, part: 8, format: "sentence-order", sequenceTokens: ["天", "地", "人"] }
    expect(normalizeImportQuestion({ ...so, correctAnswer: "天>地>人" }).errors).toEqual([])
    expect(normalizeImportQuestion({ ...so, correctAnswer: "天>地" }).errors.length).toBe(1)
  })

  test("rejects unknown questionTypes", () => {
    expect(normalizeImportQuestion({ ...base, options: ["a", "b"], correctAnswer: "A", questionTypes: ["亂寫"] }).errors.length).toBe(1)
  })
})
