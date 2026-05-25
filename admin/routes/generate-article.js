const express = require("express")
const { callOpenRouter, normalizeOptions } = require("../lib/openrouter")
const { generateRuns } = require("../lib/generate-runs")

function segmentText(text) {
  const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (lines.length > 1) return lines.map((t) => ({ text: t }))
  const segs = []
  let current = ""
  for (const char of text) {
    current += char
    if ("。！？；".includes(char)) {
      if (current.trim()) segs.push({ text: current.trim() })
      current = ""
    }
  }
  if (current.trim()) segs.push({ text: current.trim() })
  return segs.length ? segs : [{ text: text.trim() }]
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function segmentTextWithFootnotes(text, footnotes) {
  if (!footnotes.length) return segmentText(text)

  const hasEmbeddedMarkers = footnotes.some((f) => text.includes(f.marker))
  if (hasEmbeddedMarkers) {
    const sorted = [...footnotes].sort((a, b) => b.marker.length - a.marker.length)
    const pattern = new RegExp(sorted.map((f) => escapeRegex(f.marker)).join("|"), "g")
    const segments = []
    let lastIndex = 0
    let m
    while ((m = pattern.exec(text)) !== null) {
      if (m.index > lastIndex) {
        text.slice(lastIndex, m.index).split(/\n+/).forEach((line) => {
          if (line.trim()) segments.push({ text: line.trim() })
        })
      }
      const fn = footnotes.find((f) => f.marker === m[0])
      if (fn) segments.push({ text: m[0], footnoteId: fn.id })
      lastIndex = pattern.lastIndex
    }
    if (lastIndex < text.length) {
      text.slice(lastIndex).split(/\n+/).forEach((line) => {
        if (line.trim()) segments.push({ text: line.trim() })
      })
    }
    return segments.length ? segments : [{ text: text.trim() }]
  }

  const footnoteById = Object.fromEntries(footnotes.map((f) => [f.id, f]))
  const sortedIds = footnotes.map((f) => f.id).sort((a, b) => b.length - a.length)
  const numeralRe = new RegExp(`(?<!\\d)(${sortedIds.map(escapeRegex).join("|")})(?!\\d)`, "g")
  if (numeralRe.test(text)) {
    numeralRe.lastIndex = 0
    const segments = []
    let lastIndex = 0
    let m
    while ((m = numeralRe.exec(text)) !== null) {
      const fn = footnoteById[m[1]]
      if (!fn) continue
      if (m.index > lastIndex) {
        text.slice(lastIndex, m.index).split(/\n+/).forEach((line) => {
          if (line.trim()) segments.push({ text: line.trim() })
        })
      }
      segments.push({ text: fn.marker, footnoteId: fn.id })
      lastIndex = m.index + m[1].length
    }
    if (lastIndex < text.length) {
      text.slice(lastIndex).split(/\n+/).forEach((line) => {
        if (line.trim()) segments.push({ text: line.trim() })
      })
    }
    return segments.length ? segments : segmentText(text)
  }

  const insertions = []
  for (const fn of footnotes) {
    const idx = text.indexOf(fn.term)
    if (idx !== -1) insertions.push({ pos: idx + fn.term.length, fn })
  }
  insertions.sort((a, b) => a.pos - b.pos)
  if (!insertions.length) return segmentText(text)

  const segments = []
  let pos = 0
  for (const { pos: insertPos, fn } of insertions) {
    if (insertPos <= pos) continue
    const chunk = text.slice(pos, insertPos)
    if (chunk.trim()) {
      chunk.split(/\n+/).forEach((line) => { if (line.trim()) segments.push({ text: line.trim() }) })
    }
    segments.push({ text: fn.marker, footnoteId: fn.id })
    pos = insertPos
  }
  if (pos < text.length) {
    text.slice(pos).split(/\n+/).forEach((line) => {
      if (line.trim()) segments.push({ text: line.trim() })
    })
  }
  return segments.length ? segments : segmentText(text)
}

function parseFootnotesText(raw) {
  if (!raw || !raw.trim()) return []
  raw = raw.replace(/○([一-鿿])/g, "[$1]")
  raw = raw.replace(/\s+(?=\d+[.。]\s)/g, "\n")
  const footnotes = []
  let idNum = 1
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const withMarker = line.match(
      /^([①-⑳]|[（(]\d+[)）]|\[\d+\]|\d+[.。、）)\s])\s*([^：:︓︰]+)[：:︓︰]\s*(.+)$/
    )
    if (withMarker) {
      footnotes.push({
        id: String(idNum),
        marker: `(${idNum})`,
        term: withMarker[2].trim(),
        explanation: withMarker[3].trim(),
      })
      idNum++
      continue
    }
    const noMarker = line.match(/^([^：:︓︰]+)[：:︓︰]\s*(.+)$/)
    if (noMarker) {
      footnotes.push({
        id: String(idNum),
        marker: `(${idNum})`,
        term: noMarker[1].trim(),
        explanation: noMarker[2].trim(),
      })
      idNum++
      continue
    }
    if (footnotes.length) {
      footnotes[footnotes.length - 1].explanation += line
    }
  }
  return footnotes
}

