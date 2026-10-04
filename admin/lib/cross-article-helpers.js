const { supabase } = require("./supabase")

function nowIso() {
  return new Date().toISOString()
}

/**
 * Convert frontend cross-article question payload to Supabase row format
 */
function crossArticleQuestionToRow(question) {
  const row = {
    question_text: question.questionText,
    format: question.format,
    part: question.part,
    correct_answer: question.correctAnswer,
    explanation: question.explanation || null,
    status: question.status || 'draft',
    updated_at: nowIso(),
  }

  // Format-specific fields
  if (question.format === 'mc') {
    // Convert options array to JSONB object {A: "text", B: "text", ...}
    const optionsObj = {}
    if (Array.isArray(question.options)) {
      question.options.forEach((opt, idx) => {
        const key = String.fromCharCode(65 + idx) // A, B, C, D...
        optionsObj[key] = typeof opt === 'string' ? opt : opt.text || opt
      })
    }
    row.options = optionsObj
    row.select_count = question.selectCount || 1

    // Auto-calculate points based on number of correct answers
    // For multi-select: points = number of correct answers (each correct answer = 1 mark)
    // For single-select: points = 1
    const correctAnswers = question.correctAnswer.split(',').map(a => a.trim()).filter(a => a)
    row.points = correctAnswers.length
  }

  if (question.format === 'sentence-order') {
    row.sequence_tokens = question.sequenceTokens || []
  }

  // Pedagogical labels
  if (Array.isArray(question.questionTypes)) {
    row.question_types = question.questionTypes
  }

  return row
}

/**
 * Convert Supabase row to frontend format with related articles
 */
function rowToCrossArticleQuestion(row, relatedArticles = []) {
  const question = {
    id: row.id,
    questionText: row.question_text,
    format: row.format,
    part: row.part,
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    status: row.status,
    points: row.points || 1,  // Default to 1 if not set
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    relatedArticles: relatedArticles.map(a => ({
      id: a.article_id || a.id,
      title: a.title || a.article_id || a.id,
    })),
  }

  // Debug: log first conversion to verify points are being read
  if (!rowToCrossArticleQuestion._logged) {
    console.log("Sample row conversion:", { id: row.id, row_points: row.points, question_points: question.points })
    rowToCrossArticleQuestion._logged = true
  }

  // Format-specific fields
  if (row.format === 'mc' && row.options) {
    // Convert JSONB {A: "text", B: "text"} back to array ["text", "text"]
    const keys = Object.keys(row.options).sort()
    question.options = keys.map(k => row.options[k])
    question.selectCount = row.select_count || 1
  }

  if (row.format === 'sentence-order') {
    question.sequenceTokens = row.sequence_tokens || []
  }

  if (row.question_types) {
    question.questionTypes = row.question_types
  }

  return question
}

/**
 * Insert or update a cross-article question with related articles
 */
async function upsertCrossArticleQuestion(questionData) {
  const { relatedArticleIds, id, ...questionFields } = questionData
  const row = crossArticleQuestionToRow(questionFields)

  let questionId = id

  if (questionId) {
    // Update existing question
    const { error: updateErr } = await supabase
      .from("cross_article_questions")
      .update(row)
      .eq("id", questionId)

    if (updateErr) {
      throw new Error("Failed to update cross-article question: " + updateErr.message)
    }
  } else {
    // Insert new question
    const { data, error: insertErr } = await supabase
      .from("cross_article_questions")
      .insert(row)
      .select("id")
      .single()

    if (insertErr) {
      throw new Error("Failed to insert cross-article question: " + insertErr.message)
    }

    questionId = data.id
  }

  // Update related articles (delete old, insert new)
  await supabase
    .from("cross_article_question_articles")
    .delete()
    .eq("question_id", questionId)

  if (Array.isArray(relatedArticleIds) && relatedArticleIds.length > 0) {
    const articleLinks = relatedArticleIds.map(articleId => ({
      question_id: questionId,
      article_id: articleId,
    }))

    const { error: linkErr } = await supabase
      .from("cross_article_question_articles")
      .insert(articleLinks)

    if (linkErr) {
      throw new Error("Failed to link related articles: " + linkErr.message)
    }
  }

  return questionId
}

