/**
 * Admin API integration tests — /api/exercises
 *
 * Covers the CLAUDE.md invariants:
 *  - PUT does not wipe quiz_json when no quiz payload sent
 *  - PUT saves article_type correctly → is_dse_core derived
 *  - POST creates article; PUT updates without touching questions
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.test") })

const request = require("supertest")
const { createClient } = require("@supabase/supabase-js")

let app
let supabase

const ARTICLE_ID = "test-exercises-" + Date.now()
const DSE_ID = "test-ex-dse-" + Date.now()

const ARTICLE_FIXTURE = {
  id: ARTICLE_ID,
  title: "測試文章",
  source: "測試",
  segments: [{ id: 1, text: "天下皆知美之為美。" }],
  footnotes: [],
  modernTranslation: null,
}

const QUIZ_FIXTURE = {
  articleId: ARTICLE_ID,
  totalPoints: 1,
  parts: [
    {
      part: 1,
      title: "第一部分",
      pointsPerQuestion: 1,
      questions: [
        {
          id: 1,
          part: 1,
          points: 1,
          stem: "「天」的意思是？",
          options: [
            { key: "A", text: "地" },
            { key: "B", text: "天" },
            { key: "C", text: "人" },
            { key: "D", text: "水" },
          ],
          correctAnswer: "B",
          explanation: "天即sky。",
        },
      ],
    },
  ],
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
  await supabase.from("articles").delete().like("id", "test-exercises-%")
  await supabase.from("articles").delete().like("id", "test-ex-dse-%")
})

afterAll(async () => {
  if (supabase) {
    await supabase.from("articles").delete().like("id", "test-exercises-%")
    await supabase.from("articles").delete().like("id", "test-ex-dse-%")
  }
})

function skipIfNoApp(fn) {
  return async () => { if (!app) return; await fn() }
}

// ── POST /api/exercises ──────────────────────────────────────────────────────

describe("POST /api/exercises", () => {
  it("creates a new article without a quiz payload", skipIfNoApp(async () => {
    const res = await request(app)
      .post("/api/exercises")
      .send({ article: ARTICLE_FIXTURE, status: "draft", isFree: false, isChallenge: false, articleType: "other" })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const { data } = await supabase.from("articles").select("*").eq("id", ARTICLE_ID).single()
    expect(data).toBeTruthy()
    expect(data.quiz_json).toBeNull()
  }))

  it("returns 409 on duplicate id", skipIfNoApp(async () => {
    const res = await request(app)
      .post("/api/exercises")
      .send({ article: ARTICLE_FIXTURE, status: "draft", isFree: false, isChallenge: false })
    expect(res.status).toBe(409)
  }))
})

// ── GET /api/exercises/:id ───────────────────────────────────────────────────

describe("GET /api/exercises/:id", () => {
  it("returns the article row", skipIfNoApp(async () => {
    const res = await request(app).get(`/api/exercises/${ARTICLE_ID}`)
    expect(res.status).toBe(200)
    expect(res.body.article.id).toBe(ARTICLE_ID)
  }))

  it("returns 404 for unknown id", skipIfNoApp(async () => {
    const res = await request(app).get("/api/exercises/does-not-exist-xyz")
    expect(res.status).toBe(404)
  }))
})

// ── PUT /api/exercises/:id — quiz_json invariant ─────────────────────────────

describe("PUT /api/exercises/:id — quiz_json invariant", () => {
  it("does not wipe quiz_json when no quiz payload sent", skipIfNoApp(async () => {
    await supabase.from("articles").update({ quiz_json: QUIZ_FIXTURE }).eq("id", ARTICLE_ID)

    const before = await supabase.from("articles").select("quiz_json").eq("id", ARTICLE_ID).single()
    expect(before.data.quiz_json).not.toBeNull()

    const res = await request(app)
      .put(`/api/exercises/${ARTICLE_ID}`)
      .send({
        article: ARTICLE_FIXTURE,
        status: "published",
        isFree: false,
        isChallenge: false,
        articleType: "other",
        expectedMinutes: 10,
      })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const after = await supabase.from("articles").select("quiz_json").eq("id", ARTICLE_ID).single()
    expect(after.data.quiz_json).not.toBeNull()
  }))
})

// ── PUT /api/exercises/:id — article_type / is_dse_core ─────────────────────

describe("PUT /api/exercises/:id — article_type and is_dse_core", () => {
  const DSE_ARTICLE = { ...ARTICLE_FIXTURE, id: DSE_ID }

  beforeAll(skipIfNoApp(async () => {
    await request(app)
      .post("/api/exercises")
      .send({ article: DSE_ARTICLE, status: "draft", isFree: false, isChallenge: false })
  }))

  it("saves article_type correctly", skipIfNoApp(async () => {
    const res = await request(app)
      .put(`/api/exercises/${DSE_ID}`)
      .send({ article: DSE_ARTICLE, status: "published", isFree: false, isChallenge: false, articleType: "dse-exam" })
    expect(res.status).toBe(200)

    const { data } = await supabase.from("articles").select("article_type").eq("id", DSE_ID).single()
    expect(data.article_type).toBe("dse-exam")
  }))

  it("sets is_dse_core=true when articleType=dse-exam", skipIfNoApp(async () => {
    const { data } = await supabase.from("articles").select("is_dse_core").eq("id", DSE_ID).single()
    expect(data.is_dse_core).toBe(true)
  }))

  it("sets is_dse_core=false when articleType=other", skipIfNoApp(async () => {
    const res = await request(app)
      .put(`/api/exercises/${DSE_ID}`)
      .send({ article: DSE_ARTICLE, status: "published", isFree: false, isChallenge: false, articleType: "other" })
    expect(res.status).toBe(200)

    const { data } = await supabase.from("articles").select("is_dse_core").eq("id", DSE_ID).single()
    expect(data.is_dse_core).toBe(false)
  }))
})
