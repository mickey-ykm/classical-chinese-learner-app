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

/**
 * GET /api/quiz/progress?userId=<uuid>
 *
 * Returns per-article progress for all articles where the user has quiz data.
 * Response: { progress: { [articleId]: { seenCount, totalInPool, attemptCount, correctRate } } }
 * Public (no admin session required).
 */
router.get("/progress", async (req, res) => {
  try {
    if (!requireSupabase(res)) return

    const { userId } = req.query
    if (!userId) return res.json({ progress: {} })

    // 1. Get all quiz attempts for this user
    const { data: attempts, error: attErr } = await supabase
      .from("quiz_attempts")
      .select("id, article_id, score, total_points, completed_at")
      .eq("user_id", userId)

    if (attErr) throw new Error(attErr.message)
    if (!attempts || attempts.length === 0) return res.json({ progress: {} })

    // 2. Aggregate per-article attempt stats
    const articleStats = {}
    for (const a of attempts) {
      const aid = a.article_id
      if (!articleStats[aid]) {
        articleStats[aid] = { attemptCount: 0, totalScore: 0, totalPoints: 0, attemptIds: [] }
      }
      articleStats[aid].attemptCount++
      articleStats[aid].totalScore += a.score ?? 0
      articleStats[aid].totalPoints += a.total_points ?? 0
      articleStats[aid].attemptIds.push(a.id)
    }

    // 3. Get distinct seen question IDs per article via quiz_answers
    const allAttemptIds = attempts.map((a) => a.id)
    const { data: answers, error: ansErr } = await supabase
      .from("quiz_answers")
      .select("attempt_id, question_id")
      .in("attempt_id", allAttemptIds)

    if (ansErr) throw new Error(ansErr.message)

    // Build attempt_id -> article_id map
    const attemptToArticle = {}
    for (const a of attempts) attemptToArticle[a.id] = a.article_id

    // Build per-article set of seen question IDs
    const seenByArticle = {}
    for (const ans of answers || []) {
      const aid = attemptToArticle[ans.attempt_id]
      if (!aid) continue
      if (!seenByArticle[aid]) seenByArticle[aid] = new Set()
      seenByArticle[aid].add(String(ans.question_id))
    }

    // 4. Get total published question count per article (only for articles with attempts)
    const articleIds = Object.keys(articleStats)
    const { data: qCounts, error: qErr } = await supabase
      .from("questions")
      .select("article_id")
      .in("article_id", articleIds)
      .eq("status", "published")

    if (qErr) throw new Error(qErr.message)

    const totalByArticle = {}
    for (const row of qCounts || []) {
      totalByArticle[row.article_id] = (totalByArticle[row.article_id] ?? 0) + 1
    }

    // 5. Assemble response
    const progress = {}
    for (const aid of articleIds) {
      const stats = articleStats[aid]
      const seenCount = seenByArticle[aid]?.size ?? 0
      const totalInPool = totalByArticle[aid] ?? 0
      const correctRate = stats.totalPoints > 0
        ? Math.round((stats.totalScore / stats.totalPoints) * 100)
        : 0

      progress[aid] = {
        seenCount,
        totalInPool,
        attemptCount: stats.attemptCount,
        correctRate,
      }
    }

    res.json({ progress })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
