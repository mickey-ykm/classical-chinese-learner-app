/**
 * Unit tests — student performance aggregation (pure, no Supabase needed)
 */
const {
  parseDays, isRegistered, filterSessions, sessionScoreRatio,
  summarizeSessions, accuracyBy, flagQuestion, questionStats, weakestKey,
} = require("../lib/performance-helpers")

const profiles = new Map([
  ["u1", { id: "u1", email: "a@x.com" }],
  ["u2", { id: "u2", email: null }], // anonymous auth user
])

const sess = (o) => ({
  id: "s", user_id: "u1", kind: "article-quiz", started_at: "2026-10-01T10:00:00Z",
  finished_at: "2026-10-01T10:10:00Z", score: 10, total_points: 20,
  total_seconds: 600, expected_seconds: 1200, ...o,
})

describe("session filtering", () => {
  const sessions = [sess({ id: "a" }), sess({ id: "b", user_id: "u2" }), sess({ id: "c", user_id: null })]
  test("registered requires an email on the profile", () => {
    expect(isRegistered(sessions[0], profiles)).toBe(true)
    expect(isRegistered(sessions[1], profiles)).toBe(false)
    expect(isRegistered(sessions[2], profiles)).toBe(false)
  })
  test("includeAnonymous=false keeps only registered", () => {
    expect(filterSessions(sessions, profiles, false).map(s => s.id)).toEqual(["a"])
    expect(filterSessions(sessions, profiles, true)).toHaveLength(3)
  })
})

describe("summarizeSessions", () => {
  test("detects abandoned sessions, score and pace", () => {
    const r = summarizeSessions([
      sess({ id: "a" }),
      sess({ id: "b", finished_at: null, score: null }),
      sess({ id: "c", kind: "weight-training", score: 20, total_points: 20, total_seconds: 1800 }),
    ])
    expect(r.totalSessions).toBe(3)
    expect(r.abandonedSessions).toBe(1)
    expect(r.completionRate).toBeCloseTo(0.667, 2)
    expect(r.avgScoreRatio).toBeCloseTo(0.75, 2) // (0.5 + 1) / 2
    expect(r.byKind["weight-training"].avgScoreRatio).toBe(1)
    expect(r.sessionsPerDay).toEqual([{ date: "2026-10-01", count: 3 }])
  })
  test("unfinished or zero-total sessions have no score ratio", () => {
    expect(sessionScoreRatio(sess({ finished_at: null }))).toBeNull()
    expect(sessionScoreRatio(sess({ total_points: 0 }))).toBeNull()
  })
})

describe("accuracy and question stats", () => {
  const meta = new Map([
    ["q1", { id: "q1", part: 1, questionTypes: ["字詞解釋", "語句翻譯"] }],
    ["q2", { id: "q2", part: 7, questionTypes: [] }],
  ])
  const ans = (qid, ok, sid = "s") => ({ question_id: qid, is_correct: ok, points_earned: ok ? 1 : 0, session_id: sid })

  test("accuracyBy part and multi-label types", () => {
    const answers = [ans("q1", true), ans("q1", false), ans("q2", false), ans("gone", true)]
    const byPart = accuracyBy(answers, meta, m => [m.part])
    expect(byPart.find(g => g.key === 1).accuracy).toBe(0.5)
    expect(byPart.find(g => g.key === 7).accuracy).toBe(0)
    const byType = accuracyBy(answers, meta, m => m.questionTypes)
    expect(byType.map(g => g.key).sort()).toEqual(["字詞解釋", "語句翻譯"])
  })

  test("flags and minAttempts", () => {
    expect(flagQuestion(0.2)).toBe("hard")
    expect(flagQuestion(0.96)).toBe("easy")
    expect(flagQuestion(0.5)).toBeNull()
    const answers = [
      ...Array(5).fill(0).map(() => ans("q1", false)),
      ans("q2", true), ans("q2", true),
    ]
    const rows = questionStats(answers, meta, { minAttempts: 5 })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ questionId: "q1", attempts: 5, accuracy: 0, flag: "hard" })
  })

  test("weakestKey ignores groups with too few answers", () => {
    const groups = [
      { key: 1, answers: 10, accuracy: 0.8 },
      { key: 2, answers: 1, accuracy: 0 },
      { key: 3, answers: 5, accuracy: 0.4 },
    ]
    expect(weakestKey(groups)).toBe(3)
  })
})

test("parseDays clamps and defaults", () => {
  expect(parseDays(undefined)).toBe(30)
  expect(parseDays("7")).toBe(7)
  expect(parseDays("9999")).toBe(365)
  expect(parseDays("-3")).toBe(30)
})
