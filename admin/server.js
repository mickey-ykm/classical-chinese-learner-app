require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })

const express = require("express")
const session = require("express-session")
const bcrypt = require("bcryptjs")
const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")
const { z } = require("zod")

const app = express()
const PORT = process.env.PORT || 3001
const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")

// ── Supabase client (service-role key for admin writes) ───────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase = null
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
} else {
  console.warn("  ⚠ Supabase not configured — set SUPABASE_SERVICE_ROLE_KEY in .env")
}

// ── Session store (Supabase-backed, survives Railway restarts) ────────────────

class SupabaseStore extends session.Store {
  get(sid, cb) {
    if (!supabase) return cb(null, null)
    supabase
      .from("admin_sessions")
      .select("sess, expires_at")
      .eq("sid", sid)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()
      .then(({ data }) => cb(null, data ? data.sess : null))
      .catch(() => cb(null, null))
  }

  set(sid, session, cb) {
    if (!supabase) return cb()
    const maxAge = session.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000
    const expires_at = new Date(Date.now() + maxAge).toISOString()
    supabase
      .from("admin_sessions")
      .upsert({ sid, sess: session, expires_at }, { onConflict: "sid" })
      .then(() => cb())
      .catch(() => cb())
  }

  destroy(sid, cb) {
    if (!supabase) return cb()
    supabase.from("admin_sessions").delete().eq("sid", sid)
      .then(() => cb())
      .catch(() => cb())
  }

  touch(sid, session, cb) {
    this.set(sid, session, cb)
  }
}

app.set("trust proxy", 1)
app.use(express.json({ limit: "10mb" }))
app.use(session({
  secret: process.env.ADMIN_SESSION_SECRET || "dev-secret-change-in-prod",
  resave: false,
  rolling: true,
  saveUninitialized: false,
  store: new SupabaseStore(),
  cookie: {
    httpOnly: true,
    secure: "auto",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}))
app.use(express.static(path.join(__dirname, "public")))

function requireSupabase(res) {
  if (!supabase) {
    res.status(503).json({ error: "Supabase not configured: SUPABASE_SERVICE_ROLE_KEY missing" })
    return false
  }
  return true
}

// ── Zod validation schemas ────────────────────────────────────────────────────

const SegmentSchema = z.object({
  text: z.string(),
  footnoteId: z.string().optional(),
})

const FootnoteSchema = z.object({
  id: z.string(),
  marker: z.string(),
  term: z.string(),
  explanation: z.string(),
})

const ArticleSchema = z.object({
  id: z.string().min(1, "id is required"),
  title: z.string().min(1, "title is required"),
  titleFootnoteId: z.string().optional(),
  source: z.string().optional(),
  segments: z.array(SegmentSchema).min(1, "segments[] must not be empty"),
  footnotes: z.array(FootnoteSchema),
  modernTranslation: z.array(z.string()).min(1, "modernTranslation[] must not be empty"),
})

const QuizOptionSchema = z.object({
  key: z.string().min(1),
  text: z.string().min(1),
})

const QuizQuestionSchema = z.object({
  id: z.union([z.number(), z.string()]),
  part: z.number().int().positive().optional(),
  points: z.number().int().positive().optional(),
  stem: z.string().min(1, "stem is required"),
  format: z.enum(["mc", "fill-blank", "sentence-order"]).optional(),
  type: z.string().optional(),
  options: z.array(QuizOptionSchema).optional().default([]),
  correctAnswer: z.string().optional().default(""),
  explanation: z.string().optional(),
  selectCount: z.number().int().positive().optional(),
  sequenceTokens: z.array(z.string()).optional(),
}).refine(
  (q) => {
    const fmt = q.format ?? "mc"
    if (fmt === "mc") return (q.options?.length ?? 0) >= 2
    return true
  },
  { message: "mc questions require options[] with ≥2 items" }
)

const QuizPartSchema = z.object({
  part: z.number().int().positive(),
  title: z.string(),
  pointsPerQuestion: z.number().int().positive(),
  questions: z.array(QuizQuestionSchema).min(1, "questions[] must not be empty"),
})

const QuizSchema = z.object({
  articleId: z.string().min(1, "articleId is required"),
  totalPoints: z.number().int().nonnegative(),
  parts: z.array(QuizPartSchema).min(1, "parts[] must not be empty"),
})

function formatZodErrors(zodError) {
  return zodError.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nowIso() {
  return new Date().toISOString()
}

function quizHasQuestions(quiz) {
  if (!quiz || !Array.isArray(quiz.parts) || !quiz.parts.length) return false
  return quiz.parts.some((p) => Array.isArray(p.questions) && p.questions.length > 0)
}

function countQuestions(quiz) {
  if (!quiz || !Array.isArray(quiz.parts)) return 0
  return quiz.parts.reduce((s, p) => s + (p.questions?.length || 0), 0)
}

// Maps camelCase article + meta fields to Supabase snake_case row.
function articleToRow(article, meta) {
  const level =
    typeof meta.level === "number" && meta.level >= 1 && meta.level <= 7 ? meta.level : null
  return {
    id: article.id,
    title: article.title,
    title_footnote_id: article.titleFootnoteId || null,
    source: article.source || "",
    segments: article.segments,
    footnotes: article.footnotes,
    modern_translation: article.modernTranslation,
    level,
    is_challenge: meta.isChallenge || false,
    is_free: meta.isFree || false,
    is_dse_core: meta.articleType === 'dse-exam',
    status: meta.status === "draft" ? "draft" : "published",
    expected_minutes:
      typeof meta.expectedMinutes === "number" && meta.expectedMinutes > 0
        ? meta.expectedMinutes
        : null,
    exercise_template: Array.isArray(meta.exerciseTemplate) ? meta.exerciseTemplate : null,
    quiz_json: meta.quizJson || null,
    updated_at: nowIso(),
  }
}

// Converts a Supabase article row back to the API response shape the HTML expects.
function rowToExercise(row) {
  return {
    article: {
      id: row.id,
      title: row.title,
      ...(row.title_footnote_id ? { titleFootnoteId: row.title_footnote_id } : {}),
      source: row.source || "",
      segments: row.segments,
      footnotes: row.footnotes,
      modernTranslation: row.modern_translation,
    },
    quiz: row.quiz_json || null,
    isChallenge: row.is_challenge || false,
    isFree: row.is_free || false,
    isDseCore: row.is_dse_core || false,
    articleType: row.article_type || "other",
    level: row.level ?? null,
    status: row.status || "published",
    hasQuizzes: quizHasQuestions(row.quiz_json),
    expectedMinutes: row.expected_minutes ?? null,
    exerciseTemplate: row.exercise_template ?? null,
    createdAt: row.created_at || null,
  }
}

function rowToIndexEntry(row) {
  const entry = {
    id: row.id,
    title: row.title,
    source: row.source || "",
    totalPoints: row.quiz_json?.totalPoints || 0,
    totalQuestions: countQuestions(row.quiz_json),
    createdAt: row.created_at,
    status: row.status,
    hasQuizzes: quizHasQuestions(row.quiz_json),
    articleType: row.article_type || "other",
    isFree: row.is_free || false,
    isDseCore: row.is_dse_core || false,
  }
  if (row.is_challenge) entry.type = "challenge"
  if (row.level != null) entry.level = row.level
  if (row.expected_minutes != null) entry.expectedMinutes = row.expected_minutes
  if (row.exercise_template != null) entry.exerciseTemplate = row.exercise_template
  return entry
}

async function upsertQuestions(articleId, quiz) {
  // Clear all questions for this article, then re-insert from quiz JSON.
  await supabase.from("questions").delete().eq("article_id", articleId)
  if (!quiz || !Array.isArray(quiz.parts)) return
  const rows = []
  for (const part of quiz.parts) {
    for (const q of part.questions ?? []) {
      const optMap = {}
      for (const o of q.options ?? []) optMap[o.key] = o.text
      rows.push({
        article_id: articleId,
        type: "comprehension", // Phase 7 will add proper type tagging
        format: "mc",
        part: part.part,
        points: q.points ?? part.pointsPerQuestion ?? 1,
        stem: q.stem,
        options: optMap,
        correct_answer: q.correctAnswer,
        explanation: q.explanation || null,
        status: "published",
      })
    }
  }
  if (rows.length > 0) {
    const { error } = await supabase.from("questions").insert(rows)
    if (error) throw new Error("Failed to save questions: " + error.message)
  }
}

async function insertQuestionsAsDrafts(articleId, quiz) {
  if (!quiz || !Array.isArray(quiz.parts)) return
  const rows = []
  for (const part of quiz.parts) {
    for (const q of part.questions ?? []) {
      const optMap = {}
      for (const o of q.options ?? []) optMap[o.key] = o.text
      rows.push({
        article_id: articleId,
        type: q.type || "mc-single",
        format: q.format || "mc",
        part: part.part,
        points: q.points ?? part.pointsPerQuestion ?? 1,
        stem: q.stem,
        options: optMap,
        correct_answer: q.correctAnswer || q.correct_answer || "",
        explanation: q.explanation || null,
        select_count: q.selectCount ?? q.select_count ?? 1,
        sequence_tokens: q.sequenceTokens ?? q.sequence_tokens ?? null,
        status: "draft",
      })
    }
  }
  if (rows.length > 0) {
    const { error } = await supabase.from("questions").insert(rows)
    if (error) throw new Error("Failed to save draft questions: " + error.message)
  }
}

async function createVersionSnapshot(articleId, snapshot) {
  await supabase.from("article_versions").insert({
    article_id: articleId,
    snapshot,
    edited_by: "admin",
  })
}

// Rebuild quiz_json on the articles row from published questions so the mobile app picks it up.
async function rebuildQuizJson(articleId) {
  const [questionsResult, articleResult] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .eq("article_id", articleId)
      .eq("status", "published")
      .order("part", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true }),
    supabase.from("articles").select("quiz_json").eq("id", articleId).single(),
  ])
  if (questionsResult.error) throw new Error("rebuildQuizJson fetch: " + questionsResult.error.message)

  const data = questionsResult.data
  if (!data || data.length === 0) {
    await supabase.from("articles").update({ quiz_json: null, updated_at: nowIso() }).eq("id", articleId)
    return
  }

  // Preserve existing part titles from quiz_json if available
  const existingParts = articleResult.data?.quiz_json?.parts ?? []
  const existingTitleByPart = Object.fromEntries(existingParts.map((p) => [p.part, p.title]))

  // Group into parts
  const partsMap = new Map()
  for (const q of data) {
    const part = q.part ?? 1
    if (!partsMap.has(part)) partsMap.set(part, [])
    partsMap.get(part).push(q)
  }

  const parts = Array.from(partsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([partNum, qs]) => ({
      part: partNum,
      title: existingTitleByPart[partNum] || `第${partNum}部分`,
      pointsPerQuestion: qs[0]?.points ?? 1,
      questions: qs.map((q) => ({
        id: q.id,
        part: q.part ?? partNum,
        points: q.points ?? 1,
        stem: q.stem,
        format: q.format || "mc",
        type: q.type || "mc-single",
        options: q.options
          ? Object.entries(q.options).map(([key, text]) => ({ key, text }))
          : [],
        correctAnswer: q.correct_answer,
        explanation: q.explanation || null,
        select_count: q.select_count ?? 1,
        sequence_tokens: q.sequence_tokens ?? null,
      })),
    }))

  const totalPoints = parts.reduce(
    (s, p) => s + p.questions.reduce((ps, q) => ps + (q.points ?? 1), 0),
    0
  )
  const quiz_json = { articleId, totalPoints, parts }

  const { error: upErr } = await supabase
    .from("articles")
    .update({ quiz_json, updated_at: nowIso() })
    .eq("id", articleId)
  if (upErr) throw new Error("rebuildQuizJson update: " + upErr.message)
}

