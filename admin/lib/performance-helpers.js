const { supabase } = require("./supabase")

const MAX_DAYS = 365
const PAGE_SIZE = 1000
const CHUNK = 100

const HARD_BELOW = 0.3
const EASY_ABOVE = 0.95

// ---------------------------------------------------------------------------
// Pure aggregation (unit-tested; no Supabase)
// ---------------------------------------------------------------------------

function pct(num, den) {
  return den > 0 ? num / den : null
}

function round3(x) {
  return x == null ? null : Math.round(x * 1000) / 1000
}

function parseDays(raw) {
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return 30
  return Math.min(n, MAX_DAYS)
}

/** Registered = has an email on their profile. Anonymous = null user_id or profile without email. */
function isRegistered(session, profilesById) {
  if (!session.user_id) return false
  const p = profilesById.get(session.user_id)
  return !!(p && p.email)
}

function filterSessions(sessions, profilesById, includeAnonymous) {
  if (includeAnonymous) return sessions
  return sessions.filter(s => isRegistered(s, profilesById))
}

/** Score fraction for a finished session, or null when it can't be scored. */
function sessionScoreRatio(s) {
  if (!s.finished_at || s.total_points == null || s.total_points <= 0 || s.score == null) return null
  return s.score / s.total_points
}

function avg(nums) {
  const xs = nums.filter(n => n != null)
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

function summarizeSessions(sessions) {
  const finished = sessions.filter(s => s.finished_at)
  const byKind = {}
  for (const s of sessions) {
    const k = s.kind || "unknown"
    if (!byKind[k]) byKind[k] = { sessions: 0, finished: 0, ratios: [] }
    byKind[k].sessions++
    if (s.finished_at) {
      byKind[k].finished++
      byKind[k].ratios.push(sessionScoreRatio(s))
    }
  }

  const perDay = {}
  for (const s of sessions) {
    const day = String(s.started_at || "").slice(0, 10)
    if (day) perDay[day] = (perDay[day] || 0) + 1
  }

  const paced = finished.filter(s => s.total_seconds != null && s.expected_seconds > 0)

  return {
    totalSessions: sessions.length,
    finishedSessions: finished.length,
    abandonedSessions: sessions.length - finished.length,
    completionRate: round3(pct(finished.length, sessions.length)),
    avgScoreRatio: round3(avg(finished.map(sessionScoreRatio))),
    avgTimeRatio: round3(avg(paced.map(s => s.total_seconds / s.expected_seconds))),
    byKind: Object.fromEntries(
      Object.entries(byKind).map(([k, v]) => [
        k,
        {
          sessions: v.sessions,
          finished: v.finished,
          avgScoreRatio: round3(avg(v.ratios)),
        },
      ])
    ),
    sessionsPerDay: Object.entries(perDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
  }
}

/**
 * Accuracy grouped by a key derived from each answer's question meta.
 * keysFn(meta) returns an array of group keys (a question can carry several type labels).
 */
function accuracyBy(answers, metaById, keysFn) {
  const groups = new Map()
  for (const a of answers) {
    const meta = metaById.get(String(a.question_id))
    if (!meta) continue
    for (const key of keysFn(meta)) {
      if (key == null) continue
      if (!groups.has(key)) groups.set(key, { key, answers: 0, correct: 0 })
      const g = groups.get(key)
      g.answers++
      if (a.is_correct) g.correct++
    }
  }
  return [...groups.values()]
    .map(g => ({ ...g, accuracy: round3(pct(g.correct, g.answers)) }))
    .sort((a, b) => String(a.key).localeCompare(String(b.key), undefined, { numeric: true }))
}

function flagQuestion(accuracy) {
  if (accuracy == null) return null
  if (accuracy < HARD_BELOW) return "hard"
  if (accuracy > EASY_ABOVE) return "easy"
  return null
}

/** Per-question stats from answers + question meta. */
function questionStats(answers, metaById, { minAttempts = 5 } = {}) {
  const stats = new Map()
  for (const a of answers) {
    const qid = String(a.question_id)
    if (!stats.has(qid)) stats.set(qid, { questionId: qid, attempts: 0, correct: 0, points: 0 })
    const s = stats.get(qid)
    s.attempts++
    if (a.is_correct) s.correct++
    s.points += a.points_earned || 0
  }
  return [...stats.values()]
    .filter(s => s.attempts >= minAttempts)
    .map(s => {
      const accuracy = round3(pct(s.correct, s.attempts))
      const meta = metaById.get(s.questionId) || null
      return {
        questionId: s.questionId,
        attempts: s.attempts,
        correct: s.correct,
        accuracy,
        avgPoints: round3(s.points / s.attempts),
        flag: flagQuestion(accuracy),
        question: meta,
      }
    })
    .sort((a, b) => a.accuracy - b.accuracy)
}

function weakestKey(groups, minAnswers = 3) {
  const eligible = groups.filter(g => g.answers >= minAnswers && g.accuracy != null)
  if (!eligible.length) return null
  return eligible.reduce((lo, g) => (g.accuracy < lo.accuracy ? g : lo)).key
}

// ---------------------------------------------------------------------------
// Supabase fetchers
// ---------------------------------------------------------------------------

function chunk(arr, size = CHUNK) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Run a paginated select until a short page comes back. buildQuery(from, to) returns a query. */
async function fetchAll(buildQuery, label) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${label} query failed: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

async function fetchSessions({ days, userId = null }) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  return fetchAll((from, to) => {
    let q = supabase
      .from("exercise_sessions")
      .select("id, user_id, article_id, kind, started_at, finished_at, total_seconds, expected_seconds, score, total_points")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .range(from, to)
    if (userId) q = q.eq("user_id", userId)
    return q
  }, "exercise_sessions")
}

async function fetchProfiles(userIds) {
  const map = new Map()
  for (const ids of chunk([...new Set(userIds.filter(Boolean))])) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, is_pro")
      .in("id", ids)
    if (error) throw new Error("profiles query failed: " + error.message)
    for (const p of data || []) map.set(p.id, p)
  }
  return map
}

