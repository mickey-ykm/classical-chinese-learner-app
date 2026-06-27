const { supabase } = require("./supabase")

const DEFAULT_PART_QUOTAS = [
  { part: 1, count: 6 },
  { part: 2, count: 2 },
  { part: 3, count: 4 },
  { part: 4, count: 2 },
  { part: 5, count: 2 },
  { part: 6, count: 6 },
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
 * Sample questions by part according to DEFAULT_PART_QUOTAS.
 *
 * @param {Array} questions - All published DB question rows for one article
 * @param {Map<string, string>} seenMap - Map<questionId_string, last_seen_at_isostring>
 * @returns {Array} Sampled question rows, ordered part 1 first, shuffled within each part
 */
function sampleByPart(questions, seenMap) {
  const result = []

  for (const { part, count: quota } of DEFAULT_PART_QUOTAS) {
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
 * Fetch seen question data for a user+article from Supabase.
 * Queries BOTH old (quiz_attempts) and new (exercise_sessions) tables during migration.
 *
 * @param {string|null} userId
 * @param {string} articleId
 * @returns {{ seenMap: Map<string, string>, seenCount: number, attemptNumber: number }}
 */
async function getSeenData(userId, articleId) {
  const empty = { seenMap: new Map(), seenCount: 0, attemptNumber: 0 }
  if (!userId || !supabase) return empty

  // Query NEW system: exercise_sessions + exercise_answers
  const { data: sessions, error: sessErr } = await supabase
    .from("exercise_sessions")
    .select("id, finished_at")
    .eq("user_id", userId)
    .eq("kind", "article-quiz")
    .eq("article_id", articleId)

  if (sessErr) throw new Error("getSeenData sessions query failed: " + sessErr.message)

  const sessionIds = (sessions || []).map(s => s.id)
  const sessionTimestamps = new Map(
    (sessions || []).map(s => [s.id, s.finished_at])
  )

  let newAnswers = []
  if (sessionIds.length > 0) {
    const { data: answers, error: newAnsErr } = await supabase
      .from("exercise_answers")
      .select("question_id, session_id")
      .in("session_id", sessionIds)

    if (newAnsErr) throw new Error("getSeenData exercise_answers query failed: " + newAnsErr.message)
    newAnswers = answers || []
  }

  // Query exercise_sessions (unified system - all article quizzes)
  const { data: attempts, error: attErr } = await supabase
    .from("exercise_sessions")
    .select("id, finished_at")
    .eq("kind", "article-quiz")
    .eq("user_id", userId)
    .eq("article_id", articleId)

  if (attErr) throw new Error("getSeenData attempts query failed: " + attErr.message)

  const attemptIds = (attempts || []).map(a => a.id)
  const attemptTimestamps = new Map(
    (attempts || []).map(a => [a.id, a.finished_at])
  )

  let oldAnswers = []
  if (attemptIds.length > 0) {
    const { data: answers, error: oldAnsErr } = await supabase
      .from("exercise_answers")
      .select("question_id, session_id")
      .in("session_id", attemptIds)

    if (oldAnsErr) throw new Error("getSeenData exercise_answers query failed: " + oldAnsErr.message)
    oldAnswers = answers || []
  }

  // Merge seen maps: take most recent timestamp per question
  const seenMap = new Map()

  for (const a of newAnswers) {
    const qid = String(a.question_id)
    const ts = sessionTimestamps.get(a.session_id)
    if (!seenMap.has(qid) || ts > seenMap.get(qid)) {
      seenMap.set(qid, ts)
    }
  }

  for (const a of oldAnswers) {
    const qid = String(a.question_id)
    const ts = attemptTimestamps.get(a.session_id)
    if (!seenMap.has(qid) || ts > seenMap.get(qid)) {
      seenMap.set(qid, ts)
    }
  }

  return {
    seenMap,
    seenCount: seenMap.size,
    attemptNumber: sessions.length + attempts.length,
  }
}

module.exports = { DEFAULT_PART_QUOTAS, sampleByPart, getSeenData }
