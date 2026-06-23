require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })

const express = require("express")
const session = require("express-session")
const path = require("path")

const { SupabaseStore, supabase } = require("./lib/supabase")
const { readQuizPrompts } = require("./lib/quiz-prompts")

const authRouter = require("./routes/auth")
const exercisesRouter = require("./routes/exercises")
const generateQuizRouter = require("./routes/generate-quiz")
const promptsRouter = require("./routes/prompts")
const questionsRouter = require("./routes/questions")
const assessmentRouter = require("./routes/assessment")
const generateArticleRouter = require("./routes/generate-article")
const quizRouter = require("./routes/quiz")
const crossArticleQuestionsRouter = require("./routes/cross-article-questions")
const weightTrainingRouter = require("./routes/weight-training")

const app = express()
const PORT = process.env.PORT || 3001

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

// Auth routes (no guard needed)
app.use("/api/admin", authRouter)

// Public mobile API routes (no admin session required)
// IMPORTANT: Mount specific routes BEFORE parameterized routes to avoid conflicts
app.use("/api/quiz/weight-training", weightTrainingRouter)
app.use("/api/quiz", quizRouter)

// Auth guard for all other /api/* routes
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next()
  if (!req.session.adminId) return res.status(401).json({ error: "Unauthorized" })
  next()
})

app.use("/api/exercises", exercisesRouter)
app.use("/api/exercises/:id/generate-quiz", generateQuizRouter)
app.use("/api/quiz-prompts", promptsRouter)
app.use("/api/questions", questionsRouter)
app.use("/api/cross-article-questions", crossArticleQuestionsRouter)
app.use("/api/assessment", assessmentRouter)
app.use("/api/generate-article", generateArticleRouter)

app.listen(PORT, () => {
  console.log(`\n  ✦ 文言教室 Admin Portal\n  → http://localhost:${PORT}\n`)
  if (!supabase) {
    console.log("  ⚠ Running without Supabase — add SUPABASE_SERVICE_ROLE_KEY to .env then restart\n")
  }
  readQuizPrompts() // seeds quizPrompts[] in assessment-config.json if missing
})
