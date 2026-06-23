const express = require("express")
const { supabase, requireSupabase } = require("../lib/supabase")
const {
  upsertCrossArticleQuestion,
  deleteCrossArticleQuestion,
  getCrossArticleQuestion,
  listCrossArticleQuestions,
} = require("../lib/cross-article-helpers")

const router = express.Router()

// GET /api/cross-article-questions - List all with filters
router.get("/", async (req, res) => {
  try {
    if (!requireSupabase(res)) return

    const filters = {}
    if (req.query.status) filters.status = req.query.status
    if (req.query.part) filters.part = parseInt(req.query.part, 10)

    const questions = await listCrossArticleQuestions(filters)
    res.json(questions)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/cross-article-questions/:id - Get single question
router.get("/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return

    const question = await getCrossArticleQuestion(req.params.id)
    res.json(question)
  } catch (e) {
    if (e.message.includes("not found")) {
      res.status(404).json({ error: "Question not found" })
    } else {
      res.status(500).json({ error: e.message })
    }
  }
})

// POST /api/cross-article-questions - Create new question
router.post("/", async (req, res) => {
  try {
    if (!requireSupabase(res)) return

    const { relatedArticleIds, ...questionData } = req.body

    // Validate required fields
    if (!questionData.questionText) {
      return res.status(400).json({ error: "questionText is required" })
    }
    if (!questionData.format || !["mc", "fill-blank", "sentence-order"].includes(questionData.format)) {
      return res.status(400).json({ error: "Invalid format" })
    }
    if (!questionData.part || ![7, 8].includes(questionData.part)) {
      return res.status(400).json({ error: "Part must be 7 or 8" })
    }
    if (!questionData.correctAnswer) {
      return res.status(400).json({ error: "correctAnswer is required" })
    }
    if (!Array.isArray(relatedArticleIds) || relatedArticleIds.length === 0) {
      return res.status(400).json({ error: "At least one related article is required" })
    }

    const questionId = await upsertCrossArticleQuestion({
      ...questionData,
      relatedArticleIds,
    })

    res.json({ success: true, id: questionId })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/cross-article-questions/:id - Update question
router.put("/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return

    const { relatedArticleIds, ...questionData } = req.body

    // Validate required fields
    if (!questionData.questionText) {
      return res.status(400).json({ error: "questionText is required" })
    }
    if (!questionData.format || !["mc", "fill-blank", "sentence-order"].includes(questionData.format)) {
      return res.status(400).json({ error: "Invalid format" })
    }
    if (!questionData.part || ![7, 8].includes(questionData.part)) {
      return res.status(400).json({ error: "Part must be 7 or 8" })
    }
    if (!questionData.correctAnswer) {
      return res.status(400).json({ error: "correctAnswer is required" })
    }
    if (!Array.isArray(relatedArticleIds) || relatedArticleIds.length === 0) {
      return res.status(400).json({ error: "At least one related article is required" })
    }

    await upsertCrossArticleQuestion({
      id: req.params.id,
      ...questionData,
      relatedArticleIds,
    })

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/cross-article-questions/:id - Delete question
router.delete("/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return

    await deleteCrossArticleQuestion(req.params.id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/cross-article-questions/bulk-publish - Bulk publish draft questions
router.post("/bulk-publish", async (req, res) => {
  try {
    if (!requireSupabase(res)) return

    const { ids } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids[] required" })
    }

    // Fetch questions and filter to drafts only
    const { data: questions, error: fetchErr } = await supabase
      .from("cross_article_questions")
      .select("id, status")
      .in("id", ids)

    if (fetchErr) throw new Error(fetchErr.message)

    const draftIds = (questions || []).filter(q => q.status === "draft").map(q => q.id)

    if (draftIds.length === 0) {
      return res.json({ success: true, published: 0, message: "No draft questions to publish" })
    }

    // Update to published
    const { error: updateErr } = await supabase
      .from("cross_article_questions")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .in("id", draftIds)

    if (updateErr) throw new Error(updateErr.message)

    res.json({ success: true, published: draftIds.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/cross-article-questions/bulk-delete - Bulk delete draft questions
router.post("/bulk-delete", async (req, res) => {
  try {
    if (!requireSupabase(res)) return

    const { ids } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids[] required" })
    }

    // Only allow deleting draft questions
    const { data: questions, error: fetchErr } = await supabase
      .from("cross_article_questions")
      .select("id, status")
      .in("id", ids)

    if (fetchErr) throw new Error(fetchErr.message)

    const draftIds = (questions || []).filter(q => q.status === "draft").map(q => q.id)

    if (draftIds.length === 0) {
      return res.json({ success: true, deleted: 0, message: "No draft questions to delete" })
    }

    const { error } = await supabase
      .from("cross_article_questions")
      .delete()
      .in("id", draftIds)

    if (error) throw new Error(error.message)

    res.json({ success: true, deleted: draftIds.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