/**
 * Delete a cross-article question (cascade deletes related articles via FK)
 */
async function deleteCrossArticleQuestion(id) {
  const { error } = await supabase
    .from("cross_article_questions")
    .delete()
    .eq("id", id)

  if (error) {
    throw new Error("Failed to delete cross-article question: " + error.message)
  }
}

/**
 * Fetch a single cross-article question with its related articles
 */
async function getCrossArticleQuestion(id) {
  const [questionResult, articlesResult] = await Promise.all([
    supabase
      .from("cross_article_questions")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("cross_article_question_articles")
      .select("article_id")
      .eq("question_id", id),
  ])

  if (questionResult.error) {
    throw new Error("Failed to fetch question: " + questionResult.error.message)
  }

  // Fetch article titles for display
  const articleIds = (articlesResult.data || []).map(a => a.article_id)
  let articleDetails = []

  if (articleIds.length > 0) {
    const { data: articles, error: articlesErr } = await supabase
      .from("articles")
      .select("id, title")
      .in("id", articleIds)

    if (!articlesErr && articles) {
      articleDetails = articles
    }
  }

  return rowToCrossArticleQuestion(questionResult.data, articleDetails)
}

/**
 * List all cross-article questions with filters
 */
async function listCrossArticleQuestions(filters = {}) {
  let query = supabase
    .from("cross_article_questions")
    .select("*")
    .order("created_at", { ascending: false })

  if (filters.status) {
    query = query.eq("status", filters.status)
  }

  if (filters.part) {
    query = query.eq("part", filters.part)
  }

  const { data, error } = await query

  if (error) {
    throw new Error("Failed to list questions: " + error.message)
  }

  // Fetch related article counts for each question
  const questionIds = data.map(q => q.id)
  let relatedCounts = {}

  if (questionIds.length > 0) {
    const { data: links } = await supabase
      .from("cross_article_question_articles")
      .select("question_id")
      .in("question_id", questionIds)

    if (links) {
      relatedCounts = links.reduce((acc, link) => {
        acc[link.question_id] = (acc[link.question_id] || 0) + 1
        return acc
      }, {})
    }
  }

  return data.map(row => ({
    ...rowToCrossArticleQuestion(row, []),
    relatedArticleCount: relatedCounts[row.id] || 0,
  }))
}

const VALID_FORMATS = ["mc", "fill-blank", "sentence-order"]
const VALID_QUESTION_TYPES = ["字詞解釋", "語句背誦", "語句翻譯", "修辭手法", "內容重點"]
const MAX_IMPORT_BATCH = 200

function dupKey(text, part) {
  return `${part}::${String(text).trim()}`
}

/**
 * Validate and normalise one raw imported question.
 * Returns { errors: string[], question } where question is shaped for upsertCrossArticleQuestion.
 */
