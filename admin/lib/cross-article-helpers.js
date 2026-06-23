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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    relatedArticles: relatedArticles.map(a => ({
      id: a.article_id || a.id,
      title: a.title || a.article_id || a.id,
    })),
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

module.exports = {
  crossArticleQuestionToRow,
  rowToCrossArticleQuestion,
  upsertCrossArticleQuestion,
  deleteCrossArticleQuestion,
  getCrossArticleQuestion,
  listCrossArticleQuestions,
}