const router = express.Router()

router.post("/", (req, res) => {
  const {
    title, source, text, footnotesText, model, translationPrompt,
    quizPrompt, apiKey, skipQuiz,
  } = req.body || {}
  if (!apiKey) return res.status(400).json({ error: "apiKey is required" })
  if (!title) return res.status(400).json({ error: "title is required" })
  if (!text) return res.status(400).json({ error: "text is required" })
  if (!model) return res.status(400).json({ error: "model is required" })
  if (!skipQuiz && !quizPrompt)
    return res.status(400).json({ error: "quizPrompt is required (or pass skipQuiz: true)" })

  const runId = "gen_" + Date.now().toString()
  const total = skipQuiz ? 1 : 2
  generateRuns[runId] = {
    status: "running", step: "", done: 0, total,
    articleJson: null, quizJson: null, skipQuiz: !!skipQuiz, error: null,
  }
  res.json({ runId })

  ;(async () => {
    try {
      let parsedFootnotes = parseFootnotesText(footnotesText || "")

      if (!parsedFootnotes.length) {
        const found = [
          ...new Set(
            [...(title + " " + text).matchAll(/(?<!\d)(\d+)(?!\d)/g)].map((m) => m[1])
          ),
        ].sort((a, b) => Number(a) - Number(b))
        if (found.length) {
          parsedFootnotes = found.map((n) => ({ id: n, marker: `(${n})`, term: "", explanation: "" }))
        }
      }
      const fnLines = parsedFootnotes.length
        ? parsedFootnotes.map((f) => `${f.marker} ${f.term}：${f.explanation}`).join("\n")
        : "（無注釋）"
      const context = `標題：${title}\n來源：${source || "—"}\n\n原文：\n${text}\n\n注釋：\n${fnLines}`

      generateRuns[runId].step = "生成現代文翻譯…"
      const tRes = await callOpenRouter(
        model,
        [
          { role: "system", content: translationPrompt },
          {
            role: "user",
            content: `請翻譯以下文言文。在 JSON 回覆中額外加入 "suggestedId" 欄位，值為標題的漢語拼音（全小寫、以連字號分隔，例如 "chun-ye-xi-yu"）。\n\n${context}`,
          },
        ],
        apiKey
      )
      const tParsed = JSON.parse(tRes.content)
      if (!Array.isArray(tParsed.modernTranslation))
        throw new Error("Translation response missing modernTranslation[]")
      const articleId =
        typeof tParsed.suggestedId === "string" && /^[a-z0-9-]+$/.test(tParsed.suggestedId)
          ? tParsed.suggestedId
          : "art-" + Date.now().toString(36)
      generateRuns[runId].done++

      let parts = []
      if (!skipQuiz) {
        generateRuns[runId].step = "生成測驗題目…"
        const qRes = await callOpenRouter(
          model,
          [
            { role: "system", content: quizPrompt },
            { role: "user", content: `請為以下文言文出題：\n\n${context}` },
          ],
          apiKey
        )
        const qParsed = JSON.parse(qRes.content)
        if (!Array.isArray(qParsed.parts)) throw new Error("Quiz response missing parts[]")
        generateRuns[runId].done++

        parts = qParsed.parts.map((p) => ({
          ...p,
          questions: (p.questions || []).map((q) => ({
            ...q,
            options: normalizeOptions(q.options),
          })),
        }))
      }

      const titleNumeral = title.match(/(\d+)$/)
      const cleanTitle = titleNumeral ? title.slice(0, -titleNumeral[1].length).trim() : title.trim()
      const articleJson = {
        id: articleId,
        title: cleanTitle,
        ...(titleNumeral ? { titleFootnoteId: titleNumeral[1] } : {}),
        source: source || "",
        segments: segmentTextWithFootnotes(text, parsedFootnotes),
        footnotes: parsedFootnotes,
        modernTranslation: tParsed.modernTranslation,
      }
      const totalPoints = parts.reduce(
        (s, p) => s + (p.questions?.length || 0) * (p.pointsPerQuestion || 1),
        0
      )
      const quizJson = skipQuiz ? null : { articleId, totalPoints, parts }

      generateRuns[runId].articleJson = articleJson
      generateRuns[runId].quizJson = quizJson
      generateRuns[runId].step = ""
      generateRuns[runId].status = "done"
    } catch (e) {
      generateRuns[runId].status = "error"
      generateRuns[runId].error = e.message
    }
  })()
})

router.get("/status/:runId", (req, res) => {
  const run = generateRuns[req.params.runId]
  if (!run) return res.status(404).json({ error: "Run not found" })
  res.json({
    status: run.status,
    step: run.step,
    done: run.done,
    total: run.total,
    articleJson: run.articleJson,
    quizJson: run.quizJson,
    error: run.error,
  })
})

module.exports = router
