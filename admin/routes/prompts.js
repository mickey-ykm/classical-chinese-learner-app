const express = require("express")
const { nowIso } = require("../lib/article-helpers")
const {
  readQuizPromptsAsync,
  writeQuizPromptsAsync,
  deleteQuizPromptAsync,
  slugifyPromptId,
  validatePromptPayload,
} = require("../lib/quiz-prompts")

const router = express.Router()

router.get("/", async (_req, res) => {
  try {
    res.json(await readQuizPromptsAsync())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post("/", async (req, res) => {
  try {
    const { name, description, promptTemplate, defaultModel } = req.body || {}
    const errs = validatePromptPayload({ name, promptTemplate })
    if (errs.length) return res.status(400).json({ errors: errs })

    const prompts = await readQuizPromptsAsync()
    let id = slugifyPromptId(name)
    let n = 2
    while (prompts.find((p) => p.id === id)) id = slugifyPromptId(name) + "-" + n++

    const ts = nowIso()
    const next = {
      id,
      name: name.trim(),
      description: (description || "").trim(),
      promptTemplate,
      defaultModel: defaultModel || null,
      createdAt: ts,
      updatedAt: ts,
    }
    prompts.push(next)
    await writeQuizPromptsAsync(prompts)
    res.json({ success: true, prompt: next })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, promptTemplate, defaultModel } = req.body || {}
    const errs = validatePromptPayload({ name, promptTemplate })
    if (errs.length) return res.status(400).json({ errors: errs })

    const prompts = await readQuizPromptsAsync()
    const idx = prompts.findIndex((p) => p.id === id)
    if (idx === -1) return res.status(404).json({ error: "Prompt not found" })

    prompts[idx] = {
      ...prompts[idx],
      name: name.trim(),
      description: (description || "").trim(),
      promptTemplate,
      defaultModel: defaultModel || prompts[idx].defaultModel || null,
      updatedAt: nowIso(),
    }
    await writeQuizPromptsAsync(prompts)
    res.json({ success: true, prompt: prompts[idx] })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const prompts = await readQuizPromptsAsync()
    if (prompts.length <= 1)
      return res.status(400).json({ error: "Cannot delete the last quiz prompt" })
    const next = prompts.filter((p) => p.id !== id)
    if (next.length === prompts.length) return res.status(404).json({ error: "Prompt not found" })
    await deleteQuizPromptAsync(id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
