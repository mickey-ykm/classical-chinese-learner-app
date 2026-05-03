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

app.get("/api/exercises/:id", (req, res) => {
  try {
    const { id } = req.params
    const index = readIndex()
    const entry = index.find((e) => e.id === id)
    if (!entry) return res.status(404).json({ error: "Exercise not found" })

    const articlePath = path.join(DATA_DIR, "articles", `${id}.json`)
    const quizPath = path.join(DATA_DIR, "quizzes", `${id}.json`)
    if (!fs.existsSync(articlePath)) return res.status(404).json({ error: "Article file not found" })
    if (!fs.existsSync(quizPath)) return res.status(404).json({ error: "Quiz file not found" })

    const article = JSON.parse(fs.readFileSync(articlePath, "utf8"))
    const quiz = JSON.parse(fs.readFileSync(quizPath, "utf8"))
    res.json({ article, quiz, isChallenge: entry.type === "challenge" })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put("/api/exercises/:id", (req, res) => {
  try {
    const { id } = req.params
    const { article, quiz, isChallenge } = req.body || {}

    const index = readIndex()
    const entryIdx = index.findIndex((e) => e.id === id)
    if (entryIdx === -1) return res.status(404).json({ error: "Exercise not found" })

    const articleErrors = validateArticle(article)
    const quizErrors = validateQuiz(quiz)
    if (articleErrors.length || quizErrors.length) {
      return res.status(400).json({ articleErrors, quizErrors })
    }

    if (article.id !== id) {
      return res.status(400).json({
        articleErrors: [`article.id "${article.id}" must match exercise id "${id}"`],
        quizErrors: [],
      })
    }
    if (quiz.articleId !== id) {
      return res.status(400).json({
        articleErrors: [],
        quizErrors: [`quiz.articleId "${quiz.articleId}" must match exercise id "${id}"`],
      })
    }

    fs.writeFileSync(path.join(DATA_DIR, "articles", `${id}.json`), JSON.stringify(article, null, 2))
    fs.writeFileSync(path.join(DATA_DIR, "quizzes",  `${id}.json`), JSON.stringify(quiz, null, 2))

    const totalQuestions = quiz.parts.reduce((s, p) => s + p.questions.length, 0)
    const entry = { id, title: article.title, source: article.source || "", totalPoints: quiz.totalPoints, totalQuestions }
    if (isChallenge) entry.type = "challenge"
    index[entryIdx] = entry
    writeIndex(index)

    res.json({ success: true })
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

  // If normalized markers (1)(2)… are already embedded in the text, use marker-based splitting
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

  // Arabic numeral markers: in classical Chinese, Arabic numerals are footnote references.
  // e.g., "弈秋1，通國2之善弈者也" where 1, 2 reference footnotes 1, 2.
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

  // Term-based: insert marker immediately after each term's first occurrence in the text
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
    text.slice(pos).split(/\n+/).forEach((line) => { if (line.trim()) segments.push({ text: line.trim() }) })
  }
  return segments.length ? segments : segmentText(text)
}

function parseFootnotesText(raw) {
  if (!raw || !raw.trim()) return []
  // Normalize circled CJK dialect markers: ○粵 → [粵], ○漢 → [漢], etc.
  raw = raw.replace(/○([一-鿿])/g, "[$1]")
  // Normalize inline multi-footnote strings: "1. termA︰exp 2. termB︰exp …" → one entry per line
  raw = raw.replace(/\s+(?=\d+[.。]\s)/g, "\n")
  const footnotes = []
  let idNum = 1
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    // ︰ (U+FE30), ︓ (U+FE13), ：(U+FF1A fullwidth colon) and : (ASCII) are all accepted
    // Marker prefix formats: (1) term  ① term  1. / 1  / 1、 term
    const withMarker = line.match(/^([①-⑳]|[（(]\d+[)）]|\[\d+\]|\d+[.。、）)\s])\s*([^：:︓︰]+)[：:︓︰]\s*(.+)$/)
    if (withMarker) {
      footnotes.push({ id: String(idNum), marker: `(${idNum})`, term: withMarker[2].trim(), explanation: withMarker[3].trim() })
      idNum++
      continue
    }
    // No marker: term︰explanation
    const noMarker = line.match(/^([^：:︓︰]+)[：:︓︰]\s*(.+)$/)
    if (noMarker) {
      footnotes.push({ id: String(idNum), marker: `(${idNum})`, term: noMarker[1].trim(), explanation: noMarker[2].trim() })
      idNum++
      continue
    }
    // Continuation line: append to the previous footnote's explanation
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

// ── Generate Article ─────────────────────────────────────────────────────────

app.post("/api/generate-article", (req, res) => {
  const { title, source, text, footnotesText, model, translationPrompt, quizPrompt, apiKey } = req.body || {}
  if (!apiKey) return res.status(400).json({ error: "apiKey is required" })
  if (!title) return res.status(400).json({ error: "title is required" })
  if (!text) return res.status(400).json({ error: "text is required" })
  if (!model) return res.status(400).json({ error: "model is required" })

  const runId = "gen_" + Date.now().toString()
  generateRuns[runId] = { status: "running", step: "", done: 0, total: 2, articleJson: null, quizJson: null, error: null }
  res.json({ runId })

  ;(async () => {
    try {
      let parsedFootnotes = parseFootnotesText(footnotesText || "")

      // If no footnotes were provided but the text contains Arabic numerals,
      // auto-create stub entries so the numerals get linked into segments.
      // The user can fill in term/explanation by editing the generated JSON before saving.
      if (!parsedFootnotes.length) {
        const found = [...new Set(
          [...(title + " " + text).matchAll(/(?<!\d)(\d+)(?!\d)/g)].map((m) => m[1])
        )].sort((a, b) => Number(a) - Number(b))
        if (found.length) {
          parsedFootnotes = found.map((n) => ({ id: n, marker: `(${n})`, term: "", explanation: "" }))
        }
      }
      const fnLines = parsedFootnotes.length
        ? parsedFootnotes.map((f) => `${f.marker} ${f.term}：${f.explanation}`).join("\n")
        : "（無注釋）"
      const context = `標題：${title}\n來源：${source || "—"}\n\n原文：\n${text}\n\n注釋：\n${fnLines}`

      // Translation — also ask model to suggest a pinyin slug for the article ID
      generateRuns[runId].step = "生成現代文翻譯…"
      const tRes = await callOpenRouter(model, [
        { role: "system", content: translationPrompt },
        { role: "user", content: `請翻譯以下文言文。在 JSON 回覆中額外加入 "suggestedId" 欄位，值為標題的漢語拼音（全小寫、以連字號分隔，例如 "chun-ye-xi-yu"）。\n\n${context}` },
      ], apiKey)
      const tParsed = JSON.parse(tRes.content)
      if (!Array.isArray(tParsed.modernTranslation)) throw new Error("Translation response missing modernTranslation[]")
      const articleId = (typeof tParsed.suggestedId === "string" && /^[a-z0-9-]+$/.test(tParsed.suggestedId))
        ? tParsed.suggestedId
        : "art-" + Date.now().toString(36)
      generateRuns[runId].done++

      // Quiz
      generateRuns[runId].step = "生成測驗題目…"
      const qRes = await callOpenRouter(model, [
        { role: "system", content: quizPrompt },
        { role: "user", content: `請為以下文言文出題：\n\n${context}` },
      ], apiKey)
      const qParsed = JSON.parse(qRes.content)
      if (!Array.isArray(qParsed.parts)) throw new Error("Quiz response missing parts[]")
      generateRuns[runId].done++

      // Assemble — normalize options to [{key,text}] array (LLMs sometimes return {A:text,B:text,...})
      const parts = qParsed.parts.map((p) => ({
        ...p,
        questions: (p.questions || []).map((q) => ({ ...q, options: normalizeOptions(q.options) })),
      }))
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
      const quizJson = { articleId, totalPoints, parts }

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
  res.json({ status: run.status, step: run.step, done: run.done, total: run.total, articleJson: run.articleJson, quizJson: run.quizJson, error: run.error })
})

app.listen(PORT, () => {
  console.log(`\n  ✦ 文言教室 Admin Portal\n  → http://localhost:${PORT}\n`)
})