// ── Auth routes ───────────────────────────────────────────────────────────────

app.get("/api/admin/me", (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ error: "Unauthorized" })
  res.json({ email: req.session.adminEmail })
})

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: "Email and password required" })
  if (!requireSupabase(res)) return
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, password_hash")
      .eq("email", email)
      .single()
    if (error || !data) return res.status(401).json({ error: "Invalid credentials" })
    const valid = await bcrypt.compare(password, data.password_hash)
    if (!valid) return res.status(401).json({ error: "Invalid credentials" })
    req.session.adminId = data.id
    req.session.adminEmail = data.email
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

// ── Auth guard (all /api/* except auth routes) ────────────────────────────────

app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next()
  if (req.path.startsWith("/api/admin/login") || req.path.startsWith("/api/admin/logout")) return next()
  if (!req.session.adminId) return res.status(401).json({ error: "Unauthorized" })
  next()
})

// ── Routes: exercises ─────────────────────────────────────────────────────────

app.get("/api/exercises", async (_req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { data, error } = await supabase
      .from("articles")
      .select(
        "id, title, source, level, is_challenge, is_free, is_dse_core, article_type, status, created_at, expected_minutes, exercise_template, quiz_json"
      )
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)
    res.json((data || []).map(rowToIndexEntry))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post("/api/exercises", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { article, quiz, isChallenge, isFree, level, status, expectedMinutes, exerciseTemplate } =
      req.body || {}

    const articleResult = ArticleSchema.safeParse(article)
    if (!articleResult.success) {
      return res
        .status(400)
        .json({ articleErrors: formatZodErrors(articleResult.error), quizErrors: [] })
    }

    const hasQuizPayload = quiz != null && quizHasQuestions(quiz)
    if (hasQuizPayload) {
      const quizResult = QuizSchema.safeParse(quiz)
      if (!quizResult.success) {
        return res
          .status(400)
          .json({ articleErrors: [], quizErrors: formatZodErrors(quizResult.error) })
      }
      if (article.id !== quiz.articleId) {
        return res.status(400).json({
          articleErrors: [],
          quizErrors: [
            `quiz.articleId "${quiz.articleId}" does not match article.id "${article.id}"`,
          ],
        })
      }
    }

    const finalQuiz = hasQuizPayload ? quiz : null
    const row = articleToRow(article, {
      isChallenge,
      isFree,
      level,
      status,
      expectedMinutes,
      exerciseTemplate,
      quizJson: finalQuiz,
    })

    const { error } = await supabase.from("articles").insert(row)
    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          articleErrors: [`An exercise with id "${article.id}" already exists`],
          quizErrors: [],
        })
      }
      throw new Error(error.message)
    }

    if (finalQuiz) await upsertQuestions(article.id, finalQuiz)
    await createVersionSnapshot(article.id, { article, quiz: finalQuiz })

    res.json({ success: true, id: article.id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get("/api/exercises/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single()
    if (error || !data) return res.status(404).json({ error: "Exercise not found" })
    res.json(rowToExercise(data))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put("/api/exercises/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { article, quiz, isChallenge, isFree, isDseCore, level, status, expectedMinutes, exerciseTemplate } =
      req.body || {}

    const { data: existing, error: fetchErr } = await supabase
      .from("articles")
      .select("id, level, status, created_at")
      .eq("id", id)
      .single()
    if (fetchErr || !existing) return res.status(404).json({ error: "Exercise not found" })

    const articleResult = ArticleSchema.safeParse(article)
    if (!articleResult.success) {
      return res
        .status(400)
        .json({ articleErrors: formatZodErrors(articleResult.error), quizErrors: [] })
    }
    if (article.id !== id) {
      return res.status(400).json({
        articleErrors: [`article.id "${article.id}" must match exercise id "${id}"`],
        quizErrors: [],
      })
    }

    const hasQuizPayload = quiz != null && quizHasQuestions(quiz)
    if (hasQuizPayload) {
      const quizResult = QuizSchema.safeParse(quiz)
      if (!quizResult.success) {
        return res
          .status(400)
          .json({ articleErrors: [], quizErrors: formatZodErrors(quizResult.error) })
      }
    }

    const finalQuiz = hasQuizPayload ? quiz : null

    // Preserve level for legacy F1–F3 articles; admin UI restricts new picks to 4–7.
    const incomingLevel = typeof level === "number" ? level : existing.level
    const nextStatus =
      status === "draft"
        ? "draft"
        : status === "published"
        ? "published"
        : existing.status || "published"

    const row = articleToRow(article, {
      isChallenge,
      isFree,
      isDseCore,
      level: incomingLevel,
      status: nextStatus,
      expectedMinutes,
      exerciseTemplate,
      quizJson: finalQuiz,
    })

    const { error: updateErr } = await supabase
      .from("articles")
      .update({ ...row, updated_at: nowIso() })
      .eq("id", id)
    if (updateErr) throw new Error(updateErr.message)

    if (hasQuizPayload) await upsertQuestions(id, finalQuiz)
    await createVersionSnapshot(id, { article, quiz: finalQuiz })

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete("/api/exercises/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { data, error } = await supabase
      .from("articles")
      .delete()
      .eq("id", id)
      .select("id")
    if (error) return res.status(500).json({ error: error.message })
    if (!data || data.length === 0) return res.status(404).json({ error: "Exercise not found" })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Generate quiz for an existing article via LLM.
// Async; returns runId. Client polls /status/:runId then PUTs the result.
app.post("/api/exercises/:id/generate-quiz", (req, res) => {
  const { id } = req.params
  const { promptId, model, apiKey } = req.body || {}
  if (!apiKey) return res.status(400).json({ error: "apiKey is required" })
  if (!promptId) return res.status(400).json({ error: "promptId is required" })

  const prompts = readQuizPrompts()
  const prompt = prompts.find((p) => p.id === promptId)
  if (!prompt) return res.status(404).json({ error: "Prompt not found" })

  const usedModel = model || prompt.defaultModel || "qwen/qwen3.6-flash"
  const runId = "qz_" + Date.now().toString(36)
  generateRuns[runId] = {
    kind: "quiz",
    status: "running",
    step: "生成測驗題目…",
    done: 0,
    total: 1,
    quizJson: null,
    error: null,
  }
  res.json({ runId })

  ;(async () => {
    try {
      let article
      if (supabase) {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, source, segments, footnotes")
          .eq("id", id)
          .single()
        if (error || !data) throw new Error("Article not found")
        article = data
      } else {
        const articlePath = path.join(DATA_DIR, "articles", `${id}.json`)
        if (!fs.existsSync(articlePath)) throw new Error("Article not found")
        article = JSON.parse(fs.readFileSync(articlePath, "utf8"))
      }

      const rawText = (article.segments || []).map((s) => s.text || "").join("")
      const fnLines = (article.footnotes || []).length
        ? article.footnotes.map((f) => `${f.marker} ${f.term}：${f.explanation}`).join("\n")
        : "（無注釋）"
      const context = `標題：${article.title}\n來源：${article.source || "—"}\n\n原文：\n${rawText}\n\n注釋：\n${fnLines}`

      const qRes = await callOpenRouter(
        usedModel,
        [
          { role: "system", content: prompt.promptTemplate },
          { role: "user", content: `請為以下文言文出題：\n\n${context}` },
        ],
        apiKey
      )
      const qParsed = JSON.parse(qRes.content)
      if (!Array.isArray(qParsed.parts)) throw new Error("Quiz response missing parts[]")

      const parts = qParsed.parts.map((p) => ({
        ...p,
        questions: (p.questions || []).map((q) => ({
          ...q,
          options: normalizeOptions(q.options),
        })),
      }))
      const totalPoints = parts.reduce(
        (s, p) => s + (p.questions?.length || 0) * (p.pointsPerQuestion || 1),
        0
      )
      const generatedQuiz = { articleId: id, totalPoints, parts }
      generateRuns[runId].quizJson = generatedQuiz
      generateRuns[runId].done++
      generateRuns[runId].step = "儲存草稿題目…"
      await insertQuestionsAsDrafts(id, generatedQuiz)
      generateRuns[runId].step = ""
      generateRuns[runId].status = "done"
    } catch (e) {
      generateRuns[runId].status = "error"
      generateRuns[runId].error = e.message
    }
  })()
})

app.get("/api/exercises/:id/generate-quiz/status/:runId", (req, res) => {
  const run = generateRuns[req.params.runId]
  if (!run) return res.status(404).json({ error: "Run not found" })
  res.json({
    status: run.status,
    step: run.step,
    done: run.done,
    total: run.total,
    quizJson: run.quizJson,
    error: run.error,
  })
})

// ── LLM Assessment ───────────────────────────────────────────────────────────

const ASSESSMENT_CONFIG_FILE = path.join(__dirname, "assessment-config.json")
const ASSESSMENT_RESULTS_DIR = path.join(__dirname, "assessment-results")
const runs = {}
const generateRuns = {}

const DEFAULT_ASSESSMENT_CONFIG = {
  models: [
    "deepseek/deepseek-v4-flash",
    "qwen/qwen3.5-plus-20260420",
    "qwen/qwen3.6-flash",
    "z-ai/glm-5",
  ],
  translationPrompt:
    "你是一位古典漢語（文言文）專家。將提供的文言文內容翻譯成白話文，請按文言字詞的意思翻譯(不要意譯)，你不能夠省略原有字詞來完成翻譯。請參考所附的注釋來理解詞彙。只需回傳一個有效的 JSON 物件，不要包含 markdown、不要附加說明。格式如下：{\"modernTranslation\": [\"段落一\", \"段落二\", ...]}。請將相關句子歸納成段落。",
  quizPrompt:
    "你作為香港中學中文教師，將上述文言文內容設計題目，要按照文章所示的教授年級來制定難度；同時，你要考慮我提供的文章特點設計題目。\n\n設計如下︰(初中5篇)\n第1部分︰10條字詞釋義題\n第2部分︰4條句子語譯題，如文章出現文言特殊句式，即「判斷句、被動句、倒裝句、疑問句」，請優先設題，最多設2題\n第3部分︰6條文意理解題，\n如敘事/遊記相關，可設計文章敘事次序、重點情節與人物形象、抒發情感等分析；\n如哲理/孟子/論語，應集中設計說明什麼道理、說明手法、論證手法的題目；\n如文章為詩詞，應設計1-2條關於詩詞格律的題目\n第4部分︰2條修辭相關題目\n\n設計如下︰(高中5篇)\n第1部分︰15條字詞釋義題\n第2部分︰6條句子語譯題，如文章出現文言特殊句式，即「判斷句、被動句、倒裝句、疑問句」，請優先設題，最多設2題\n第3部分︰8條文意理解題，\n如敘事/遊記相關，可設計文章敘事次序、重點情節、人物形象、抒發情感等分析；\n如哲理/孟子/論語，應集中設計說明什麼道理、說明手法、論證手法的題目；\n如文章為詩詞，應設計1-2條關於詩詞格律的題目(赤壁懷古要減至6題)\n第4部分︰2條修辭相關題目(赤壁懷古要加至4題)\n\n每題須包含4個選項(A/B/C/D)，一個正確答案及簡短解題，設計選項時，應有1個錯誤答案容易跟正確答案混淆。\n\n只需回傳一個有效的 JSON 物件，不要包含 markdown、不要附加說明。\nJSON 格式如下：\n{\n  \"parts\": [\n    {\n      \"part\": 1,\n      \"title\": \"第一部分：字詞釋義題\",\n      \"pointsPerQuestion\": 1,\n      \"questions\": [\n        {\n          \"id\": 1, \"part\": 1, \"points\": 1,\n          \"stem\": \"「詞語」在文中的意思是：\",\n          \"options\": [{\"key\":\"A\",\"text\":\"選項\"},{\"key\":\"B\",\"text\":\"選項\"},{\"key\":\"C\",\"text\":\"選項\"},{\"key\":\"D\",\"text\":\"選項\"}],\n          \"correctAnswer\": \"B\",\n          \"explanation\": \"解釋為何B正確\"\n        }\n      ]\n    },\n    {\"part\":2,\"title\":\"第二部分：句子語譯題\",\"pointsPerQuestion\":2,\"questions\":[...]},\n    {\"part\":3,\"title\":\"第三部分：文意理解題\",\"pointsPerQuestion\":3,\"questions\":[...]},\n    {\"part\":4,\"title\":\"第四部分：修辭相關題目\",\"pointsPerQuestion\":2,\"questions\":[...]}\n  ]\n}",
}

function readAssessmentConfig() {
  try {
    return JSON.parse(fs.readFileSync(ASSESSMENT_CONFIG_FILE, "utf8"))
  } catch {
    return DEFAULT_ASSESSMENT_CONFIG
  }
}

// ── Quiz Prompt MGT (Phase 3) ────────────────────────────────────────────────

const PROMPT_DEFAULT_ID = "default"

function readQuizPrompts() {
  let cfg
  try {
    cfg = JSON.parse(fs.readFileSync(ASSESSMENT_CONFIG_FILE, "utf8"))
  } catch {
    cfg = { ...DEFAULT_ASSESSMENT_CONFIG }
  }
  if (!Array.isArray(cfg.quizPrompts)) {
    cfg.quizPrompts = [
      {
        id: PROMPT_DEFAULT_ID,
        name: "Default Quiz Prompt",
        description:
          "Original 4-part quiz: word meaning, sentence translation, comprehension, rhetoric",
        promptTemplate: cfg.quizPrompt || DEFAULT_ASSESSMENT_CONFIG.quizPrompt,
        defaultModel: (Array.isArray(cfg.models) && cfg.models[0]) || "qwen/qwen3.6-flash",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ]
    fs.writeFileSync(ASSESSMENT_CONFIG_FILE, JSON.stringify(cfg, null, 2))
    console.log("  ✓ Seeded quizPrompts[] from legacy quizPrompt")
  }
  return cfg.quizPrompts
}

function writeQuizPrompts(prompts) {
  let cfg
  try {
    cfg = JSON.parse(fs.readFileSync(ASSESSMENT_CONFIG_FILE, "utf8"))
  } catch {
    cfg = { ...DEFAULT_ASSESSMENT_CONFIG }
  }
  cfg.quizPrompts = prompts
  fs.writeFileSync(ASSESSMENT_CONFIG_FILE, JSON.stringify(cfg, null, 2))
}

// Async Supabase-backed quiz prompts (with local file fallback)
// Requires quiz_prompts table: id text PK, name text, description text,
//   prompt_template text, default_model text, created_at timestamptz, updated_at timestamptz
async function readQuizPromptsAsync() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("quiz_prompts")
        .select("*")
        .order("created_at", { ascending: true })
      if (!error && data && data.length > 0) {
        return data.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description || "",
          promptTemplate: r.prompt_template,
          defaultModel: r.default_model || null,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
      }
    } catch (_) {
      // fall through to local file
    }
  }
  return readQuizPrompts()
}

async function writeQuizPromptsAsync(prompts) {
  // Always write to local file as backup
  writeQuizPrompts(prompts)
  if (supabase) {
    try {
      // Upsert all prompts to Supabase
      const rows = prompts.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        prompt_template: p.promptTemplate,
        default_model: p.defaultModel || null,
        created_at: p.createdAt || nowIso(),
        updated_at: p.updatedAt || nowIso(),
      }))
      await supabase.from("quiz_prompts").upsert(rows, { onConflict: "id" })
    } catch (e) {
      console.warn("  ⚠ Failed to sync quiz prompts to Supabase:", e.message)
    }
  }
}

