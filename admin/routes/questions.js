const express = require("express")
const { supabase, requireSupabase } = require("../lib/supabase")
const { nowIso, rebuildQuizJson } = require("../lib/article-helpers")
const { QuestionUpsertSchema, formatZodErrors, VALID_QUESTION_TYPES } = require("../lib/schemas")

const router = express.Router()

router.get("/", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { articleId } = req.query
    if (!articleId) return res.status(400).json({ error: "articleId query param required" })
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("article_id", articleId)
      .order("part", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true })
    if (error) throw new Error(error.message)
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post("/bulk-delete", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { ids } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids[] required" })
    const { data: rows, error: fetchErr } = await supabase
      .from("questions")
      .select("id, article_id")
      .in("id", ids)
    if (fetchErr) throw new Error(fetchErr.message)
    const articleIds = [...new Set((rows || []).map((r) => r.article_id))]
    const { error } = await supabase.from("questions").delete().in("id", ids)
    if (error) throw new Error(error.message)
    await Promise.all(articleIds.map(rebuildQuizJson))
    res.json({ success: true, deleted: ids.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post("/bulk-publish", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { ids } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids[] required" })

    // Fetch the questions to get their article_ids and filter to drafts only
    const { data: questions, error: fetchErr } = await supabase
      .from("questions")
      .select("id, article_id, status")
      .in("id", ids)
    if (fetchErr) throw new Error(fetchErr.message)

    // Filter to only draft questions
    const draftIds = (questions || []).filter(q => q.status === "draft").map(q => q.id)

    if (draftIds.length === 0) {
      return res.json({ success: true, published: 0, message: "No draft questions to publish" })
    }

    // Update all to published
    const { error: updateErr } = await supabase
      .from("questions")
      .update({ status: "published", updated_at: nowIso() })
      .in("id", draftIds)
    if (updateErr) throw new Error(updateErr.message)

    // Get unique article IDs and rebuild each
    const articleIds = [...new Set(questions.map(q => q.article_id))]
    await Promise.all(articleIds.map(rebuildQuizJson))

    res.json({ success: true, published: draftIds.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post("/", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const parsed = QuestionUpsertSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ errors: formatZodErrors(parsed.error) })
    const { data, error } = await supabase
      .from("questions")
      .insert({ ...parsed.data, created_at: nowIso(), updated_at: nowIso() })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    // If creating a published question, rebuild quiz_json
    if (parsed.data.status === "published") await rebuildQuizJson(parsed.data.article_id)
    res.json({ success: true, id: data.id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put("/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const parsed = QuestionUpsertSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ errors: formatZodErrors(parsed.error) })
    const { error } = await supabase
      .from("questions")
      .update({ ...parsed.data, updated_at: nowIso() })
      .eq("id", id)
    if (error) throw new Error(error.message)
    if (parsed.data.status === "published") await rebuildQuizJson(parsed.data.article_id)
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
      .from("questions")
      .delete()
      .eq("id", id)
      .select("id, article_id")
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return res.status(404).json({ error: "Question not found" })
    await rebuildQuizJson(data[0].article_id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch("/:id/publish", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    const { data, error } = await supabase
      .from("questions")
      .update({ status: "published" })
      .eq("id", id)
      .select("id, article_id")
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return res.status(404).json({ error: "Question not found" })
    await rebuildQuizJson(data[0].article_id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})



// POST /api/questions/import — replace draft questions for an article with imported quiz JSON
router.post("/import", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { articleId, quizJson } = req.body || {}
    if (!articleId) return res.status(400).json({ error: "articleId required" })
    if (!quizJson || typeof quizJson !== "object") return res.status(400).json({ error: "quizJson must be an object" })

    // Normalise flat array → quiz parts shape
    let quiz = quizJson
    if (Array.isArray(quizJson)) {
      quiz = { parts: [{ part: 1, title: "第一部分", pointsPerQuestion: 1, questions: quizJson }] }
    }
    if (!Array.isArray(quiz.parts) || quiz.parts.length === 0) {
      return res.status(400).json({ error: "quizJson must have a parts[] array or be a flat questions array" })
    }

    // Delete only draft questions — published ones stay untouched
    const { error: delError } = await supabase
      .from("questions")
      .delete()
      .eq("article_id", articleId)
      .eq("status", "draft")
    if (delError) throw new Error("Failed to clear drafts: " + delError.message)

    // Insert new questions as drafts
    const rows = []
    for (const part of quiz.parts) {
      for (const q of part.questions ?? []) {
        const optMap = {}
        for (const o of q.options ?? []) {
          if (o.key && o.text != null) optMap[o.key] = o.text
        }
        if (!Array.isArray(q.options) && q.options && typeof q.options === "object") {
          Object.assign(optMap, q.options)
        }
        // Filter question_types to only valid values
        let questionTypes = q.questionTypes ?? q.question_types ?? []
        if (Array.isArray(questionTypes)) {
          questionTypes = questionTypes.filter(t => VALID_QUESTION_TYPES.includes(t))
        } else {
          questionTypes = []
        }
        rows.push({
          article_id: articleId,
          type: q.type || "mc-single",
          format: q.format || "mc",
          part: q.part ?? part.part ?? 1,
          points: q.points ?? part.pointsPerQuestion ?? 1,
          stem: q.stem,
          options: Object.keys(optMap).length ? optMap : null,
          correct_answer: q.correctAnswer || q.correct_answer || "",
          explanation: q.explanation || null,
          select_count: q.selectCount ?? q.select_count ?? 1,
          sequence_tokens: q.sequenceTokens ?? q.sequence_tokens ?? null,
          question_types: questionTypes.length > 0 ? questionTypes : null,
          status: "draft",
        })
      }
    }

    if (rows.length === 0) return res.status(400).json({ error: "No questions found in quizJson" })

    const { error: insError } = await supabase.from("questions").insert(rows)
    if (insError) throw new Error("Failed to insert questions: " + insError.message)

    res.json({ imported: rows.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