async function fetchAnswers(sessionIds) {
  const rows = []
  for (const ids of chunk(sessionIds)) {
    const part = await fetchAll(
      (from, to) =>
        supabase
          .from("exercise_answers")
          .select("id, session_id, question_id, user_answer, is_correct, points_earned, answered_at")
          .in("session_id", ids)
          .order("id", { ascending: true })
          .range(from, to),
      "exercise_answers"
    )
    rows.push(...part)
  }
  return rows
}

/** Normalised question meta for IDs that may live in either `questions` or `cross_article_questions`. */
function optionsToList(optionsObj) {
  if (!optionsObj || typeof optionsObj !== "object") return []
  return Object.keys(optionsObj).sort().map(key => ({ key, text: optionsObj[key] }))
}

function normalizeQuestionRow(row, source) {
  const options = optionsToList(row.options)
  const correctKeys = String(row.correct_answer || "").split(",").map(s => s.trim()).filter(Boolean)
  return {
    id: String(row.id),
    source,
    text: source === "questions" ? row.stem : row.question_text,
    format: row.format,
    part: row.part ?? null,
    articleId: source === "questions" ? row.article_id : null,
    questionTypes: row.question_types || [],
    options,
    correctAnswer: row.correct_answer,
    correctOptionTexts: options.filter(o => correctKeys.includes(o.key)).map(o => o.text),
    sequenceTokens: row.sequence_tokens || null,
    explanation: row.explanation || null,
  }
}

async function fetchQuestionMeta(questionIds) {
  const meta = new Map()
  const ids = [...new Set(questionIds.map(String))]
  for (const batch of chunk(ids)) {
    const [q, c] = await Promise.all([
      supabase
        .from("questions")
        .select("id, article_id, stem, format, part, options, correct_answer, explanation, sequence_tokens, question_types")
        .in("id", batch),
      supabase
        .from("cross_article_questions")
        .select("id, question_text, format, part, options, correct_answer, explanation, sequence_tokens, question_types")
        .in("id", batch),
    ])
    if (q.error) throw new Error("questions lookup failed: " + q.error.message)
    if (c.error) throw new Error("cross_article_questions lookup failed: " + c.error.message)
    for (const r of q.data || []) meta.set(String(r.id), normalizeQuestionRow(r, "questions"))
    for (const r of c.data || []) meta.set(String(r.id), normalizeQuestionRow(r, "cross_article_questions"))
  }
  return meta
}

async function fetchArticleTitles(articleIds) {
  const map = new Map()
  for (const ids of chunk([...new Set(articleIds.filter(Boolean))])) {
    const { data, error } = await supabase.from("articles").select("id, title").in("id", ids)
    if (error) throw new Error("articles query failed: " + error.message)
    for (const a of data || []) map.set(a.id, a.title)
  }
  return map
}

module.exports = {
  HARD_BELOW,
  EASY_ABOVE,
  parseDays,
  isRegistered,
  filterSessions,
  sessionScoreRatio,
  summarizeSessions,
  accuracyBy,
  flagQuestion,
  questionStats,
  weakestKey,
  fetchSessions,
  fetchProfiles,
  fetchAnswers,
  fetchQuestionMeta,
  fetchArticleTitles,
}