async function deleteQuizPromptAsync(id) {
  writeQuizPrompts(readQuizPrompts().filter((p) => p.id !== id))
  if (supabase) {
    try {
      await supabase.from("quiz_prompts").delete().eq("id", id)
    } catch (e) {
      console.warn("  ⚠ Failed to delete quiz prompt from Supabase:", e.message)
    }
  }
}

function slugifyPromptId(name) {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "prompt-" + Date.now().toString(36)
}

function validatePromptPayload(p) {
  const errs = []
  if (!p || typeof p !== "object") return ["Prompt must be a JSON object"]
  if (!p.name || typeof p.name !== "string" || !p.name.trim()) errs.push("Missing: name")
  if (!p.promptTemplate || typeof p.promptTemplate !== "string" || !p.promptTemplate.trim())
    errs.push("Missing: promptTemplate")
  return errs
}

app.get("/api/quiz-prompts", (_req, res) => {
  try {
    res.json(readQuizPrompts())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post("/api/quiz-prompts", (req, res) => {
  try {
    const { name, description, promptTemplate, defaultModel } = req.body || {}
    const errs = validatePromptPayload({ name, promptTemplate })
    if (errs.length) return res.status(400).json({ errors: errs })

    const prompts = readQuizPrompts()
    let id = slugifyPromptId(name)
    let n = 2
    while (prompts.find((p) => p.id === id)) id = slugifyPromptId(name) + "-" + n++

    const ts = nowIso()
    const next = {
      id,
      name: name.trim(),
      description: (description || "").trim(),
      promptTemplate,
      defaultModel: defaultModel || null,
      createdAt: ts,
      updatedAt: ts,
    }
    prompts.push(next)
    writeQuizPrompts(prompts)
    res.json({ success: true, prompt: next })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put("/api/quiz-prompts/:id", (req, res) => {
  try {
    const { id } = req.params
    const { name, description, promptTemplate, defaultModel } = req.body || {}
    const errs = validatePromptPayload({ name, promptTemplate })
    if (errs.length) return res.status(400).json({ errors: errs })

    const prompts = readQuizPrompts()
    const idx = prompts.findIndex((p) => p.id === id)
    if (idx === -1) return res.status(404).json({ error: "Prompt not found" })

    prompts[idx] = {
      ...prompts[idx],
      name: name.trim(),
      description: (description || "").trim(),
      promptTemplate,
      defaultModel: defaultModel || prompts[idx].defaultModel || null,
      updatedAt: nowIso(),
    }
    writeQuizPrompts(prompts)
    res.json({ success: true, prompt: prompts[idx] })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete("/api/quiz-prompts/:id", (req, res) => {
  try {
    const { id } = req.params
    const prompts = readQuizPrompts()
    if (prompts.length <= 1)
      return res.status(400).json({ error: "Cannot delete the last quiz prompt" })
    const next = prompts.filter((p) => p.id !== id)
    if (next.length === prompts.length) return res.status(404).json({ error: "Prompt not found" })
    writeQuizPrompts(next)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Prices per 1M tokens (USD) from OpenRouter API, verified 2026-04-29
const MODEL_PRICING = {
  "deepseek/deepseek-v4-flash":        { input: 0.14,  output: 0.28  },
  "deepseek/deepseek-v4-pro":          { input: 0.435, output: 0.87  },
  "qwen/qwen3.5-plus-20260420":        { input: 0.40,  output: 2.40  },
  "qwen/qwen3.5-plus":                 { input: 0.26,  output: 1.56  },
  "qwen/qwen3.5-flash":                { input: 0.065, output: 0.26  },
  "qwen/qwen3.6-flash":                { input: 0.25,  output: 1.50  },
  "qwen/qwen3.6-35b-a3b":             { input: 0.161, output: 0.965 },
  "z-ai/glm-5":                        { input: 0.60,  output: 2.08  },
  "z-ai/glm-5.1":                      { input: 1.05,  output: 3.50  },
  "z-ai/glm-5-turbo":                  { input: 1.20,  output: 4.00  },
}

function estimateCost(model, promptTokens, completionTokens) {
  const p = MODEL_PRICING[model]
  if (!p) return null
  return (promptTokens * p.input + completionTokens * p.output) / 1_000_000
}

async function callOpenRouter(model, messages, apiKey, retries = 4) {
  if ([...apiKey].some((c) => c.charCodeAt(0) > 127)) {
    throw new Error(
      "API key contains non-ASCII characters — please re-paste it from your OpenRouter dashboard"
    )
  }
  const t0 = Date.now()
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": `http://localhost:${PORT}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  })
  const latencyMs = Date.now() - t0
  if (res.status === 429 && retries > 0) {
    const retryAfter = res.headers.get("Retry-After")
    const attempt = 4 - retries
    const delay = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : Math.min(10_000 * Math.pow(2, attempt), 80_000)
    await new Promise((r) => setTimeout(r, delay))
    return callOpenRouter(model, messages, apiKey, retries - 1)
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ""
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
  return {
    content: cleaned,
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    latencyMs,
  }
}

function buildArticleContext(article) {
  const segments = article.segments.map((s, i) => `${i + 1}. ${s.text}`).join("\n")
  const footnotes = article.footnotes.length
    ? article.footnotes.map((f) => `${f.marker} ${f.term}：${f.explanation}`).join("\n")
    : "（無注釋）"
  return `標題：${article.title}\n來源：${article.source || "—"}\n\n原文：\n${segments}\n\n注釋：\n${footnotes}`
}

function escCsv(val) {
  const s = val === null || val === undefined ? "" : String(val)
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? '"' + s.replace(/"/g, '""') + '"'
    : s
}

function csvRow(cells) {
  return cells.map(escCsv).join(",")
}

function generateCSVs(runId, results, filePrefix) {
  const dir = path.join(ASSESSMENT_RESULTS_DIR, runId)
  fs.mkdirSync(dir, { recursive: true })

  const summaryFile      = `summary_${filePrefix}.csv`
  const translationsFile = `translations_${filePrefix}.csv`
  const quizFile         = `quiz_${filePrefix}.csv`

  const summaryLines = [
    csvRow([
      "article_id", "article_title", "model", "call_type", "latency_ms",
      "prompt_tokens", "completion_tokens", "est_cost_usd", "parse_ok", "error",
    ]),
  ]
  for (const r of results) {
    summaryLines.push(
      csvRow([
        r.articleId, r.articleTitle || "", r.model, r.callType,
        r.latencyMs, r.promptTokens, r.completionTokens,
        r.estCostUsd !== null && r.estCostUsd !== undefined ? r.estCostUsd.toFixed(6) : "",
        r.parseOk ? "true" : "false", r.error || "",
      ])
    )
  }
  fs.writeFileSync(path.join(dir, summaryFile), summaryLines.join("\n"))

  const transResults = results.filter((r) => r.callType === "translation" && r.parseOk)
  const articleIds = [...new Set(results.map((r) => r.articleId))]
  const models = [...new Set(results.map((r) => r.model))]
  const transLines = [csvRow(["article_id", "para_index", "reference", ...models])]
  for (const artId of articleIds) {
    const artTrans = transResults.filter((r) => r.articleId === artId)
    const refLen = artTrans[0]?.reference?.length || 0
    const maxLen = Math.max(refLen, ...artTrans.map((r) => r.parsed?.modernTranslation?.length || 0))
    for (let i = 0; i < maxLen; i++) {
      const ref = artTrans[0]?.reference?.[i] || ""
      const modelCells = models.map(
        (m) => artTrans.find((x) => x.model === m)?.parsed?.modernTranslation?.[i] || ""
      )
      transLines.push(csvRow([artId, String(i + 1), ref, ...modelCells]))
    }
  }
  fs.writeFileSync(path.join(dir, translationsFile), transLines.join("\n"))

  const quizLines = [
    csvRow([
      "article_id", "model", "part", "part_title", "q_index",
      "stem", "opt_A", "opt_B", "opt_C", "opt_D", "correct_answer", "explanation",
    ]),
  ]
  for (const r of results.filter((r) => r.callType === "quiz" && r.parseOk)) {
    for (const part of r.parsed?.parts || []) {
      for (const q of part.questions || []) {
        const opts = {}
        for (const o of q.options || []) opts[o.key] = o.text
        quizLines.push(
          csvRow([
            r.articleId, r.model, part.part, part.title, q.id,
            q.stem, opts.A || "", opts.B || "", opts.C || "", opts.D || "",
            q.correctAnswer, q.explanation,
          ])
        )
      }
    }
  }
  fs.writeFileSync(path.join(dir, quizFile), quizLines.join("\n"))

  return { summary: summaryFile, translations: translationsFile, quiz: quizFile }
}

function parseCSVContent(content) {
  const text = content.replace(/^﻿/, "")
  const rows = []
  let row = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') { inQuotes = false }
      else { field += c }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ""
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ""
      rows.push(row); row = []
    } else {
      field += c
    }
  }
  if (row.length || field) { row.push(field); rows.push(row) }
  while (rows.length && rows[rows.length - 1].every((f) => f === "")) rows.pop()
  return rows
}

function segmentText(text) {
  const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (lines.length > 1) return lines.map((t) => ({ text: t }))
  const segs = []
  let current = ""
  for (const char of text) {
    current += char
    if ("。！？；".includes(char)) {
      if (current.trim()) segs.push({ text: current.trim() })
      current = ""
    }
  }
  if (current.trim()) segs.push({ text: current.trim() })
  return segs.length ? segs : [{ text: text.trim() }]
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function segmentTextWithFootnotes(text, footnotes) {
  if (!footnotes.length) return segmentText(text)

  const hasEmbeddedMarkers = footnotes.some((f) => text.includes(f.marker))
  if (hasEmbeddedMarkers) {
    const sorted = [...footnotes].sort((a, b) => b.marker.length - a.marker.length)
    const pattern = new RegExp(sorted.map((f) => escapeRegex(f.marker)).join("|"), "g")
    const segments = []
    let lastIndex = 0
    let m
    while ((m = pattern.exec(text)) !== null) {
      if (m.index > lastIndex) {
        text.slice(lastIndex, m.index).split(/\n+/).forEach((line) => {
          if (line.trim()) segments.push({ text: line.trim() })
        })
      }
      const fn = footnotes.find((f) => f.marker === m[0])
      if (fn) segments.push({ text: m[0], footnoteId: fn.id })
      lastIndex = pattern.lastIndex
    }
    if (lastIndex < text.length) {
      text.slice(lastIndex).split(/\n+/).forEach((line) => {
        if (line.trim()) segments.push({ text: line.trim() })
      })
    }
    return segments.length ? segments : [{ text: text.trim() }]
  }

  const footnoteById = Object.fromEntries(footnotes.map((f) => [f.id, f]))
  const sortedIds = footnotes.map((f) => f.id).sort((a, b) => b.length - a.length)
  const numeralRe = new RegExp(`(?<!\\d)(${sortedIds.map(escapeRegex).join("|")})(?!\\d)`, "g")
  if (numeralRe.test(text)) {
    numeralRe.lastIndex = 0
    const segments = []
    let lastIndex = 0
    let m
    while ((m = numeralRe.exec(text)) !== null) {
      const fn = footnoteById[m[1]]
      if (!fn) continue
      if (m.index > lastIndex) {
        text.slice(lastIndex, m.index).split(/\n+/).forEach((line) => {
          if (line.trim()) segments.push({ text: line.trim() })
        })
      }
      segments.push({ text: fn.marker, footnoteId: fn.id })
      lastIndex = m.index + m[1].length
    }
    if (lastIndex < text.length) {
      text.slice(lastIndex).split(/\n+/).forEach((line) => {
        if (line.trim()) segments.push({ text: line.trim() })
      })
    }
    return segments.length ? segments : segmentText(text)
  }

  const insertions = []
  for (const fn of footnotes) {
    const idx = text.indexOf(fn.term)
    if (idx !== -1) insertions.push({ pos: idx + fn.term.length, fn })
  }
  insertions.sort((a, b) => a.pos - b.pos)
  if (!insertions.length) return segmentText(text)

  const segments = []
  let pos = 0
  for (const { pos: insertPos, fn } of insertions) {
    if (insertPos <= pos) continue
    const chunk = text.slice(pos, insertPos)
    if (chunk.trim()) {
      chunk.split(/\n+/).forEach((line) => { if (line.trim()) segments.push({ text: line.trim() }) })
    }
    segments.push({ text: fn.marker, footnoteId: fn.id })
    pos = insertPos
  }
  if (pos < text.length) {
    text.slice(pos).split(/\n+/).forEach((line) => {
      if (line.trim()) segments.push({ text: line.trim() })
    })
  }
  return segments.length ? segments : segmentText(text)
}

function parseFootnotesText(raw) {
  if (!raw || !raw.trim()) return []
  raw = raw.replace(/○([一-鿿])/g, "[$1]")
  raw = raw.replace(/\s+(?=\d+[.。]\s)/g, "\n")
  const footnotes = []
  let idNum = 1
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const withMarker = line.match(
      /^([①-⑳]|[（(]\d+[)）]|\[\d+\]|\d+[.。、）)\s])\s*([^：:︓︰]+)[：:︓︰]\s*(.+)$/
    )
    if (withMarker) {
      footnotes.push({
        id: String(idNum),
        marker: `(${idNum})`,
        term: withMarker[2].trim(),
        explanation: withMarker[3].trim(),
      })
      idNum++
      continue
    }
    const noMarker = line.match(/^([^：:︓︰]+)[：:︓︰]\s*(.+)$/)
    if (noMarker) {
      footnotes.push({
        id: String(idNum),
        marker: `(${idNum})`,
        term: noMarker[1].trim(),
        explanation: noMarker[2].trim(),
      })
      idNum++
      continue
    }
    if (footnotes.length) {
      footnotes[footnotes.length - 1].explanation += line
    }
  }
  return footnotes
}

function normalizeOptions(opts) {
  if (Array.isArray(opts)) return opts
  if (opts && typeof opts === "object") {
    return Object.entries(opts).map(([key, text]) => ({ key, text: String(text) }))
  }
  return []
}

app.get("/api/assessment/config", (_req, res) => {
  res.json(readAssessmentConfig())
})

app.post("/api/assessment/config", (req, res) => {
  try {
    const { models, translationPrompt, quizPrompt } = req.body || {}
    fs.writeFileSync(
      ASSESSMENT_CONFIG_FILE,
      JSON.stringify({ models, translationPrompt, quizPrompt }, null, 2)
    )
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post("/api/assessment/run", (req, res) => {
  const { articleIds, rawArticles, models, translationPrompt, quizPrompt, apiKey } = req.body || {}
  if (!apiKey) return res.status(400).json({ error: "apiKey is required" })
  const hasIds = Array.isArray(articleIds) && articleIds.length
  const hasRaw = Array.isArray(rawArticles) && rawArticles.length
  if (!hasIds && !hasRaw)
    return res.status(400).json({ error: "articleIds or rawArticles required" })
  if (!Array.isArray(models) || !models.length)
    return res.status(400).json({ error: "models required" })

  const runId = Date.now().toString()
  const now = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  const filePrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  const total =
    ((articleIds?.length || 0) + (rawArticles?.length || 0)) * models.length * 2
  runs[runId] = {
    status: "running",
    done: 0,
    total,
    currentTask: "",
    error: null,
    csvDir: null,
    files: null,
  }
  res.json({ runId })

  ;(async () => {
    const results = []
    try {
      const articles = []
      for (const articleId of articleIds || []) {
        let article
        if (supabase) {
          const { data, error } = await supabase
            .from("articles")
            .select("id, title, source, segments, footnotes, modern_translation")
            .eq("id", articleId)
            .single()
          if (error || !data) throw new Error(`Article not found: ${articleId}`)
          article = {
            id: data.id,
            title: data.title,
            source: data.source,
            segments: data.segments,
            footnotes: data.footnotes,
            modernTranslation: data.modern_translation,
          }
        } else {
          article = JSON.parse(
            fs.readFileSync(path.join(DATA_DIR, "articles", `${articleId}.json`), "utf8")
          )
        }
        articles.push({
          id: articleId,
          title: article.title,
          context: buildArticleContext(article),
          reference: article.modernTranslation || [],
        })
      }
      for (const raw of rawArticles || []) {
        const context = `標題：${raw.title}\n來源：（自訂）\n\n原文：\n${raw.text}\n\n注釋：（無注釋）`
        articles.push({
          id: raw.id || "raw-article",
          title: raw.title || "自訂文章",
          context,
          reference: [],
        })
      }

      for (const art of articles) {
        for (const model of models) {
          const shortModel = model.split("/").pop()

          runs[runId].currentTask = `翻譯 · ${shortModel} · ${art.title}`
          const tResult = {
            articleId: art.id, articleTitle: art.title, model, callType: "translation",
            latencyMs: 0, promptTokens: 0, completionTokens: 0, estCostUsd: null,
            parseOk: false, error: null, parsed: null, reference: art.reference,
          }
          try {
            const r = await callOpenRouter(
              model,
              [
                { role: "system", content: translationPrompt },
                { role: "user", content: `請翻譯以下文言文：\n\n${art.context}` },
              ],
              apiKey
            )
            Object.assign(tResult, {
              latencyMs: r.latencyMs,
              promptTokens: r.promptTokens,
              completionTokens: r.completionTokens,
              estCostUsd: estimateCost(model, r.promptTokens, r.completionTokens),
            })
            const parsed = JSON.parse(r.content)
            tResult.parsed = parsed
            tResult.parseOk = Array.isArray(parsed.modernTranslation)
          } catch (e) {
            tResult.error = e.message
          }
          results.push(tResult)
          runs[runId].done++
          await new Promise((r) => setTimeout(r, 2_000))

          runs[runId].currentTask = `出題 · ${shortModel} · ${art.title}`
          const qResult = {
            articleId: art.id, articleTitle: art.title, model, callType: "quiz",
            latencyMs: 0, promptTokens: 0, completionTokens: 0, estCostUsd: null,
            parseOk: false, error: null, parsed: null,
          }
          try {
            const r = await callOpenRouter(
              model,
              [
                { role: "system", content: quizPrompt },
                { role: "user", content: `請為以下文言文出題：\n\n${art.context}` },
              ],
              apiKey
            )
            Object.assign(qResult, {
              latencyMs: r.latencyMs,
              promptTokens: r.promptTokens,
              completionTokens: r.completionTokens,
              estCostUsd: estimateCost(model, r.promptTokens, r.completionTokens),
            })
            const parsed = JSON.parse(r.content)
            qResult.parsed = parsed
            qResult.parseOk = Array.isArray(parsed.parts)
          } catch (e) {
            qResult.error = e.message
          }
          results.push(qResult)
          runs[runId].done++
          await new Promise((r) => setTimeout(r, 2_000))
        }
      }

      const files = generateCSVs(runId, results, filePrefix)
      runs[runId].csvDir = path.join(ASSESSMENT_RESULTS_DIR, runId)
      runs[runId].files = files
      runs[runId].currentTask = ""
      runs[runId].status = "done"
    } catch (e) {
      runs[runId].status = "error"
      runs[runId].error = e.message
    }
  })()
})

app.get("/api/assessment/status/:runId", (req, res) => {
  const run = runs[req.params.runId]
  if (!run) return res.status(404).json({ error: "Run not found" })
  res.json({
    status: run.status,
    done: run.done,
    total: run.total,
    currentTask: run.currentTask || "",
    error: run.error,
  })
})

app.get("/api/assessment/download/:runId/:type", (req, res) => {
  const { runId, type } = req.params
  if (!["summary", "translations", "quiz"].includes(type))
    return res.status(400).json({ error: "Invalid type" })

  const BOM = Buffer.from([0xef, 0xbb, 0xbf])
  const sendFile = (filePath, fileName) => {
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`)
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.send(Buffer.concat([BOM, fs.readFileSync(filePath)]))
  }

  const run = runs[runId]
  if (run?.files?.[type]) {
    const filePath = path.join(run.csvDir, run.files[type])
    if (fs.existsSync(filePath)) return sendFile(filePath, run.files[type])
  }

  const dir = path.join(ASSESSMENT_RESULTS_DIR, runId)
  if (!fs.existsSync(dir)) return res.status(404).json({ error: "Run not found" })
  const match = fs
    .readdirSync(dir)
    .find((f) => f.endsWith(".csv") && (f === `${type}.csv` || f.startsWith(`${type}_`)))
  if (!match) return res.status(404).json({ error: "File not found" })
  sendFile(path.join(dir, match), match)
})

app.get("/api/assessment/history", (_req, res) => {
  try {
    if (!fs.existsSync(ASSESSMENT_RESULTS_DIR)) return res.json([])
    const entries = fs
      .readdirSync(ASSESSMENT_RESULTS_DIR)
      .filter((d) => fs.statSync(path.join(ASSESSMENT_RESULTS_DIR, d)).isDirectory())
    const history = entries.map((runId) => {
      const dir = path.join(ASSESSMENT_RESULTS_DIR, runId)
      const csvFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".csv"))
      const files = {}
      for (const f of csvFiles) {
        if (f === "summary.csv" || f.startsWith("summary_")) files.summary = f
        else if (f === "translations.csv" || f.startsWith("translations_")) files.translations = f
        else if (f === "quiz.csv" || f.startsWith("quiz_")) files.quiz = f
      }
      let datetime = null
      const summaryName = files.summary || ""
      const m = summaryName.match(
        /summary_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.csv/
      )
      if (m) datetime = `${m[1]}  ${m[2]}:${m[3]}:${m[4]}`
      if (!datetime) {
        const d = new Date(parseInt(runId))
        if (!isNaN(d)) datetime = d.toLocaleString()
      }
      return { runId, datetime, files }
    })
    history.sort((a, b) => parseInt(b.runId) - parseInt(a.runId))
    res.json(history)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get("/api/assessment/data/:runId/:type", (req, res) => {
  const { runId, type } = req.params
  if (!["summary", "translations", "quiz"].includes(type))
    return res.status(400).json({ error: "Invalid type" })

  let filePath = null
  const run = runs[runId]
  if (run?.files?.[type]) {
    const p = path.join(run.csvDir, run.files[type])
    if (fs.existsSync(p)) filePath = p
  }
  if (!filePath) {
    const dir = path.join(ASSESSMENT_RESULTS_DIR, runId)
    if (!fs.existsSync(dir)) return res.status(404).json({ error: "Run not found" })
    const match = fs
      .readdirSync(dir)
      .find((f) => f.endsWith(".csv") && (f === `${type}.csv` || f.startsWith(`${type}_`)))
    if (!match) return res.status(404).json({ error: "File not found" })
    filePath = path.join(dir, match)
  }

  try {
    const content = fs.readFileSync(filePath, "utf8")
    const rows = parseCSVContent(content)
    if (!rows.length) return res.json({ headers: [], rows: [] })
    res.json({ headers: rows[0], rows: rows.slice(1) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Generate Article ─────────────────────────────────────────────────────────

app.post("/api/generate-article", (req, res) => {
  const {
    title, source, text, footnotesText, model, translationPrompt,
    quizPrompt, apiKey, skipQuiz,
  } = req.body || {}
  if (!apiKey) return res.status(400).json({ error: "apiKey is required" })
  if (!title) return res.status(400).json({ error: "title is required" })
  if (!text) return res.status(400).json({ error: "text is required" })
  if (!model) return res.status(400).json({ error: "model is required" })
  if (!skipQuiz && !quizPrompt)
    return res.status(400).json({ error: "quizPrompt is required (or pass skipQuiz: true)" })

  const runId = "gen_" + Date.now().toString()
  const total = skipQuiz ? 1 : 2
  generateRuns[runId] = {
    status: "running", step: "", done: 0, total,
    articleJson: null, quizJson: null, skipQuiz: !!skipQuiz, error: null,
  }
  res.json({ runId })

  ;(async () => {
    try {
      let parsedFootnotes = parseFootnotesText(footnotesText || "")

      if (!parsedFootnotes.length) {
        const found = [
          ...new Set(
            [...(title + " " + text).matchAll(/(?<!\d)(\d+)(?!\d)/g)].map((m) => m[1])
          ),
        ].sort((a, b) => Number(a) - Number(b))
        if (found.length) {
          parsedFootnotes = found.map((n) => ({ id: n, marker: `(${n})`, term: "", explanation: "" }))
        }
      }
      const fnLines = parsedFootnotes.length
        ? parsedFootnotes.map((f) => `${f.marker} ${f.term}：${f.explanation}`).join("\n")
        : "（無注釋）"
      const context = `標題：${title}\n來源：${source || "—"}\n\n原文：\n${text}\n\n注釋：\n${fnLines}`

      generateRuns[runId].step = "生成現代文翻譯…"
      const tRes = await callOpenRouter(
        model,
        [
          { role: "system", content: translationPrompt },
          {
            role: "user",
            content: `請翻譯以下文言文。在 JSON 回覆中額外加入 "suggestedId" 欄位，值為標題的漢語拼音（全小寫、以連字號分隔，例如 "chun-ye-xi-yu"）。\n\n${context}`,
          },
        ],
        apiKey
      )
      const tParsed = JSON.parse(tRes.content)
      if (!Array.isArray(tParsed.modernTranslation))
        throw new Error("Translation response missing modernTranslation[]")
      const articleId =
        typeof tParsed.suggestedId === "string" && /^[a-z0-9-]+$/.test(tParsed.suggestedId)
          ? tParsed.suggestedId
          : "art-" + Date.now().toString(36)
      generateRuns[runId].done++

      let parts = []
      if (!skipQuiz) {
        generateRuns[runId].step = "生成測驗題目…"
        const qRes = await callOpenRouter(
          model,
          [
            { role: "system", content: quizPrompt },
            { role: "user", content: `請為以下文言文出題：\n\n${context}` },
          ],
          apiKey
        )
        const qParsed = JSON.parse(qRes.content)
        if (!Array.isArray(qParsed.parts)) throw new Error("Quiz response missing parts[]")
        generateRuns[runId].done++

        parts = qParsed.parts.map((p) => ({
          ...p,
          questions: (p.questions || []).map((q) => ({
            ...q,
            options: normalizeOptions(q.options),
          })),
        }))
      }

      const titleNumeral = title.match(/(\d+)$/)
      const cleanTitle = titleNumeral ? title.slice(0, -titleNumeral[1].length).trim() : title.trim()
      const articleJson = {
        id: articleId,
        title: cleanTitle,
        ...(titleNumeral ? { titleFootnoteId: titleNumeral[1] } : {}),
        source: source || "",
        segments: segmentTextWithFootnotes(text, parsedFootnotes),
        footnotes: parsedFootnotes,
        modernTranslation: tParsed.modernTranslation,
      }
      const totalPoints = parts.reduce(
        (s, p) => s + (p.questions?.length || 0) * (p.pointsPerQuestion || 1),
        0
      )
      const quizJson = skipQuiz ? null : { articleId, totalPoints, parts }

      generateRuns[runId].articleJson = articleJson
      generateRuns[runId].quizJson = quizJson
      generateRuns[runId].step = ""
      generateRuns[runId].status = "done"
    } catch (e) {
      generateRuns[runId].status = "error"
      generateRuns[runId].error = e.message
    }
  })()
})

app.get("/api/generate-article/status/:runId", (req, res) => {
  const run = generateRuns[req.params.runId]
  if (!run) return res.status(404).json({ error: "Run not found" })
  res.json({
    status: run.status,
    step: run.step,
    done: run.done,
    total: run.total,
    articleJson: run.articleJson,
    quizJson: run.quizJson,
    error: run.error,
  })
})

// ── Question CRUD ─────────────────────────────────────────────────────────────

const QuestionUpsertSchema = z.object({
  article_id: z.string().min(1),
  type: z.enum(["mc-single", "mc-multi", "true-false", "fill-blank", "sentence-order", "comprehension"]),
  format: z.enum(["mc", "fill-blank", "sentence-order"]),
  part: z.number().int().positive().optional().nullable(),
  points: z.number().int().positive().default(1),
  stem: z.string().min(1, "stem is required"),
  options: z.record(z.string()).optional().nullable(),
  correct_answer: z.string().min(1, "correct_answer is required"),
  select_count: z.number().int().positive().default(1),
  sequence_tokens: z.array(z.string()).optional().nullable(),
  explanation: z.string().optional().nullable(),
  source_excerpt: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
})

app.get("/api/questions", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { articleId } = req.query
    if (!articleId) return res.status(400).json({ error: "articleId query param required" })
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("article_id", articleId)
      .order("part", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true })
    if (error) throw new Error(error.message)
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post("/api/questions", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const parsed = QuestionUpsertSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ errors: formatZodErrors(parsed.error) })
    const { data, error } = await supabase
      .from("questions")
      .insert({ ...parsed.data, created_at: nowIso(), updated_at: nowIso() })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    res.json({ success: true, id: data.id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put("/api/questions/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const parsed = QuestionUpsertSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ errors: formatZodErrors(parsed.error) })
    const { error } = await supabase
      .from("questions")
      .update({ ...parsed.data, updated_at: nowIso() })
      .eq("id", id)
    if (error) throw new Error(error.message)
    if (parsed.data.status === "published") await rebuildQuizJson(parsed.data.article_id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete("/api/questions/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { data, error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id)
      .select("id, article_id")
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return res.status(404).json({ error: "Question not found" })
    await rebuildQuizJson(data[0].article_id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post("/api/questions/bulk-delete", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { ids } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids[] required" })
    const { data: rows, error: fetchErr } = await supabase
      .from("questions")
      .select("id, article_id")
      .in("id", ids)
    if (fetchErr) throw new Error(fetchErr.message)
    const articleIds = [...new Set((rows || []).map((r) => r.article_id))]
    const { error } = await supabase.from("questions").delete().in("id", ids)
    if (error) throw new Error(error.message)
    await Promise.all(articleIds.map(rebuildQuizJson))
    res.json({ success: true, deleted: ids.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Publish a single question ─────────────────────────────────────────────────

app.patch("/api/questions/:id/publish", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { data, error } = await supabase
      .from("questions")
      .update({ status: "published" })
      .eq("id", id)
      .select("id, article_id")
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return res.status(404).json({ error: "Question not found" })
    await rebuildQuizJson(data[0].article_id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── is_dse_core flag on articles ──────────────────────────────────────────────

app.patch("/api/exercises/:id/dse-core", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { is_dse_core } = req.body || {}
    if (typeof is_dse_core !== "boolean")
      return res.status(400).json({ error: "is_dse_core must be boolean" })
    const { error } = await supabase
      .from("articles")
      .update({ is_dse_core, updated_at: nowIso() })
      .eq("id", id)
    if (error) throw new Error(error.message)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`\n  ✦ 文言教室 Admin Portal\n  → http://localhost:${PORT}\n`)
  if (!supabase) {
    console.log("  ⚠ Running without Supabase — add SUPABASE_SERVICE_ROLE_KEY to .env then restart\n")
  }
  readQuizPrompts() // seeds quizPrompts[] in assessment-config.json if missing
})
