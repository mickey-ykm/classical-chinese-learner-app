const express = require("express")
const fs = require("fs")
const path = require("path")
const { supabase } = require("../lib/supabase")
const { callOpenRouter, estimateCost } = require("../lib/openrouter")
const { ASSESSMENT_CONFIG_FILE, DEFAULT_ASSESSMENT_CONFIG } = require("../lib/quiz-prompts")
const { runs } = require("../lib/generate-runs")

const ASSESSMENT_RESULTS_DIR = path.join(__dirname, "..", "assessment-results")

function readAssessmentConfig() {
  try {
    return JSON.parse(fs.readFileSync(ASSESSMENT_CONFIG_FILE, "utf8"))
  } catch {
    return DEFAULT_ASSESSMENT_CONFIG
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

const router = express.Router()

router.get("/config", (_req, res) => {
  res.json(readAssessmentConfig())
})

router.post("/config", (req, res) => {
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

router.post("/run", (req, res) => {
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
      const DATA_DIR = path.join(__dirname, "..", "..", "data")
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

router.get("/status/:runId", (req, res) => {
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

router.get("/download/:runId/:type", (req, res) => {
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

router.get("/history", (_req, res) => {
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

router.get("/data/:runId/:type", (req, res) => {
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

module.exports = router
