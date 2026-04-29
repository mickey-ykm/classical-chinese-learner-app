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

// ── LLM Assessment ───────────────────────────────────────────────────────────

const ASSESSMENT_CONFIG_FILE = path.join(__dirname, "assessment-config.json")
const ASSESSMENT_RESULTS_DIR = path.join(__dirname, "assessment-results")
const runs = {}

const DEFAULT_ASSESSMENT_CONFIG = {
  models: [
    "deepseek/deepseek-v4-flash",
    "qwen/qwen3.5-plus-20260420",
    "qwen/qwen3.6-flash",
    "z-ai/glm-5",
  ],
  translationPrompt:
    "你是一位古典漢語（文言文）專家。請將所提供的文言文翻譯成流暢的現代白話文。請參考所附的注釋來理解詞彙。只需回傳一個有效的 JSON 物件，不要包含 markdown、不要附加說明。格式如下：{\"modernTranslation\": [\"段落一\", \"段落二\", ...]}。請將相關句子歸納成自然流暢的段落。",
  quizPrompt:
    "你是一位專業的文言文教師，正在為學生編制評量題目。請為所提供的文言文設計一份四部分的測驗。只需回傳一個有效的 JSON 物件，不要包含 markdown、不要附加說明。\n\n請確切設計：\n- 第一部分：6道字詞釋義選擇題（每題1分）\n- 第二部分：4道句子翻譯與語法辨析題（每題2分）\n- 第三部分：4道文意理解題（每題3分）\n- 第四部分：4道修辭與人物形象題（每題2分）\n\n每題須包含4個選項（A/B/C/D）、一個正確答案（correctAnswer）及簡短的解題說明（explanation）。\n\nJSON 格式如下：\n{\n  \"parts\": [\n    {\n      \"part\": 1,\n      \"title\": \"第一部分：字詞釋義選擇題\",\n      \"pointsPerQuestion\": 1,\n      \"questions\": [\n        {\n          \"id\": 1, \"part\": 1, \"points\": 1,\n          \"stem\": \"「詞語」在文中的意思是：\",\n          \"options\": [{\"key\":\"A\",\"text\":\"選項\"},{\"key\":\"B\",\"text\":\"選項\"},{\"key\":\"C\",\"text\":\"選項\"},{\"key\":\"D\",\"text\":\"選項\"}],\n          \"correctAnswer\": \"B\",\n          \"explanation\": \"解釋為何B正確\"\n        }\n      ]\n    },\n    {\"part\":2,\"title\":\"第二部分：句子翻譯與語法辨析\",\"pointsPerQuestion\":2,\"questions\":[...]},\n    {\"part\":3,\"title\":\"第三部分：文意理解題\",\"pointsPerQuestion\":3,\"questions\":[...]},\n    {\"part\":4,\"title\":\"第四部分：修辭與人物形象\",\"pointsPerQuestion\":2,\"questions\":[...]}\n  ]\n}",
}

function readAssessmentConfig() {
  try {
    return JSON.parse(fs.readFileSync(ASSESSMENT_CONFIG_FILE, "utf8"))
  } catch {
    return DEFAULT_ASSESSMENT_CONFIG
  }
}

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