function normalizeImportQuestion(raw) {
  const errors = []
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { errors: ["must be an object"], question: null }
  }

  const questionText = String(raw.questionText ?? raw.question_text ?? "").trim()
  if (!questionText) errors.push("questionText is required")

  const part = Number(raw.part)
  if (![7, 8].includes(part)) errors.push("part must be 7 or 8")

  const format = raw.format ?? "mc"
  if (!VALID_FORMATS.includes(format)) errors.push(`format must be one of ${VALID_FORMATS.join(", ")}`)

  const explanation = raw.explanation == null ? "" : String(raw.explanation).trim()

  let relatedArticleIds = raw.relatedArticleIds ?? raw.related_article_ids
  if (typeof relatedArticleIds === "string") relatedArticleIds = [relatedArticleIds]
  if (!Array.isArray(relatedArticleIds) || relatedArticleIds.length === 0) {
    errors.push("relatedArticleIds must be a non-empty array of article IDs")
    relatedArticleIds = []
  } else {
    relatedArticleIds = [...new Set(relatedArticleIds.map(x => String(x).trim()).filter(Boolean))]
    if (relatedArticleIds.length === 0) errors.push("relatedArticleIds must be a non-empty array of article IDs")
  }

  let questionTypes
  const rawTypes = raw.questionTypes ?? raw.question_types
  if (rawTypes != null) {
    if (!Array.isArray(rawTypes)) {
      errors.push("questionTypes must be an array")
    } else {
      const bad = rawTypes.filter(t => !VALID_QUESTION_TYPES.includes(t))
      if (bad.length) errors.push(`invalid questionTypes: ${bad.join(", ")} (allowed: ${VALID_QUESTION_TYPES.join(", ")})`)
      else if (rawTypes.length) questionTypes = rawTypes
    }
  }

  let correctAnswer = raw.correctAnswer ?? raw.correct_answer
  if (Array.isArray(correctAnswer)) correctAnswer = correctAnswer.join(",")
  correctAnswer = correctAnswer == null ? "" : String(correctAnswer).trim()
  if (!correctAnswer) errors.push("correctAnswer is required")

  const question = {
    questionText,
    format,
    part,
    explanation,
    status: "draft",
    relatedArticleIds,
  }
  if (questionTypes) question.questionTypes = questionTypes

  if (format === "mc") {
    let opts = raw.options
    let optionTexts = []
    if (Array.isArray(opts)) {
      optionTexts = opts.map(o => (typeof o === "string" ? o : o && o.text != null ? o.text : ""))
      // [{key,text}] must be in A, B, C... order, since keys are re-derived from position
      if (opts.some(o => o && typeof o === "object" && o.key)) {
        opts.forEach((o, i) => {
          if (o && o.key && String(o.key).toUpperCase() !== String.fromCharCode(65 + i)) {
            errors.push(`option keys must run A, B, C... in order (got "${o.key}" at position ${i + 1})`)
          }
        })
      }
    } else if (opts && typeof opts === "object") {
      const keys = Object.keys(opts).sort()
      keys.forEach((k, i) => {
        if (k !== String.fromCharCode(65 + i)) errors.push(`option keys must be A, B, C... without gaps (got "${k}")`)
      })
      optionTexts = keys.map(k => opts[k])
    }
    optionTexts = optionTexts.map(t => String(t ?? "").trim())
    if (optionTexts.length < 2) errors.push("MC questions need at least 2 options")
    if (optionTexts.some(t => !t)) errors.push("MC options must not be empty")
    question.options = optionTexts

    const answers = correctAnswer.split(",").map(a => a.trim().toUpperCase()).filter(Boolean)
    const validKeys = optionTexts.map((_, i) => String.fromCharCode(65 + i))
    const badKeys = answers.filter(a => !validKeys.includes(a))
    if (answers.length && badKeys.length) errors.push(`correctAnswer references missing option(s): ${badKeys.join(", ")}`)
    if (new Set(answers).size !== answers.length) errors.push("correctAnswer has duplicate keys")
    question.correctAnswer = answers.join(",")

    const selectCount = raw.selectCount ?? raw.select_count
    if (selectCount != null && Number(selectCount) !== answers.length) {
      errors.push(`selectCount (${selectCount}) must equal the number of correct answers (${answers.length})`)
    }
    question.selectCount = answers.length || 1
  } else {
    question.correctAnswer = correctAnswer
  }

  if (format === "sentence-order") {
    const tokens = raw.sequenceTokens ?? raw.sequence_tokens
    if (!Array.isArray(tokens) || tokens.length < 2 || tokens.some(t => typeof t !== "string" || !t.trim())) {
      errors.push("sentence-order needs sequenceTokens: an array of at least 2 non-empty strings")
    } else {
      question.sequenceTokens = tokens.map(t => t.trim())
      const seq = correctAnswer.includes(",") ? correctAnswer.split(",") : correctAnswer.split(">")
      const sortedSeq = seq.map(t => t.trim()).sort()
      const sortedTokens = [...question.sequenceTokens].sort()
      if (correctAnswer && JSON.stringify(sortedSeq) !== JSON.stringify(sortedTokens)) {
        errors.push("correctAnswer must contain exactly the sequenceTokens in the correct order (joined by \">\" or \",\")")
      }
    }
  }

  return { errors, question }
}

/**
 * Validate a batch and (unless dryRun) insert it as drafts, all-or-nothing.
 * Returns { ok, status, body } so the route can send it unchanged.
 */
