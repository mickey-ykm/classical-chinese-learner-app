/**
 * Admin API integration tests — /api/quiz-prompts
 *
 * Covers the CLAUDE.md invariants:
 *  - POST saves to Supabase with text slug id
 *  - GET reads from Supabase not local file
 *  - DELETE removes from Supabase
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.test") })

const request = require("supertest")
const { createClient } = require("@supabase/supabase-js")

let app
let supabase

const TEST_PROMPT_NAME = "Test Prompt " + Date.now()
let createdPromptId = null

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
  // Clean up any leftover test prompts by name pattern
  await supabase.from("quiz_prompts").delete().like("name", "Test Prompt %")
})

afterAll(async () => {
  if (supabase) await supabase.from("quiz_prompts").delete().like("name", "Test Prompt %")
})

function skipIfNoApp(fn) {
  return async () => {
    if (!app) return
    await fn()
  }
}

describe("POST /api/quiz-prompts", () => {
  it(
    "saves to Supabase with a text slug id",
    skipIfNoApp(async () => {
      const res = await request(app)
        .post("/api/quiz-prompts")
        .send({
          name: TEST_PROMPT_NAME,
          description: "A test prompt",
          promptTemplate: "You are a test. Generate questions for: {{article}}",
          defaultModel: "qwen/qwen3.6-flash",
        })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.prompt).toBeDefined()
      expect(typeof res.body.prompt.id).toBe("string")
      // id should be a slug, not a uuid
      expect(res.body.prompt.id).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      )
      createdPromptId = res.body.prompt.id

      // Verify it landed in Supabase
      const { data } = await supabase
        .from("quiz_prompts")
        .select("*")
        .eq("id", createdPromptId)
        .single()
      expect(data).toBeTruthy()
      expect(data.name).toBe(TEST_PROMPT_NAME)
      expect(data.prompt_template).toBe("You are a test. Generate questions for: {{article}}")
    })
  )

  it(
    "returns 400 when name is missing",
    skipIfNoApp(async () => {
      const res = await request(app)
        .post("/api/quiz-prompts")
        .send({ promptTemplate: "test" })
      expect(res.status).toBe(400)
    })
  )

  it(
    "returns 400 when promptTemplate is missing",
    skipIfNoApp(async () => {
      const res = await request(app)
        .post("/api/quiz-prompts")
        .send({ name: "No Template Prompt" })
      expect(res.status).toBe(400)
    })
  )
})

describe("GET /api/quiz-prompts", () => {
  it(
    "reads from Supabase (returns array including the prompt we just created)",
    skipIfNoApp(async () => {
      const res = await request(app).get("/api/quiz-prompts")
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      if (createdPromptId) {
        const found = res.body.find((p) => p.id === createdPromptId)
        expect(found).toBeDefined()
        expect(found.name).toBe(TEST_PROMPT_NAME)
      }
    })
  )
})

describe("PUT /api/quiz-prompts/:id", () => {
  it(
    "updates an existing prompt in Supabase",
    skipIfNoApp(async () => {
      if (!createdPromptId) return
      const res = await request(app)
        .put(`/api/quiz-prompts/${createdPromptId}`)
        .send({
          name: TEST_PROMPT_NAME + " (updated)",
          description: "Updated description",
          promptTemplate: "Updated template: {{article}}",
        })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const { data } = await supabase
        .from("quiz_prompts")
        .select("name")
        .eq("id", createdPromptId)
        .single()
      expect(data.name).toBe(TEST_PROMPT_NAME + " (updated)")
    })
  )
})

describe("DELETE /api/quiz-prompts/:id", () => {
  it(
    "removes the prompt from Supabase",
    skipIfNoApp(async () => {
      if (!createdPromptId) return

      // Ensure there are at least 2 prompts so we can delete one
      const { data: allBefore } = await supabase.from("quiz_prompts").select("id")
      if (!allBefore || allBefore.length <= 1) {
        await supabase.from("quiz_prompts").insert({
          id: "dummy-prompt-for-delete-test",
          name: "Dummy Prompt",
          description: "",
          prompt_template: "dummy",
        })
      }

      const res = await request(app).delete(`/api/quiz-prompts/${createdPromptId}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const { data } = await supabase
        .from("quiz_prompts")
        .select("id")
        .eq("id", createdPromptId)
        .maybeSingle()
      expect(data).toBeNull()

      // Clean up dummy
      await supabase.from("quiz_prompts").delete().eq("id", "dummy-prompt-for-delete-test")
    })
  )

  it(
    "returns 404 for non-existent prompt",
    skipIfNoApp(async () => {
      const res = await request(app).delete("/api/quiz-prompts/does-not-exist-xyz")
      expect(res.status).toBe(404)
    })
  )
})
