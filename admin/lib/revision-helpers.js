const { supabase } = require("./supabase")

/**
 * Get all mistake question IDs for a user (not yet corrected)
 * Returns array of question objects with metadata
 */
async function getMistakeQuestions(userId) {
  if (!userId) return []

  // Get all answers for this user
  const { data: allAnswers, error: answersErr } = await supabase
    .from("exercise_answers")
    .select(`
      question_id,
      is_correct,
      answered_at,
      exercise_sessions!inner(user_id)
    `)
    .eq("exercise_sessions.user_id", userId)
    .order("answered_at", { ascending: true })

  if (answersErr) {
    console.error('Failed to get answers:', answersErr)
    throw new Error('Failed to fetch mistakes')
  }

  // Group by question_id to track wrong/correct attempts
  const questionStats = new Map()

  for (const answer of allAnswers || []) {
    const qid = String(answer.question_id)
    if (!questionStats.has(qid)) {
      questionStats.set(qid, {
        questionId: qid,
        wrongCount: 0,
        correctCount: 0,
        lastWrongAt: null,
        lastCorrectAt: null,
        answers: []
      })
    }

    const stat = questionStats.get(qid)
    stat.answers.push({ is_correct: answer.is_correct, answered_at: answer.answered_at })

    if (answer.is_correct) {
      stat.correctCount++
      if (!stat.lastCorrectAt || answer.answered_at > stat.lastCorrectAt) {
        stat.lastCorrectAt = answer.answered_at
      }
    } else {
      stat.wrongCount++
      if (!stat.lastWrongAt || answer.answered_at > stat.lastWrongAt) {
        stat.lastWrongAt = answer.answered_at
      }
    }
  }

  // Filter to only questions with mistakes that are NOT YET corrected
  const mistakeQuestionIds = []
  for (const [qid, stat] of questionStats) {
    // Must have at least one wrong answer
    if (stat.wrongCount > 0) {
      // Not yet corrected: no correct answer after the last wrong answer
      if (!stat.lastCorrectAt || stat.lastWrongAt > stat.lastCorrectAt) {
        mistakeQuestionIds.push(qid)
      }
    }
  }

  if (mistakeQuestionIds.length === 0) {
    return []
  }

  // Fetch question details from both tables
  const mistakes = []

  // From questions table (Parts 1-6)
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("id, article_id, part, points, stem, format, options, correct_answer, explanation, select_count, sequence_tokens")
    .in("id", mistakeQuestionIds)
    .eq("status", "published")

  if (!qErr && questions) {
    for (const q of questions) {
      const stat = questionStats.get(String(q.id))
      mistakes.push({
        ...q,
        tableName: "questions",
        mistakeCount: stat?.wrongCount || 1,
        lastWrongAt: stat?.lastWrongAt || new Date().toISOString()
      })
    }
  }

  // From cross_article_questions table (Parts 7-8)
  const { data: crossQuestions, error: cqErr } = await supabase
    .from("cross_article_questions")
    .select("id, part, points, question_text, format, options, correct_answer, explanation, select_count, sequence_tokens")
    .in("id", mistakeQuestionIds)
    .eq("status", "published")

  if (!cqErr && crossQuestions) {
    for (const q of crossQuestions) {
      const stat = questionStats.get(String(q.id))
      mistakes.push({
        ...q,
        stem: q.question_text,
        article_id: null,
        tableName: "cross_article_questions",
        mistakeCount: stat?.wrongCount || 1,
        lastWrongAt: stat?.lastWrongAt || new Date().toISOString()
      })
    }
  }

  return mistakes
}

/**
 * Get revision summary for a user
 */
async function getRevisionSummary(userId) {
  if (!userId) {
    return {
      overall: { totalMistakes: 0, weakestPart: null, weakestPartCount: 0 },
      byArticle: [],
      byPart: [],
      weightTraining: { totalMistakes: 0, byPart: {} }
    }
  }

  const mistakes = await getMistakeQuestions(userId)

  // Process mistakes
  const byArticle = {}
  const byPart = {}
  let totalMistakes = mistakes.length

  for (const m of mistakes) {
    // Group by article (if applicable)
    if (m.article_id) {
      if (!byArticle[m.article_id]) {
        byArticle[m.article_id] = { articleId: m.article_id, totalMistakes: 0, byPart: {} }
      }
      byArticle[m.article_id].totalMistakes++
      byArticle[m.article_id].byPart[m.part] = (byArticle[m.article_id].byPart[m.part] || 0) + 1
    }

    // Group by part
    if (!byPart[m.part]) {
      byPart[m.part] = { part: m.part, totalMistakes: 0, byArticle: {}, isWeightTraining: false }
    }
    byPart[m.part].totalMistakes++

    if (m.article_id) {
      byPart[m.part].byArticle[m.article_id] = (byPart[m.part].byArticle[m.article_id] || 0) + 1
    } else {
      byPart[m.part].isWeightTraining = true
    }
  }

  // Weight training stats (Parts 7-8 from cross_article_questions)
  const weightByPart = {}
  let weightTotal = 0
  for (const m of mistakes) {
    if (!m.article_id && (m.part === 7 || m.part === 8)) {
      weightTotal++
      weightByPart[m.part] = (weightByPart[m.part] || 0) + 1
    }
  }

  // Find weakest part
  let weakestPart = null
  let weakestPartCount = 0
  for (const [part, data] of Object.entries(byPart)) {
    if (data.totalMistakes > weakestPartCount) {
      weakestPart = parseInt(part)
      weakestPartCount = data.totalMistakes
    }
  }

  return {
    overall: {
      totalMistakes,
      weakestPart,
      weakestPartCount
    },
    byArticle: Object.values(byArticle),
    byPart: Object.values(byPart).sort((a, b) => a.part - b.part),
    weightTraining: {
      totalMistakes: weightTotal,
      byPart: weightByPart
    }
  }
}

/**
 * Sample revision questions with smart prioritization
 */
async function sampleRevisionQuestions(userId, options = {}) {
  const { articleId, part, limit = 15 } = options

  if (!userId) {
    return []
  }

  const allMistakes = await getMistakeQuestions(userId)

  // Filter by criteria
  let filtered = allMistakes
  if (articleId) {
    filtered = allMistakes.filter(m => m.article_id === articleId)
  } else if (part !== undefined) {
    filtered = allMistakes.filter(m => m.part === parseInt(part))
  }

  // Smart sampling: sort by priority score
  const scored = filtered.map(m => {
    let score = 0

    // Frequency weight: more mistakes = higher priority
    score += (m.mistakeCount || 1) * 3

    // Recency weight: recent mistakes = higher priority
    const daysSince = (Date.now() - new Date(m.lastWrongAt)) / (1000 * 60 * 60 * 24)
    if (daysSince < 7) score += 10
    else if (daysSince < 30) score += 5

    return { ...m, priorityScore: score }
  })

  // Sort by priority (highest first) and take top N
  scored.sort((a, b) => b.priorityScore - a.priorityScore)
  const sampled = scored.slice(0, Math.min(limit, scored.length))

  // Shuffle to avoid predictable order
  for (let i = sampled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[sampled[i], sampled[j]] = [sampled[j], sampled[i]]
  }

  return sampled
}

module.exports = {
  getRevisionSummary,
  sampleRevisionQuestions
}
