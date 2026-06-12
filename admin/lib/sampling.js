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
 *
 * @param {string|null} userId
 * @param {string} articleId
 * @returns {{ seenMap: Map<string, string>, seenCount: number, attemptNumber: number }}
 */
async function getSeenData(userId, articleId) {
  const empty = { seenMap: new Map(), seenCount: 0, attemptNumber: 0 }
  if (!userId || !supabase) return empty

  // Get attempt IDs for this user+article
  const { data: attempts, error: attErr } = await supabase
    .from("quiz_attempts")
    .select("id, completed_at")
    .eq("user_id", userId)
    .eq("article_id", articleId)

  if (attErr) throw new Error("getSeenData attempts query failed: " + attErr.message)
  if (!attempts || attempts.length === 0) return empty

  const attemptNumber = attempts.length
  const attemptIds = attempts.map((a) => a.id)

  // Get all quiz_answers for those attempts
  const { data: answers, error: ansErr } = await supabase
    .from("quiz_answers")
    .select("question_id, attempt_id")
    .in("attempt_id", attemptIds)

  if (ansErr) throw new Error("getSeenData answers query failed: " + ansErr.message)

  // Build a map from attempt_id -> completed_at for quick lookup
  const completedAtById = {}
  for (const a of attempts) {
    completedAtById[a.id] = a.completed_at
  }

  // Build seenMap: question_id -> MAX(completed_at) across all attempts
  const seenMap = new Map()
  for (const ans of answers || []) {
    const qid = String(ans.question_id)
    const completedAt = completedAtById[ans.attempt_id]
    if (!seenMap.has(qid) || completedAt > seenMap.get(qid)) {
      seenMap.set(qid, completedAt)
    }
  }

  return { seenMap, seenCount: seenMap.size, attemptNumber }
}

module.exports = { DEFAULT_PART_QUOTAS, sampleByPart, getSeenData }
