const express = require("express")
const { supabase, requireSupabase } = require("../lib/supabase")
const { sampleByPart, getSeenData } = require("../lib/sampling")

const router = express.Router()

/**
 * Convert a DB question row to the camelCase response shape.
 */
function rowToQuestion(row) {
  // Convert options object {A: "text", B: "text"} -> [{key, text}] sorted by key
  let options = null
  if (row.options && typeof row.options === "object" && !Array.isArray(row.options)) {
    options = Object.entries(row.options)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, text]) => ({ key, text }))
  }

  return {
    id: row.id,
    part: row.part,
    format: row.format,
    type: row.type,
    stem: row.stem,
    options,
    correctAnswer: row.correct_answer,
    selectCount: row.select_count,
    sequenceTokens: row.sequence_tokens,
    questionTypes: row.question_types,
    points: row.points,
    explanation: row.explanation,
  }
}

/**
 * GET /api/quiz/:articleId/sample
 *
 * Query params:
 *   userId  (optional) — UUID of the authenticated mobile user
 *   seed    (optional) — reserved, ignored for now
 */
router.get("/:articleId/sample", async (req, res) => {
  try {
    if (!requireSupabase(res)) return

    const { articleId } = req.params
    if (!articleId) return res.status(400).json({ error: "articleId is required" })

    const { userId } = req.query

    // Fetch all published questions for the article
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("*")
      .eq("article_id", articleId)
      .eq("status", "published")
      .order("part", { ascending: true })

    if (qErr) throw new Error(qErr.message)

    if (!questions || questions.length === 0) {
      return res.status(404).json({ error: "No published questions found for article" })
    }

    // Get seen data (empty defaults if no userId)
    let seenMap = new Map()
    let seenCount = 0
    let attemptNumber = 0

    if (userId) {
      const seen = await getSeenData(userId, articleId)
      seenMap = seen.seenMap
      seenCount = seen.seenCount
      attemptNumber = seen.attemptNumber
    }

    // Sample questions
    const sampled = sampleByPart(questions, seenMap)

    // Compute pool progress
    const totalInPool = questions.length
    const estimatedAttemptsToComplete = Math.ceil(Math.max(0, totalInPool - seenCount) / 22)

    const poolProgress = {
      totalInPool,
      seenCount,
      attemptNumber,
      estimatedAttemptsToComplete,
    }

    res.json({
      articleId,
      totalQuestions: sampled.length,
      poolProgress,
      questions: sampled.map(rowToQuestion),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