async function callOpenRouter(model, messages, apiKey, retries = 1) {
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
    await new Promise((r) => setTimeout(r, 10_000))
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

  // summary.csv — one row per API call
  const summaryLines = [csvRow(["article_id", "article_title", "model", "call_type", "latency_ms", "prompt_tokens", "completion_tokens", "est_cost_usd", "parse_ok", "error"])]
  for (const r of results) {
    summaryLines.push(csvRow([
      r.articleId, r.articleTitle || "", r.model, r.callType,
      r.latencyMs, r.promptTokens, r.completionTokens,
      r.estCostUsd !== null && r.estCostUsd !== undefined ? r.estCostUsd.toFixed(6) : "",
      r.parseOk ? "true" : "false", r.error || "",
    ]))
  }
  fs.writeFileSync(path.join(dir, summaryFile), summaryLines.join("\n"))

  // translations.csv — wide format, one row per paragraph
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
      const modelCells = models.map((m) => artTrans.find((x) => x.model === m)?.parsed?.modernTranslation?.[i] || "")
      transLines.push(csvRow([artId, String(i + 1), ref, ...modelCells]))
    }
  }
  fs.writeFileSync(path.join(dir, translationsFile), transLines.join("\n"))

  // quiz.csv — long format, one row per question
  const quizLines = [csvRow(["article_id", "model", "part", "part_title", "q_index", "stem", "opt_A", "opt_B", "opt_C", "opt_D", "correct_answer", "explanation"])]
  for (const r of results.filter((r) => r.callType === "quiz" && r.parseOk)) {
    for (const part of r.parsed?.parts || []) {
      for (const q of part.questions || []) {
        const opts = {}
        for (const o of q.options || []) opts[o.key] = o.text
        quizLines.push(csvRow([r.articleId, r.model, part.part, part.title, q.id, q.stem, opts.A || "", opts.B || "", opts.C || "", opts.D || "", q.correctAnswer, q.explanation]))
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

app.get("/api/assessment/config", (_req, res) => {
  res.json(readAssessmentConfig())
})

app.post("/api/assessment/config", (req, res) => {
  try {
    const { models, translationPrompt, quizPrompt } = req.body || {}
    fs.writeFileSync(ASSESSMENT_CONFIG_FILE, JSON.stringify({ models, translationPrompt, quizPrompt }, null, 2))
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
  if (!hasIds && !hasRaw) return res.status(400).json({ error: "articleIds or rawArticles required" })
  if (!Array.isArray(models) || !models.length) return res.status(400).json({ error: "models required" })

  const runId = Date.now().toString()
  const now = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  const filePrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  const total = ((articleIds?.length || 0) + (rawArticles?.length || 0)) * models.length * 2
  runs[runId] = { status: "running", done: 0, total, currentTask: "", error: null, csvDir: null, files: null }
  res.json({ runId })

  ;(async () => {
    const results = []
    try {
      // Build unified article list from file-based and raw sources
      const articles = []
      for (const articleId of (articleIds || [])) {
        const article = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "articles", `${articleId}.json`), "utf8"))
        articles.push({ id: articleId, title: article.title, context: buildArticleContext(article), reference: article.modernTranslation || [] })
      }
      for (const raw of (rawArticles || [])) {
        const context = `標題：${raw.title}\n來源：（自訂）\n\n原文：\n${raw.text}\n\n注釋：（無注釋）`
        articles.push({ id: raw.id || "raw-article", title: raw.title || "自訂文章", context, reference: [] })
      }

      for (const art of articles) {
        for (const model of models) {
          const shortModel = model.split("/").pop()

          // Translation call
          runs[runId].currentTask = `翻譯 · ${shortModel} · ${art.title}`
          const tResult = { articleId: art.id, articleTitle: art.title, model, callType: "translation", latencyMs: 0, promptTokens: 0, completionTokens: 0, estCostUsd: null, parseOk: false, error: null, parsed: null, reference: art.reference }
          try {
            const r = await callOpenRouter(model, [{ role: "system", content: translationPrompt }, { role: "user", content: `請翻譯以下文言文：\n\n${art.context}` }], apiKey)
            Object.assign(tResult, { latencyMs: r.latencyMs, promptTokens: r.promptTokens, completionTokens: r.completionTokens, estCostUsd: estimateCost(model, r.promptTokens, r.completionTokens) })
            const parsed = JSON.parse(r.content)
            tResult.parsed = parsed
            tResult.parseOk = Array.isArray(parsed.modernTranslation)
          } catch (e) { tResult.error = e.message }
          results.push(tResult)
          runs[runId].done++

          // Quiz call
          runs[runId].currentTask = `出題 · ${shortModel} · ${art.title}`
          const qResult = { articleId: art.id, articleTitle: art.title, model, callType: "quiz", latencyMs: 0, promptTokens: 0, completionTokens: 0, estCostUsd: null, parseOk: false, error: null, parsed: null }
          try {
            const r = await callOpenRouter(model, [{ role: "system", content: quizPrompt }, { role: "user", content: `請為以下文言文出題：\n\n${art.context}` }], apiKey)
            Object.assign(qResult, { latencyMs: r.latencyMs, promptTokens: r.promptTokens, completionTokens: r.completionTokens, estCostUsd: estimateCost(model, r.promptTokens, r.completionTokens) })
            const parsed = JSON.parse(r.content)
            qResult.parsed = parsed
            qResult.parseOk = Array.isArray(parsed.parts)
          } catch (e) { qResult.error = e.message }
          results.push(qResult)
          runs[runId].done++
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
  res.json({ status: run.status, done: run.done, total: run.total, currentTask: run.currentTask || "", error: run.error })
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

  // In-memory run (current session)
  const run = runs[runId]
  if (run?.files?.[type]) {
    const filePath = path.join(run.csvDir, run.files[type])
    if (fs.existsSync(filePath)) return sendFile(filePath, run.files[type])
  }

  // Fallback: scan disk (runs from previous server sessions)
  const dir = path.join(ASSESSMENT_RESULTS_DIR, runId)
  if (!fs.existsSync(dir)) return res.status(404).json({ error: "Run not found" })
  const match = fs.readdirSync(dir).find((f) =>
    f.endsWith(".csv") && (f === `${type}.csv` || f.startsWith(`${type}_`))
  )
  if (!match) return res.status(404).json({ error: "File not found" })
  sendFile(path.join(dir, match), match)
})

app.get("/api/assessment/history", (_req, res) => {
  try {
    if (!fs.existsSync(ASSESSMENT_RESULTS_DIR)) return res.json([])
    const entries = fs.readdirSync(ASSESSMENT_RESULTS_DIR).filter((d) =>
      fs.statSync(path.join(ASSESSMENT_RESULTS_DIR, d)).isDirectory()
    )
    const history = entries.map((runId) => {
      const dir = path.join(ASSESSMENT_RESULTS_DIR, runId)
      const csvFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".csv"))
      const files = {}
      for (const f of csvFiles) {
        if (f === "summary.csv" || f.startsWith("summary_")) files.summary = f
        else if (f === "translations.csv" || f.startsWith("translations_")) files.translations = f
        else if (f === "quiz.csv" || f.startsWith("quiz_")) files.quiz = f
      }
      // Derive datetime from filename: summary_2026-04-29_14-30-00.csv
      let datetime = null
      const summaryName = files.summary || ""
      const m = summaryName.match(/summary_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.csv/)
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
    const match = fs.readdirSync(dir).find((f) =>
      f.endsWith(".csv") && (f === `${type}.csv` || f.startsWith(`${type}_`))
    )
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

app.listen(PORT, () => {
  console.log(`\n  ✦ 文言教室 Admin Portal\n  → http://localhost:${PORT}\n`)
})
