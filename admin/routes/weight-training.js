const express = require("express")
const { supabase } = require("../lib/supabase")
const {
  sampleWeightTrainingQuestions,
  getWeightTrainingProgress,
} = require("../lib/weight-training-sampling")

const router = express.Router()

// GET /api/quiz/weight-training/sample?userId=<uuid>
// Public endpoint - no admin auth required
router.get("/sample", async (req, res) => {
  try {
    const { userId } = req.query

    const questions = await sampleWeightTrainingQuestions(userId || null)

    // Convert to frontend format (camelCase)
    const formatted = questions.map(q => ({
      id: q.id,
      questionText: q.question_text,
      format: q.format,
      part: q.part,
      options: q.format === 'mc' && q.options ? Object.values(q.options) : undefined,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      selectCount: q.select_count || 1,
      points: q.points || 1,  // Point value for scoring
      sequenceTokens: q.sequence_tokens || undefined,
      relatedArticleIds: q.relatedArticleIds || [],
    }))

    res.json(formatted)
  } catch (e) {
    if (e.message.includes("Insufficient questions")) {
      res.status(400).json({ error: e.message })
    } else {
      res.status(500).json({ error: e.message })
    }
  }
})

// GET /api/quiz/weight-training/progress?userId=<uuid>
// Public endpoint - no admin auth required
router.get("/progress", async (req, res) => {
  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ error: "userId query param required" })
    }

    const progress = await getWeightTrainingProgress(userId)
    res.json(progress)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/quiz/weight-training/session
// Public endpoint - saves completed session + answers
router.post("/session", async (req, res) => {
  try {
    const { userId, score, totalQuestions, answers } = req.body

    if (!userId) {
      return res.status(400).json({ error: "userId is required" })
    }
    if (typeof score !== "number" || typeof totalQuestions !== "number") {
      return res.status(400).json({ error: "score and totalQuestions are required" })
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "answers array is required" })
    }

    // Insert exercise_session
    const { data: session, error: sessErr } = await supabase
      .from("exercise_sessions")
      .insert({
        user_id: userId,
        kind: "weight-training",
        article_id: null, // weight-training is cross-article
        score,
        total_points: totalQuestions, // 1 point per question
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (sessErr) throw new Error("Failed to create session: " + sessErr.message)

    const sessionId = session.id

    // Insert exercise_answers
    const answerRows = answers.map(a => ({
      session_id: sessionId,
      question_id: a.questionId,
      user_answer: a.userAnswer || null,
      is_correct: a.isCorrect,
      points_earned: a.pointsEarned || (a.isCorrect ? 1 : 0),
      answered_at: new Date().toISOString(),
    }))

    const { error: ansErr } = await supabase
      .from("exercise_answers")
      .insert(answerRows)

    if (ansErr) throw new Error("Failed to save answers: " + ansErr.message)

    res.json({ success: true, sessionId })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
