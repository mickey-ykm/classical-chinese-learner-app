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
 * GET /api/quiz/dse-mock/sample
 *
 * Query params:
 *   userId  (optional) — UUID of the authenticated mobile user
 *
 * Randomly picks 2-3 DSE core articles and samples 22 questions per article.
 * Response: { articles: [...], questions: [...], totalQuestions, totalPoints }
 * Public (no admin session required).
 *
 * NOTE: This route MUST come before /:articleId/sample to avoid matching "dse-mock" as articleId.
 */
router.get("/dse-mock/sample", async (req, res) => {
  try {
    if (!requireSupabase(res)) return

    const { userId } = req.query

    // 1. Fetch all DSE core articles
    const { data: articles, error: artErr } = await supabase
      .from("articles")
      .select("id, title")
      .eq("is_dse_core", true)
      .eq("status", "published")

    if (artErr) throw new Error(artErr.message)

    if (!articles || articles.length === 0) {
      return res.status(404).json({ error: "No DSE core articles found" })
    }

    // 2. Randomly pick 2 or 3 articles
    const count = articles.length >= 3 ? (Math.random() < 0.5 ? 2 : 3) : Math.min(2, articles.length)
    const shuffled = articles.sort(() => Math.random() - 0.5)
    const pickedArticles = shuffled.slice(0, count)

    // 3. For each article, fetch all published questions and sample 22
    const allSampledQuestions = []
    const seenAcrossArticles = new Map() // For cross-article repeat avoidance

    // If userId provided, get all seen questions across ALL DSE articles first
    if (userId) {
      const { data: dseAttempts, error: dseAttErr } = await supabase
        .from("exercise_sessions")
        .select("id, article_id, finished_at")
        .eq("kind", "article-quiz")
        .eq("user_id", userId)
        .in("article_id", pickedArticles.map(a => a.id))

      if (!dseAttErr && dseAttempts && dseAttempts.length > 0) {
        const attemptIds = dseAttempts.map(a => a.id)
        const { data: answers, error: ansErr } = await supabase
          .from("exercise_answers")
          .select("question_id, session_id")
          .in("session_id", attemptIds)

        if (!ansErr && answers) {
          // Build map: question_id -> max(finished_at)
          const attemptToFinishedAt = {}
          for (const att of dseAttempts) {
            attemptToFinishedAt[att.id] = att.finished_at
          }

          for (const ans of answers) {
            const qid = String(ans.question_id)
            const finishedAt = attemptToFinishedAt[ans.session_id]
            if (!seenAcrossArticles.has(qid) || finishedAt > seenAcrossArticles.get(qid)) {
              seenAcrossArticles.set(qid, finishedAt)
            }
          }
        }
      }
    }

    // 4. Sample questions from each article
    for (const article of pickedArticles) {
      const { data: questions, error: qErr } = await supabase
        .from("questions")
        .select("*")
        .eq("article_id", article.id)
        .eq("status", "published")
        .order("part", { ascending: true })

      if (qErr) throw new Error(qErr.message)
      if (!questions || questions.length === 0) continue

      // Sample 22 questions using the sampling logic
      const sampled = sampleByPart(questions, seenAcrossArticles)

      // Add articleId to each question for cross-article context
      const withArticleId = sampled.map(q => ({ ...q, articleId: article.id }))
      allSampledQuestions.push(...withArticleId)
    }

    // 5. Calculate total points
    const totalPoints = allSampledQuestions.reduce((sum, q) => sum + (q.points ?? 1), 0)

    // 6. Convert to camelCase response format
    const responseQuestions = allSampledQuestions.map(q => ({
      ...rowToQuestion(q),
      articleId: q.articleId,
    }))

    res.json({
      articles: pickedArticles,
      questions: responseQuestions,
      totalQuestions: responseQuestions.length,
      totalPoints,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

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

    // 1. Get all article-quiz sessions for this user
    const { data: attempts, error: attErr } = await supabase
      .from("exercise_sessions")
      .select("id, article_id, score, total_points, finished_at")
      .eq("kind", "article-quiz")
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

    // 3. Get distinct seen question IDs per article via exercise_answers
    const allAttemptIds = attempts.map((a) => a.id)
    const { data: answers, error: ansErr } = await supabase
      .from("exercise_answers")
      .select("session_id, question_id")
      .in("session_id", allAttemptIds)

    if (ansErr) throw new Error(ansErr.message)

    // Build session_id -> article_id map
    const sessionToArticle = {}
    for (const a of attempts) sessionToArticle[a.id] = a.article_id

    // Build per-article set of seen question IDs
    const seenByArticle = {}
    for (const ans of answers || []) {
      const aid = sessionToArticle[ans.session_id]
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
