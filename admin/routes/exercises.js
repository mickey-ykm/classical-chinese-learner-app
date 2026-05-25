const express = require("express")
const { supabase, requireSupabase } = require("../lib/supabase")
const {
  nowIso,
  quizHasQuestions,
  articleToRow,
  rowToExercise,
  rowToIndexEntry,
  upsertQuestions,
  createVersionSnapshot,
} = require("../lib/article-helpers")
const { ArticleSchema, QuizSchema, formatZodErrors } = require("../lib/schemas")

const router = express.Router()

router.get("/", async (_req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { data, error } = await supabase
      .from("articles")
      .select(
        "id, title, source, level, is_challenge, is_free, is_dse_core, article_type, status, created_at, expected_minutes, exercise_template, quiz_json"
      )
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)
    res.json((data || []).map(rowToIndexEntry))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post("/", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { article, quiz, isChallenge, isFree, level, status, expectedMinutes, exerciseTemplate } =
      req.body || {}

    const articleResult = ArticleSchema.safeParse(article)
    if (!articleResult.success) {
      return res
        .status(400)
        .json({ articleErrors: formatZodErrors(articleResult.error), quizErrors: [] })
    }

    const hasQuizPayload = quiz != null && quizHasQuestions(quiz)
    if (hasQuizPayload) {
      const quizResult = QuizSchema.safeParse(quiz)
      if (!quizResult.success) {
        return res
          .status(400)
          .json({ articleErrors: [], quizErrors: formatZodErrors(quizResult.error) })
      }
      if (article.id !== quiz.articleId) {
        return res.status(400).json({
          articleErrors: [],
          quizErrors: [
            `quiz.articleId "${quiz.articleId}" does not match article.id "${article.id}"`,
          ],
        })
      }
    }

    const finalQuiz = hasQuizPayload ? quiz : null
    const row = articleToRow(article, {
      isChallenge,
      isFree,
      level,
      status,
      expectedMinutes,
      exerciseTemplate,
      quizJson: finalQuiz,
    })

    const { error } = await supabase.from("articles").insert(row)
    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          articleErrors: [`An exercise with id "${article.id}" already exists`],
          quizErrors: [],
        })
      }
      throw new Error(error.message)
    }

    if (finalQuiz) await upsertQuestions(article.id, finalQuiz)
    await createVersionSnapshot(article.id, { article, quiz: finalQuiz })

    res.json({ success: true, id: article.id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get("/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single()
    if (error || !data) return res.status(404).json({ error: "Exercise not found" })
    res.json(rowToExercise(data))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put("/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { article, quiz, isChallenge, isFree, isDseCore, articleType, level, status, expectedMinutes, exerciseTemplate } =
      req.body || {}

    const { data: existing, error: fetchErr } = await supabase
      .from("articles")
      .select("id, level, status, created_at")
      .eq("id", id)
      .single()
    if (fetchErr || !existing) return res.status(404).json({ error: "Exercise not found" })

    const articleResult = ArticleSchema.safeParse(article)
    if (!articleResult.success) {
      return res
        .status(400)
        .json({ articleErrors: formatZodErrors(articleResult.error), quizErrors: [] })
    }
    if (article.id !== id) {
      return res.status(400).json({
        articleErrors: [`article.id "${article.id}" must match exercise id "${id}"`],
        quizErrors: [],
      })
    }

    const hasQuizPayload = quiz != null && quizHasQuestions(quiz)
    if (hasQuizPayload) {
      const quizResult = QuizSchema.safeParse(quiz)
      if (!quizResult.success) {
        return res
          .status(400)
          .json({ articleErrors: [], quizErrors: formatZodErrors(quizResult.error) })
      }
    }

    const finalQuiz = hasQuizPayload ? quiz : null

    // Preserve level for legacy F1–F3 articles; admin UI restricts new picks to 4–7.
    const incomingLevel = typeof level === "number" ? level : existing.level
    const nextStatus =
      status === "draft"
        ? "draft"
        : status === "published"
        ? "published"
        : existing.status || "published"

    const row = articleToRow(article, {
      isChallenge,
      isFree,
      articleType,
      isDseCore,
      level: incomingLevel,
      status: nextStatus,
      expectedMinutes,
      exerciseTemplate,
      ...(hasQuizPayload ? { quizJson: finalQuiz } : {}),
    })

    const { error: updateErr } = await supabase
      .from("articles")
      .update({ ...row, updated_at: nowIso() })
      .eq("id", id)
    if (updateErr) throw new Error(updateErr.message)

    if (hasQuizPayload) await upsertQuestions(id, finalQuiz)
    await createVersionSnapshot(id, { article, quiz: finalQuiz })

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete("/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { data, error } = await supabase
      .from("articles")
      .delete()
      .eq("id", id)
      .select("id")
    if (error) return res.status(500).json({ error: error.message })
    if (!data || data.length === 0) return res.status(404).json({ error: "Exercise not found" })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch("/:id/dse-core", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { is_dse_core } = req.body || {}
    if (typeof is_dse_core !== "boolean")
      return res.status(400).json({ error: "is_dse_core must be boolean" })
    const { error } = await supabase
      .from("articles")
      .update({ is_dse_core, updated_at: nowIso() })
      .eq("id", id)
    if (error) throw new Error(error.message)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
