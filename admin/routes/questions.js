const express = require("express")
const { supabase, requireSupabase } = require("../lib/supabase")
const { nowIso, rebuildQuizJson } = require("../lib/article-helpers")
const { QuestionUpsertSchema, formatZodErrors } = require("../lib/schemas")

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

module.exports = router
