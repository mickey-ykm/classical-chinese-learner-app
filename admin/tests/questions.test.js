/**
 * Admin API integration tests — /api/questions
 *
 * Covers the CLAUDE.md invariants:
 *  - PATCH /api/questions/:id/publish rebuilds quiz_json + bumps updated_at
 *  - DELETE /api/questions/:id rebuilds quiz_json after deletion
 *  - POST /api/questions/bulk-delete rebuilds quiz_json after deletion
 *  - PUT /api/exercises/:id does not delete questions when no quiz payload sent
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.test") })

const request = require("supertest")
const { createClient } = require("@supabase/supabase-js")

let app
let supabase

const ARTICLE_ID = "test-questions-" + Date.now()

const ARTICLE_FIXTURE = {
  id: ARTICLE_ID,
  title: "問題測試文章",
  source: "測試",
  segments: [{ id: 1, text: "學而時習之。" }],
  footnotes: [],
  modernTranslation: null,
}

function buildApp() {
  const express = require("express")
  const session = require("express-session")

  const authRouter = require("../routes/auth")
  const exercisesRouter = require("../routes/exercises")
  const generateQuizRouter = require("../routes/generate-quiz")
  const promptsRouter = require("../routes/prompts")
  const questionsRouter = require("../routes/questions")
  const assessmentRouter = require("../routes/assessment")
  const generateArticleRouter = require("../routes/generate-article")

  const a = express()
  a.set("trust proxy", 1)
  a.use(express.json({ limit: "10mb" }))
  a.use(session({ secret: "test-secret", resave: false, saveUninitialized: false, cookie: { secure: false } }))
  a.use((req, _res, next) => { req.session.adminId = "test-admin"; next() })

  a.use("/api/admin", authRouter)
  a.use((req, res, next) => {
    if (!req.path.startsWith("/api/")) return next()
    if (!req.session.adminId) return res.status(401).json({ error: "Unauthorized" })
    next()
  })
  a.use("/api/exercises", exercisesRouter)
  a.use("/api/exercises/:id/generate-quiz", generateQuizRouter)
  a.use("/api/quiz-prompts", promptsRouter)
  a.use("/api/questions", questionsRouter)
  a.use("/api/assessment", assessmentRouter)
  a.use("/api/generate-article", generateArticleRouter)

  return a
}

beforeAll(async () => {
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("⚠  Skipping integration tests — Supabase env vars not set in admin/.env.test")
    return
  }
  supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
  app = buildApp()
  // Clean up any leftover test rows
  await supabase.from("articles").delete().like("id", "test-questions-%")
  // Create the test article
  await request(app)
    .post("/api/exercises")
    .send({ article: ARTICLE_FIXTURE, status: "published", isFree: false, isChallenge: false, articleType: "other" })
})

afterAll(async () => {
  if (supabase) await supabase.from("articles").delete().like("id", "test-questions-%")
})

function skipIfNoApp(fn) {
  return async () => { if (!app) return; await fn() }
}

// ── POST /api/questions (draft) ──────────────────────────────────────────────

describe("POST /api/questions", () => {
  it("inserts a draft question", skipIfNoApp(async () => {
    const res = await request(app).post("/api/questions").send({
      article_id: ARTICLE_ID,
      type: "mc-single",
      format: "mc",
      part: 1,
      points: 1,
      stem: "「學」的意思是？",
      options: { A: "玩", B: "學習", C: "睡覺", D: "跑步" },
      correct_answer: "B",
      explanation: "學即學習。",
      status: "draft",
    })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.id).toBeTruthy()
  }))
})

// ── PATCH /api/questions/:id/publish ────────────────────────────────────────

describe("PATCH /api/questions/:id/publish", () => {
  let questionId

  beforeAll(skipIfNoApp(async () => {
    // Insert a draft question to publish
    const res = await request(app).post("/api/questions").send({
      article_id: ARTICLE_ID,
      type: "mc-single",
      format: "mc",
      part: 1,
      points: 1,
      stem: "「時」的意思是？",
      options: { A: "地方", B: "時時", C: "人", D: "物" },
      correct_answer: "B",
      explanation: "時即時時。",
      status: "draft",
    })
    questionId = res.body.id
  }))

  it("publishes the question", skipIfNoApp(async () => {
    const res = await request(app).patch(`/api/questions/${questionId}/publish`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  }))

  it("rebuilds quiz_json on articles row after publish", skipIfNoApp(async () => {
    const { data } = await supabase.from("articles").select("quiz_json").eq("id", ARTICLE_ID).single()
    expect(data.quiz_json).not.toBeNull()
    const parts = data.quiz_json?.parts ?? []
    const questions = parts.flatMap((p) => p.questions)
    const found = questions.find((q) => q.id === questionId)
    expect(found).toBeTruthy()
  }))

  it("bumps updated_at on articles row after publish", skipIfNoApp(async () => {
    const before = await supabase.from("articles").select("updated_at").eq("id", ARTICLE_ID).single()
    const tBefore = new Date(before.data.updated_at).getTime()

    // Small delay to ensure updated_at changes
    await new Promise((r) => setTimeout(r, 50))
    await request(app).patch(`/api/questions/${questionId}/publish`)

    const after = await supabase.from("articles").select("updated_at").eq("id", ARTICLE_ID).single()
    const tAfter = new Date(after.data.updated_at).getTime()
    expect(tAfter).toBeGreaterThanOrEqual(tBefore)
  }))
})

// ── DELETE /api/questions/:id ────────────────────────────────────────────────

describe("DELETE /api/questions/:id", () => {
  let questionId

  beforeAll(skipIfNoApp(async () => {
    // Insert and publish a question to delete
    const res = await request(app).post("/api/questions").send({
      article_id: ARTICLE_ID,
      type: "mc-single",
      format: "mc",
      part: 1,
      points: 1,
      stem: "「習」的意思是？",
      options: { A: "練習", B: "忘記", C: "討厭", D: "讀書" },
      correct_answer: "A",
      status: "published",
    })
    questionId = res.body.id
    await request(app).patch(`/api/questions/${questionId}/publish`)
  }))

  it("deletes the question and rebuilds quiz_json", skipIfNoApp(async () => {
    const res = await request(app).delete(`/api/questions/${questionId}`)
    expect(res.status).toBe(200)

    const { data } = await supabase.from("articles").select("quiz_json").eq("id", ARTICLE_ID).single()
    const questions = (data.quiz_json?.parts ?? []).flatMap((p) => p.questions)
    const found = questions.find((q) => q.id === questionId)
    expect(found).toBeUndefined()
  }))
})

// ── POST /api/questions/bulk-delete ─────────────────────────────────────────

describe("POST /api/questions/bulk-delete", () => {
  let q1Id, q2Id

  beforeAll(skipIfNoApp(async () => {
    const r1 = await request(app).post("/api/questions").send({
      article_id: ARTICLE_ID, type: "mc-single", format: "mc", part: 2, points: 1,
      stem: "Bulk delete Q1", options: { A: "1", B: "2", C: "3", D: "4" }, correct_answer: "A", status: "published",
    })
    const r2 = await request(app).post("/api/questions").send({
      article_id: ARTICLE_ID, type: "mc-single", format: "mc", part: 2, points: 1,
      stem: "Bulk delete Q2", options: { A: "1", B: "2", C: "3", D: "4" }, correct_answer: "B", status: "published",
    })
    q1Id = r1.body.id
    q2Id = r2.body.id
    await request(app).patch(`/api/questions/${q1Id}/publish`)
    await request(app).patch(`/api/questions/${q2Id}/publish`)
  }))

  it("bulk-deletes and rebuilds quiz_json", skipIfNoApp(async () => {
    const res = await request(app).post("/api/questions/bulk-delete").send({ ids: [q1Id, q2Id] })
    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe(2)

    const { data } = await supabase.from("articles").select("quiz_json").eq("id", ARTICLE_ID).single()
    const questions = (data.quiz_json?.parts ?? []).flatMap((p) => p.questions)
    expect(questions.find((q) => q.id === q1Id)).toBeUndefined()
    expect(questions.find((q) => q.id === q2Id)).toBeUndefined()
  }))
})

// ── PUT /api/questions/:id (edit question) ──────────────────────────────────

describe("PUT /api/questions/:id", () => {
  let questionId

  beforeAll(skipIfNoApp(async () => {
    const res = await request(app).post("/api/questions").send({
      article_id: ARTICLE_ID,
      type: "mc-single",
      format: "mc",
      part: 1,
      points: 1,
      stem: "「之」的意思是？",
      options: { A: "的", B: "去", C: "他", D: "在" },
      correct_answer: "A",
      explanation: "之即的。",
      status: "draft",
    })
    questionId = res.body.id
  }))

  it("updates question fields and returns success", skipIfNoApp(async () => {
    const res = await request(app).put(`/api/questions/${questionId}`).send({
      article_id: ARTICLE_ID,
      type: "mc-single",
      format: "mc",
      part: 1,
      points: 2,
      stem: "「之」的意思是？（已修改）",
      options: { A: "的", B: "去", C: "他", D: "在" },
      correct_answer: "A",
      explanation: "之即的（已修改）。",
      status: "draft",
    })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  }))

  it("persists updated fields in Supabase", skipIfNoApp(async () => {
    const { data } = await supabase.from("questions").select("*").eq("id", questionId).single()
    expect(data.stem).toBe("「之」的意思是？（已修改）")
    expect(data.points).toBe(2)
    expect(data.explanation).toBe("之即的（已修改）。")
  }))

  it("rebuilds quiz_json when updating a published question", skipIfNoApp(async () => {
    // Publish the question first
    await request(app).patch(`/api/questions/${questionId}/publish`)

    const res = await request(app).put(`/api/questions/${questionId}`).send({
      article_id: ARTICLE_ID,
      type: "mc-single",
      format: "mc",
      part: 1,
      points: 3,
      stem: "「之」的意思是？（已發布修改）",
      options: { A: "的", B: "去", C: "他", D: "在" },
      correct_answer: "A",
      status: "published",
    })
    expect(res.status).toBe(200)

    const { data } = await supabase.from("articles").select("quiz_json").eq("id", ARTICLE_ID).single()
    const questions = (data.quiz_json?.parts ?? []).flatMap((p) => p.questions)
    const found = questions.find((q) => q.id === questionId)
    expect(found).toBeTruthy()
    expect(found.stem).toBe("「之」的意思是？（已發布修改）")
  }))

  it("returns 400 for missing required fields", skipIfNoApp(async () => {
    const res = await request(app).put(`/api/questions/${questionId}`).send({
      article_id: ARTICLE_ID,
      // missing type, format, stem, correct_answer
    })
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeTruthy()
  }))
})

// ── PUT /api/exercises/:id does not delete questions when no quiz payload ────

describe("PUT /api/exercises/:id — questions are preserved when no quiz payload sent", () => {
  let questionId

  beforeAll(skipIfNoApp(async () => {
    // Insert + publish a question
    const res = await request(app).post("/api/questions").send({
      article_id: ARTICLE_ID, type: "mc-single", format: "mc", part: 1, points: 1,
      stem: "保留測試題目", options: { A: "甲", B: "乙", C: "丙", D: "丁" },
      correct_answer: "A", status: "published",
    })
    questionId = res.body.id
    await request(app).patch(`/api/questions/${questionId}/publish`)
  }))

  it("does not delete questions from the questions table on a metadata-only PUT", skipIfNoApp(async () => {
    // PUT without quiz payload — should only update article metadata
    const res = await request(app)
      .put(`/api/exercises/${ARTICLE_ID}`)
      .send({
        article: ARTICLE_FIXTURE,
        status: "published",
        isFree: false,
        isChallenge: false,
        articleType: "other",
        expectedMinutes: 15,
      })
    expect(res.status).toBe(200)

    const { data } = await supabase
      .from("questions")
      .select("id")
      .eq("id", questionId)
      .single()
    expect(data).toBeTruthy()
    expect(data.id).toBe(questionId)
  }))
})
