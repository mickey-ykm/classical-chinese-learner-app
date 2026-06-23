const { supabase } = require("./supabase")

const WEIGHT_TRAINING_QUOTAS = [
  { part: 7, count: 5 },
  { part: 8, count: 5 },
]

function fisherYates(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Sample weight training questions: 5 from part 7, 5 from part 8
 *
 * @param {Array} questions - All published cross-article question rows
 * @param {Map<string, string>} seenMap - Map<questionId_string, last_seen_at_isostring>
 * @returns {Array} Sampled question rows (10 total), ordered part 7 first, shuffled within each part
 */
function sampleWeightTrainingByPart(questions, seenMap) {
  const result = []

  for (const { part, count: quota } of WEIGHT_TRAINING_QUOTAS) {
    const allForPart = questions.filter((q) => q.part === part)
    if (allForPart.length === 0) continue

    const unseen = allForPart.filter((q) => !seenMap.has(String(q.id)))
    const seen = allForPart
      .filter((q) => seenMap.has(String(q.id)))
      .sort((a, b) => {
        const ta = seenMap.get(String(a.id))
        const tb = seenMap.get(String(b.id))
        return ta < tb ? -1 : ta > tb ? 1 : 0
      })

    let selected
    if (unseen.length >= quota) {
      // Randomly sample quota from unseen
      selected = fisherYates(unseen).slice(0, quota)
    } else {
      // Take all unseen, fill remainder from seen oldest-first
      const remaining = Math.min(quota - unseen.length, seen.length)
      selected = [...unseen, ...seen.slice(0, remaining)]
      // Cap at total available
      selected = selected.slice(0, allForPart.length)
    }

    // Shuffle within part
    result.push(...fisherYates(selected))
  }

  return result
}

/**
 * Fetch seen question data for weight training exercises
 *
 * @param {string|null} userId
 * @returns {{ seenMap: Map<string, string>, seenCount: number, attemptNumber: number }}
 */
async function getWeightTrainingSeenData(userId) {
  const empty = { seenMap: new Map(), seenCount: 0, attemptNumber: 0 }
  if (!userId || !supabase) return empty

  // Get exercise_sessions for this user + weight-training type
  // Limit to recent 100 sessions to avoid .in() array size limits
  const { data: sessions, error: sessErr } = await supabase
    .from("exercise_sessions")
    .select("id, finished_at")
    .eq("user_id", userId)
    .eq("kind", "weight-training")
    .order("finished_at", { ascending: false })
    .limit(100)

  if (sessErr) throw new Error("getWeightTrainingSeenData sessions query failed: " + sessErr.message)
  if (!sessions || sessions.length === 0) return empty

  const attemptNumber = sessions.length
  const sessionIds = sessions.map((s) => s.id)

  // Debug: log sessionIds to check for issues
  console.log("Querying exercise_answers for sessions:", {
    count: sessionIds.length,
    firstSessionId: sessionIds[0],
    sessionIdType: typeof sessionIds[0],
  })

  // Get all exercise_answers for those sessions
  const { data: answers, error: ansErr } = await supabase
    .from("exercise_answers")
    .select("question_id, session_id")
    .in("session_id", sessionIds)

  if (ansErr) {
    console.error("getWeightTrainingSeenData query failed:", {
      error: ansErr,
      code: ansErr.code,
      message: ansErr.message,
      details: ansErr.details,
      hint: ansErr.hint,
      sessionIds: sessionIds.slice(0, 3), // Log first 3 session IDs for debugging
    })
    throw new Error("getWeightTrainingSeenData answers query failed: " + ansErr.message)
  }

  // Build a map from session_id -> finished_at for quick lookup
  const finishedAtById = {}
  for (const s of sessions) {
    finishedAtById[s.id] = s.finished_at
  }

  // Build seenMap: question_id -> MAX(finished_at) across all sessions
  const seenMap = new Map()
  for (const ans of answers || []) {
    const qid = String(ans.question_id)
    const finishedAt = finishedAtById[ans.session_id]
    if (!seenMap.has(qid) || finishedAt > seenMap.get(qid)) {
      seenMap.set(qid, finishedAt)
    }
  }

  return { seenMap, seenCount: seenMap.size, attemptNumber }
}

/**
 * Get weight training pool progress for a user
 *
 * @param {string|null} userId
 * @returns {Promise<object>} Progress stats
 */
async function getWeightTrainingProgress(userId) {
  // Fetch all published questions
  const { data: allQuestions, error: qErr } = await supabase
    .from("cross_article_questions")
    .select("id, part")
    .eq("status", "published")

  if (qErr) throw new Error("getWeightTrainingProgress query failed: " + qErr.message)

  const part7Questions = allQuestions.filter(q => q.part === 7)
  const part8Questions = allQuestions.filter(q => q.part === 8)

  const totalInPool = allQuestions.length
  const part7Total = part7Questions.length
  const part8Total = part8Questions.length

  if (!userId) {
    return {
      totalInPool,
      seenCount: 0,
      part7Seen: 0,
      part7Total,
      part8Seen: 0,
      part8Total,
      attemptNumber: 0,
      estimatedAttemptsToComplete: 0,
    }
  }

  const { seenMap, seenCount, attemptNumber } = await getWeightTrainingSeenData(userId)

  const part7Seen = part7Questions.filter(q => seenMap.has(String(q.id))).length
  const part8Seen = part8Questions.filter(q => seenMap.has(String(q.id))).length

  // Estimate attempts to complete (10 questions per attempt)
  const unseenCount = totalInPool - seenCount
  const estimatedAttemptsToComplete = Math.ceil(unseenCount / 10)

  return {
    totalInPool,
    seenCount,
    part7Seen,
    part7Total,
    part8Seen,
    part8Total,
    attemptNumber,
    estimatedAttemptsToComplete,
  }
}

/**
 * Sample 10 questions for weight training (5 from part 7, 5 from part 8)
 *
 * @param {string|null} userId
 * @returns {Promise<Array>} Sampled questions with related article IDs
 */
async function sampleWeightTrainingQuestions(userId) {
  // Fetch all published cross-article questions
  const { data: questions, error: qErr } = await supabase
    .from("cross_article_questions")
    .select("*")
    .eq("status", "published")

  if (qErr) throw new Error("sampleWeightTrainingQuestions query failed: " + qErr.message)

  // Check if we have enough questions
  const part7Count = questions.filter(q => q.part === 7).length
  const part8Count = questions.filter(q => q.part === 8).length

  if (part7Count < 5 || part8Count < 5) {
    throw new Error(
      `Insufficient questions for weight training. Need 5+ from part 7 (have ${part7Count}) and 5+ from part 8 (have ${part8Count})`
    )
  }

  // Get seen data for repeat avoidance
  const { seenMap } = userId
    ? await getWeightTrainingSeenData(userId)
    : { seenMap: new Map() }

  // Sample questions
  const sampled = sampleWeightTrainingByPart(questions, seenMap)

  // Fetch related articles for each question
  const questionIds = sampled.map(q => q.id)
  const { data: articleLinks, error: linkErr } = await supabase
    .from("cross_article_question_articles")
    .select("question_id, article_id")
    .in("question_id", questionIds)

  if (linkErr) throw new Error("Failed to fetch related articles: " + linkErr.message)

  // Group article IDs by question ID
  const relatedArticlesByQuestion = {}
  for (const link of articleLinks || []) {
    if (!relatedArticlesByQuestion[link.question_id]) {
      relatedArticlesByQuestion[link.question_id] = []
    }
    relatedArticlesByQuestion[link.question_id].push(link.article_id)
  }

  // Attach related article IDs to each question
  return sampled.map(q => ({
    ...q,
    relatedArticleIds: relatedArticlesByQuestion[q.id] || [],
  }))
}

module.exports = {
  WEIGHT_TRAINING_QUOTAS,
  sampleWeightTrainingByPart,
  getWeightTrainingSeenData,
  getWeightTrainingProgress,
  sampleWeightTrainingQuestions,
}
