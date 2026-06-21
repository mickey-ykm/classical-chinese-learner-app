const { supabase } = require("./supabase")

function nowIso() {
  return new Date().toISOString()
}

function quizHasQuestions(quiz) {
  if (!quiz || !Array.isArray(quiz.parts) || !quiz.parts.length) return false
  return quiz.parts.some((p) => Array.isArray(p.questions) && p.questions.length > 0)
}

function countQuestions(quiz) {
  if (!quiz || !Array.isArray(quiz.parts)) return 0
  return quiz.parts.reduce((s, p) => s + (p.questions?.length || 0), 0)
}

// Maps camelCase article + meta fields to Supabase snake_case row.
function articleToRow(article, meta) {
  const level =
    typeof meta.level === "number" && meta.level >= 1 && meta.level <= 7 ? meta.level : null
  const row = {
    id: article.id,
    title: article.title,
    title_footnote_id: article.titleFootnoteId || null,
    source: article.source || "",
    segments: article.segments,
    footnotes: article.footnotes,
    modern_translation: article.modernTranslation,
    level,
    is_challenge: meta.isChallenge || false,
    is_free: meta.isFree || false,
    article_type: meta.articleType || "other",
    is_dse_core: meta.articleType === 'dse-exam',
    status: meta.status === "draft" ? "draft" : "published",
    expected_minutes:
      typeof meta.expectedMinutes === "number" && meta.expectedMinutes > 0
        ? meta.expectedMinutes
        : null,
    exercise_template: Array.isArray(meta.exerciseTemplate) ? meta.exerciseTemplate : null,
    updated_at: nowIso(),
  }
  if (meta.quizJson !== undefined) row.quiz_json = meta.quizJson || null
  return row
}

// Converts a Supabase article row back to the API response shape the HTML expects.
function rowToExercise(row) {
  return {
    article: {
      id: row.id,
      title: row.title,
      ...(row.title_footnote_id ? { titleFootnoteId: row.title_footnote_id } : {}),
      source: row.source || "",
      segments: row.segments,
      footnotes: row.footnotes,
      modernTranslation: row.modern_translation,
    },
    quiz: row.quiz_json || null,
    isChallenge: row.is_challenge || false,
    isFree: row.is_free || false,
    isDseCore: row.is_dse_core || false,
    articleType: row.article_type || "other",
    level: row.level ?? null,
    status: row.status || "published",
    hasQuizzes: quizHasQuestions(row.quiz_json),
    expectedMinutes: row.expected_minutes ?? null,
    exerciseTemplate: row.exercise_template ?? null,
    createdAt: row.created_at || null,
  }
}

function rowToIndexEntry(row) {
  const entry = {
    id: row.id,
    title: row.title,
    source: row.source || "",
    totalPoints: row.quiz_json?.totalPoints || 0,
    totalQuestions: countQuestions(row.quiz_json),
    createdAt: row.created_at,
    status: row.status,
    hasQuizzes: quizHasQuestions(row.quiz_json),
    articleType: row.article_type || "other",
    isFree: row.is_free || false,
    isDseCore: row.is_dse_core || false,
  }
  if (row.is_challenge) entry.type = "challenge"
  if (row.level != null) entry.level = row.level
  if (row.expected_minutes != null) entry.expectedMinutes = row.expected_minutes
  if (row.exercise_template != null) entry.exerciseTemplate = row.exercise_template
  return entry
}

async function upsertQuestions(articleId, quiz) {
  // Clear all questions for this article, then re-insert from quiz JSON.
  await supabase.from("questions").delete().eq("article_id", articleId)
  if (!quiz || !Array.isArray(quiz.parts)) return
  const rows = []
  for (const part of quiz.parts) {
    for (const q of part.questions ?? []) {
      const optMap = {}
      for (const o of q.options ?? []) optMap[o.key] = o.text
      rows.push({
        article_id: articleId,
        type: "comprehension", // Phase 7 will add proper type tagging
        format: "mc",
        part: part.part,
        points: q.points ?? part.pointsPerQuestion ?? 1,
        stem: q.stem,
        options: optMap,
        correct_answer: q.correctAnswer,
        explanation: q.explanation || null,
        status: "published",
      })
    }
  }
  if (rows.length > 0) {
    const { error } = await supabase.from("questions").insert(rows)
    if (error) throw new Error("Failed to save questions: " + error.message)
  }
}

