const express = require("express")
const { getRevisionSummary, sampleRevisionQuestions } = require("../lib/revision-helpers")

const router = express.Router()

// GET /api/revision/summary?userId=<uuid>
// Returns overall stats + mistakes grouped by article and by part
router.get("/summary", async (req, res) => {
  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ error: "userId query param required" })
    }

    const summary = await getRevisionSummary(userId)
    res.json(summary)
  } catch (e) {
    console.error("Revision summary error:", e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/revision/sample?userId=<uuid>&articleId=<id>&limit=<N>
// GET /api/revision/sample?userId=<uuid>&part=<N>&limit=<N>
// GET /api/revision/sample?userId=<uuid>&limit=<N>
// Returns sampled revision questions with smart prioritization
router.get("/sample", async (req, res) => {
  try {
    const { userId, articleId, part, limit } = req.query

    if (!userId) {
      return res.status(400).json({ error: "userId query param required" })
    }

    const questions = await sampleRevisionQuestions(userId, {
      articleId,
      part: part ? parseInt(part) : undefined,
      limit: limit ? parseInt(limit) : 15
    })

    // Convert to frontend-friendly format (camelCase)
    const formatted = questions.map(q => ({
      id: q.id,
      part: q.part,
      points: q.points || 1,
      stem: q.stem,
      format: q.format,
      options: q.format === 'mc' && q.options ? Object.values(q.options).map((text, i) => ({
        key: String.fromCharCode(65 + i), // A, B, C, D...
        text
      })) : undefined,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      selectCount: q.select_count || 1,
      sequenceTokens: q.sequence_tokens,
      articleId: q.article_id || undefined,
      mistakeCount: q.mistakeCount
    }))

    res.json(formatted)
  } catch (e) {
    console.error("Revision sample error:", e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
