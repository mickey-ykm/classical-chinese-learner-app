const { sampleByPart, DEFAULT_PART_QUOTAS } = require("../lib/sampling")

// Total quota across all parts: 6+2+4+2+2+6 = 22
const TOTAL_QUOTA = DEFAULT_PART_QUOTAS.reduce((s, p) => s + p.count, 0)

// Helper: create a question row
function q(id, part, extra = {}) {
  return { id, part, stem: `Question ${id}`, format: "mc", ...extra }
}

// Build a full pool: enough questions per part to always satisfy quotas
function fullPool() {
  const questions = []
  let id = 1
  for (const { part, count } of DEFAULT_PART_QUOTAS) {
    for (let i = 0; i < count * 2; i++) {
      questions.push(q(id++, part))
    }
  }
  return questions
}

describe("sampleByPart", () => {
  test("1. Full pool (no seen) → returns correct count per part", () => {
    const questions = fullPool()
    const seenMap = new Map()
    const sampled = sampleByPart(questions, seenMap)

    expect(sampled.length).toBe(TOTAL_QUOTA)

    for (const { part, count } of DEFAULT_PART_QUOTAS) {
      const partSampled = sampled.filter((q) => q.part === part)
      expect(partSampled.length).toBe(count)
    }
  })

  test("2. All seen, sorted by last_seen_at → returns least-recently-seen first", () => {
    // Part 1 has quota 6; create exactly 6 questions all seen at different times
    const questions = [
      q(1, 1), q(2, 1), q(3, 1), q(4, 1), q(5, 1), q(6, 1),
    ]
    const seenMap = new Map([
      ["1", "2024-01-06T00:00:00Z"], // most recent
      ["2", "2024-01-05T00:00:00Z"],
      ["3", "2024-01-04T00:00:00Z"],
      ["4", "2024-01-03T00:00:00Z"],
      ["5", "2024-01-02T00:00:00Z"],
      ["6", "2024-01-01T00:00:00Z"], // oldest
    ])

    // Run many times to confirm oldest-first selection is consistent
    // (with all-seen and pool == quota, the 6 oldest are always selected)
    for (let trial = 0; trial < 20; trial++) {
      const sampled = sampleByPart(questions, seenMap)
      const part1 = sampled.filter((q) => q.part === 1)
      expect(part1.length).toBe(6)
      // All 6 must be included since pool == quota
      const ids = new Set(part1.map((q) => q.id))
      expect(ids.size).toBe(6)
    }
  })

  test("3. Part has fewer questions than quota → returns all available for that part", () => {
    // Part 1 quota is 6, but only 3 questions exist
    const questions = [q(1, 1), q(2, 1), q(3, 1)]
    const seenMap = new Map()
    const sampled = sampleByPart(questions, seenMap)

    const part1 = sampled.filter((q) => q.part === 1)
    expect(part1.length).toBe(3) // capped at available
  })

  test("4. Part has no questions → that part contributes 0 questions", () => {
    // Only supply questions for parts 1 and 6, skip all middle parts
    const questions = [
      q(1, 1), q(2, 1), q(3, 1), q(4, 1), q(5, 1), q(6, 1),
      q(7, 6), q(8, 6), q(9, 6), q(10, 6), q(11, 6), q(12, 6),
    ]
    const seenMap = new Map()
    const sampled = sampleByPart(questions, seenMap)

    const parts = new Set(sampled.map((q) => q.part))
    expect(parts.has(2)).toBe(false)
    expect(parts.has(3)).toBe(false)
    expect(parts.has(4)).toBe(false)
    expect(parts.has(5)).toBe(false)
    expect(parts.has(1)).toBe(true)
    expect(parts.has(6)).toBe(true)
    expect(sampled.length).toBe(12) // 6 + 6
  })

  test("5. Mix of seen and unseen → unseen always returned before seen fill-up", () => {
    // Part 1 quota = 6; 4 unseen + 4 seen. Should pick all 4 unseen + 2 oldest seen.
    const questions = [
      q(1, 1), q(2, 1), q(3, 1), q(4, 1), // unseen
      q(5, 1), q(6, 1), q(7, 1), q(8, 1), // seen
    ]
    const seenMap = new Map([
      ["5", "2024-01-04T00:00:00Z"],
      ["6", "2024-01-01T00:00:00Z"], // oldest
      ["7", "2024-01-03T00:00:00Z"],
      ["8", "2024-01-02T00:00:00Z"], // second oldest
    ])

    // Run multiple trials — unseen ids 1-4 must always all appear
    for (let trial = 0; trial < 30; trial++) {
      const sampled = sampleByPart(questions, seenMap)
      const part1 = sampled.filter((q) => q.part === 1)
      expect(part1.length).toBe(6)

      const ids = new Set(part1.map((q) => q.id))
      // All 4 unseen must be present
      expect(ids.has(1)).toBe(true)
      expect(ids.has(2)).toBe(true)
      expect(ids.has(3)).toBe(true)
      expect(ids.has(4)).toBe(true)

      // The 2 fill slots must be the 2 oldest seen: ids 6 and 8
      expect(ids.has(6)).toBe(true)
      expect(ids.has(8)).toBe(true)
      // id 5 (newer seen) and id 7 must not appear
      expect(ids.has(5)).toBe(false)
      expect(ids.has(7)).toBe(false)
    }
  })
})