async function insertQuestionsAsDrafts(articleId, quiz) {
  if (!quiz || !Array.isArray(quiz.parts)) return
  const rows = []
  for (const part of quiz.parts) {
    for (const q of part.questions ?? []) {
      const optMap = {}
      for (const o of q.options ?? []) optMap[o.key] = o.text
      rows.push({
        article_id: articleId,
        type: q.type || "mc-single",
        format: q.format || "mc",
        part: part.part,
        points: q.points ?? part.pointsPerQuestion ?? 1,
        stem: q.stem,
        options: optMap,
        correct_answer: q.correctAnswer || q.correct_answer || "",
        explanation: q.explanation || null,
        select_count: q.selectCount ?? q.select_count ?? 1,
        sequence_tokens: q.sequenceTokens ?? q.sequence_tokens ?? null,
        status: "draft",
      })
    }
  }
  if (rows.length > 0) {
    const { error } = await supabase.from("questions").insert(rows)
    if (error) throw new Error("Failed to save draft questions: " + error.message)
  }
}

async function createVersionSnapshot(articleId, snapshot) {
  await supabase.from("article_versions").insert({
    article_id: articleId,
    snapshot,
    edited_by: "admin",
  })
}

// Rebuild quiz_json on the articles row from published questions so the mobile app picks it up.
async function rebuildQuizJson(articleId) {
  const [questionsResult, articleResult] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .eq("article_id", articleId)
      .eq("status", "published")
      .order("part", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true }),
    supabase.from("articles").select("quiz_json").eq("id", articleId).single(),
  ])
  if (questionsResult.error) throw new Error("rebuildQuizJson fetch: " + questionsResult.error.message)

  const data = questionsResult.data
  if (!data || data.length === 0) {
    await supabase.from("articles").update({ quiz_json: null, updated_at: nowIso() }).eq("id", articleId)
    return
  }

  // Preserve existing part titles from quiz_json if available
  const existingParts = articleResult.data?.quiz_json?.parts ?? []
  const existingTitleByPart = Object.fromEntries(existingParts.map((p) => [p.part, p.title]))

  // Group into parts
  const partsMap = new Map()
  for (const q of data) {
    const part = q.part ?? 1
    if (!partsMap.has(part)) partsMap.set(part, [])
    partsMap.get(part).push(q)
  }

  const parts = Array.from(partsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([partNum, qs]) => ({
      part: partNum,
      title: existingTitleByPart[partNum] || `第${partNum}部分`,
      pointsPerQuestion: qs[0]?.points ?? 1,
      questions: qs.map((q) => ({
        id: q.id,
        part: q.part ?? partNum,
        points: q.points ?? 1,
        stem: q.stem,
        format: q.format || "mc",
        type: q.type || "mc-single",
        options: q.options
          ? Object.entries(q.options).map(([key, text]) => {
              // Normalize bilingual True/False labels to Chinese
              // Handle both half-width () and full-width （） parentheses
              let normalizedText = text
                .replace(/是\s*[(\(]True[\))]/gi, '正確')
                .replace(/否\s*[(\(]False[\))]/gi, '錯誤')
                .replace(/True/gi, '正確')
                .replace(/False/gi, '錯誤')
              return { key, text: normalizedText }
            })
          : [],
        correctAnswer: q.correct_answer,
        explanation: q.explanation || null,
        selectCount: q.select_count ?? 1,
        sequenceTokens: q.sequence_tokens ?? null,
        questionTypes: q.question_types ?? [],
      })),
    }))

  const totalPoints = parts.reduce(
    (s, p) => s + p.questions.reduce((ps, q) => ps + (q.points ?? 1), 0),
    0
  )
  const quiz_json = { articleId, totalPoints, parts }

  const { error: upErr } = await supabase
    .from("articles")
    .update({ quiz_json, updated_at: nowIso() })
    .eq("id", articleId)
  if (upErr) throw new Error("rebuildQuizJson update: " + upErr.message)
}

module.exports = {
  nowIso,
  quizHasQuestions,
  countQuestions,
  articleToRow,
  rowToExercise,
  rowToIndexEntry,
  upsertQuestions,
  insertQuestionsAsDrafts,
  createVersionSnapshot,
  rebuildQuizJson,
}
