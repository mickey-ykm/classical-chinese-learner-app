const express = require("express")
const fs = require("fs")
const path = require("path")

const app = express()
const PORT = 3001
const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const DATA_TS = path.join(ROOT, "lib", "data.ts")

app.use(express.json({ limit: "10mb" }))
app.use(express.static(path.join(__dirname, "public")))

// ── Helpers ──────────────────────────────────────────────────────────────────

function readIndex() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "index.json"), "utf8"))
}

function writeIndex(data) {
  fs.writeFileSync(path.join(DATA_DIR, "index.json"), JSON.stringify(data, null, 2))
}

function validateArticle(a) {
  if (!a || typeof a !== "object") return ["Article must be a JSON object"]
  const errs = []
  if (!a.id || typeof a.id !== "string") errs.push("Missing: id (string)")
  if (!a.title || typeof a.title !== "string") errs.push("Missing: title (string)")
  if (!Array.isArray(a.segments) || !a.segments.length) errs.push("Missing/empty: segments[]")
  if (!Array.isArray(a.footnotes)) errs.push("Missing: footnotes[]")
  if (!Array.isArray(a.modernTranslation) || !a.modernTranslation.length)
    errs.push("Missing/empty: modernTranslation[]")
  return errs
}

function validateQuiz(q) {
  if (!q || typeof q !== "object") return ["Quiz must be a JSON object"]
  const errs = []
  if (!q.articleId || typeof q.articleId !== "string") errs.push("Missing: articleId (string)")
  if (typeof q.totalPoints !== "number") errs.push("Missing/invalid: totalPoints (must be a number)")
  if (!Array.isArray(q.parts) || !q.parts.length) errs.push("Missing/empty: parts[]")
  else {
    q.parts.forEach((p, pi) => {
      if (!Array.isArray(p.questions) || !p.questions.length) {
        errs.push(`parts[${pi}]: empty questions[]`)
      } else {
        p.questions.forEach((qq, qi) => {
          if (!qq.correctAnswer)
            errs.push(`parts[${pi}].questions[${qi}]: missing correctAnswer`)
          if (!Array.isArray(qq.options) || qq.options.length < 2)
            errs.push(`parts[${pi}].questions[${qi}]: needs ≥2 options`)
        })
      }
    })
  }
  return errs
}

// Append a line before the closing delimiter of a named block.
// Uses character-class negation so the match never overshoots into a sibling block.
function appendToBlock(content, pattern, newLine) {
  if (content.includes(newLine.trim())) return content // already present
  return content.replace(pattern, (_, body, close) => body + newLine + "\n" + close)
}

function updateDataTs(id) {
  let c = fs.readFileSync(DATA_TS, "utf8")
  // [^}]* and [^\]]* match across newlines but stop at the first closing delimiter,
  // so they can never slip into a sibling block or function body.
  c = appendToBlock(c, /(const ARTICLES[^{]*\{[^}]*)(\})/,              `  "${id}": require("../data/articles/${id}.json"),`)
  c = appendToBlock(c, /(const QUIZZES[^{]*\{[^}]*)(\})/,               `  "${id}": require("../data/quizzes/${id}.json"),`)
  c = appendToBlock(c, /(export const QUIZ_SEQUENCE\s*=\s*\[[^\]]*)(\])/, `  "${id}",`)
  fs.writeFileSync(DATA_TS, c)
}

function removeFromDataTs(id) {
  let c = fs.readFileSync(DATA_TS, "utf8")
  // Remove require lines (articles + quizzes)
  c = c.replace(new RegExp(`[ \\t]*"${id}": require\\([^)]+\\),?\\n`, "g"), "")
  // Remove from QUIZ_SEQUENCE
  c = c.replace(new RegExp(`[ \\t]*"${id}",?\\n`, "g"), "")
  fs.writeFileSync(DATA_TS, c)
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.get("/api/exercises", (_req, res) => {
  try {
    res.json(readIndex())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post("/api/exercises", (req, res) => {
  try {
    const { article, quiz, isChallenge } = req.body || {}

    const articleErrors = validateArticle(article)
    const quizErrors = validateQuiz(quiz)

    if (articleErrors.length || quizErrors.length) {
      return res.status(400).json({ articleErrors, quizErrors })
    }

    if (article.id !== quiz.articleId) {
      return res.status(400).json({
        articleErrors: [],
        quizErrors: [`quiz.articleId "${quiz.articleId}" does not match article.id "${article.id}"`],
      })
    }

    const id = article.id
    const index = readIndex()

    if (index.find((e) => e.id === id)) {
      return res.status(409).json({
        articleErrors: [`An exercise with id "${id}" already exists`],
        quizErrors: [],
      })
    }

    // Write JSON files
    fs.writeFileSync(path.join(DATA_DIR, "articles", `${id}.json`), JSON.stringify(article, null, 2))
    fs.writeFileSync(path.join(DATA_DIR, "quizzes",  `${id}.json`), JSON.stringify(quiz, null, 2))

    // Update index.json
    const totalQuestions = quiz.parts.reduce((s, p) => s + p.questions.length, 0)
    const entry = {
      id,
      title: article.title,
      source: article.source || "",
      totalPoints: quiz.totalPoints,
      totalQuestions,
    }
    if (isChallenge) entry.type = "challenge"
    index.push(entry)
    writeIndex(index)

    // Update lib/data.ts
    updateDataTs(id)

    res.json({ success: true, id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete("/api/exercises/:id", (req, res) => {
  try {
    const { id } = req.params
    const index = readIndex()
    const next = index.filter((e) => e.id !== id)
    if (next.length === index.length) return res.status(404).json({ error: "Exercise not found" })

    writeIndex(next)

    const aPath = path.join(DATA_DIR, "articles", `${id}.json`)
    const qPath = path.join(DATA_DIR, "quizzes",  `${id}.json`)
    if (fs.existsSync(aPath)) fs.unlinkSync(aPath)
    if (fs.existsSync(qPath)) fs.unlinkSync(qPath)

    removeFromDataTs(id)

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`\n  ✦ 文言教室 Admin Portal\n  → http://localhost:${PORT}\n`)
})
