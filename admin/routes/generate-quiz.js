const express = require("express")
const fs = require("fs")
const path = require("path")
const { supabase } = require("../lib/supabase")
const { insertQuestionsAsDrafts } = require("../lib/article-helpers")
const { readQuizPromptsAsync } = require("../lib/quiz-prompts")
const { callOpenRouter, normalizeOptions } = require("../lib/openrouter")
const { generateRuns } = require("../lib/generate-runs")

const DATA_DIR = path.join(__dirname, "..", "..", "data")

const router = express.Router({ mergeParams: true })

// POST /api/exercises/:id/generate-quiz
router.post("/", async (req, res) => {
  const { id } = req.params
  const { promptId, model, apiKey } = req.body || {}
  if (!apiKey) return res.status(400).json({ error: "apiKey is required" })
  if (!promptId) return res.status(400).json({ error: "promptId is required" })

  const prompts = await readQuizPromptsAsync()
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

// GET /api/exercises/:id/generate-quiz/status/:runId
router.get("/status/:runId", (req, res) => {
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

module.exports = router