async function importCrossArticleQuestions(rawQuestions, { dryRun = false, allowDuplicates = false } = {}) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return { status: 400, body: { error: "questions must be a non-empty array" } }
  }
  if (rawQuestions.length > MAX_IMPORT_BATCH) {
    return { status: 400, body: { error: `Too many questions (max ${MAX_IMPORT_BATCH} per batch)` } }
  }

  const rowErrors = []
  const questions = []
  rawQuestions.forEach((raw, index) => {
    const { errors, question } = normalizeImportQuestion(raw)
    if (errors.length) rowErrors.push({ index, errors })
    questions.push(question)
  })

  // Every referenced article must exist
  const articleIds = [...new Set(questions.flatMap(q => (q ? q.relatedArticleIds : [])))]
  if (articleIds.length > 0) {
    const { data: found, error } = await supabase.from("articles").select("id").in("id", articleIds)
    if (error) throw new Error("Failed to check articles: " + error.message)
    const known = new Set((found || []).map(a => a.id))
    questions.forEach((q, index) => {
      if (!q) return
      const missing = q.relatedArticleIds.filter(id => !known.has(id))
      if (missing.length) {
        let entry = rowErrors.find(e => e.index === index)
        if (!entry) { entry = { index, errors: [] }; rowErrors.push(entry) }
        entry.errors.push(`unknown article ID(s): ${missing.join(", ")}`)
      }
    })
  }

  if (rowErrors.length) {
    rowErrors.sort((a, b) => a.index - b.index)
    return {
      status: 400,
      body: { error: `${rowErrors.length} question(s) failed validation. Nothing was imported.`, errors: rowErrors },
    }
  }

  // Duplicate detection: same part + question text, in the database or earlier in this batch
  const duplicates = []
  const seen = new Map()
  const { data: existing, error: existErr } = await supabase
    .from("cross_article_questions")
    .select("id, part, question_text")
    .in("question_text", [...new Set(questions.map(q => q.questionText))])
  if (existErr) throw new Error("Failed to check duplicates: " + existErr.message)
  const existingByKey = new Map((existing || []).map(r => [dupKey(r.question_text, r.part), r.id]))

  questions.forEach((q, index) => {
    const key = dupKey(q.questionText, q.part)
    if (existingByKey.has(key)) {
      duplicates.push({ index, questionText: q.questionText, part: q.part, existingId: existingByKey.get(key) })
    } else if (seen.has(key)) {
      duplicates.push({ index, questionText: q.questionText, part: q.part, duplicateOfIndex: seen.get(key) })
    }
    if (!seen.has(key)) seen.set(key, index)
  })

  if (dryRun) {
    return { status: 200, body: { valid: true, count: questions.length, duplicates } }
  }
  if (duplicates.length > 0 && !allowDuplicates) {
    return {
      status: 409,
      body: { error: `${duplicates.length} duplicate question(s) detected`, duplicates },
    }
  }

  // Atomic insert of all question rows in one statement
  const rows = questions.map(q => crossArticleQuestionToRow(q))
  const { data: inserted, error: insErr } = await supabase
    .from("cross_article_questions")
    .insert(rows)
    .select("id")
  if (insErr) throw new Error("Failed to insert questions: " + insErr.message)
  const ids = inserted.map(r => r.id)

  const links = questions.flatMap((q, i) =>
    q.relatedArticleIds.map(articleId => ({ question_id: ids[i], article_id: articleId }))
  )
  const { error: linkErr } = await supabase.from("cross_article_question_articles").insert(links)
  if (linkErr) {
    // Roll back so the import stays all-or-nothing
    await supabase.from("cross_article_questions").delete().in("id", ids)
    throw new Error("Failed to link related articles (import rolled back): " + linkErr.message)
  }

  return { status: 200, body: { success: true, imported: ids.length, ids, duplicates } }
}

module.exports = {
  normalizeImportQuestion,
  importCrossArticleQuestions,
  crossArticleQuestionToRow,
  rowToCrossArticleQuestion,
  upsertCrossArticleQuestion,
  deleteCrossArticleQuestion,
  getCrossArticleQuestion,
  listCrossArticleQuestions,
}
