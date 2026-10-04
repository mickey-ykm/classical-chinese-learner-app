const express = require("express")
const { supabase, requireSupabase } = require("../lib/supabase")
const { getRevisionSummary } = require("../lib/revision-helpers")
const {
  parseDays,
  isRegistered,
  filterSessions,
  sessionScoreRatio,
  summarizeSessions,
  accuracyBy,
  questionStats,
  weakestKey,
  fetchSessions,
  fetchProfiles,
  fetchAnswers,
  fetchQuestionMeta,
  fetchArticleTitles,
} = require("../lib/performance-helpers")

const router = express.Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function scopeFromQuery(req) {
  return {
    days: parseDays(req.query.days),
    includeAnonymous: req.query.includeAnonymous !== "false",
  }
}

/** Sessions in range (filtered), their profiles, answers and question meta. */
async function loadScope({ days, includeAnonymous }) {
  const allSessions = await fetchSessions({ days })
  const profiles = await fetchProfiles(allSessions.map(s => s.user_id))
  const sessions = filterSessions(allSessions, profiles, includeAnonymous)
  const answers = await fetchAnswers(sessions.map(s => s.id))
  const meta = await fetchQuestionMeta(answers.map(a => a.question_id))
  return { sessions, profiles, answers, meta }
}

function sessionKindById(sessions) {
  return new Map(sessions.map(s => [s.id, s.kind]))
}

function partAccuracy(answers, meta) {
  return accuracyBy(answers, meta, m => [m.part])
}

function typeAccuracy(answers, meta) {
  return accuracyBy(answers, meta, m => m.questionTypes)
}

// GET /api/performance/overview
router.get("/overview", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const scope = scopeFromQuery(req)
    const { sessions, profiles, answers, meta } = await loadScope(scope)

    const registeredIds = new Set(sessions.filter(s => isRegistered(s, profiles)).map(s => s.user_id))
    const anonymousSessions = sessions.filter(s => !isRegistered(s, profiles)).length

    // Article popularity (sessions tied to a single article)
    const byArticle = new Map()
    for (const s of sessions) {
      if (!s.article_id) continue
      if (!byArticle.has(s.article_id)) byArticle.set(s.article_id, { articleId: s.article_id, sessions: 0, ratios: [] })
      const g = byArticle.get(s.article_id)
      g.sessions++
      const r = sessionScoreRatio(s)
      if (r != null) g.ratios.push(r)
    }
    const titles = await fetchArticleTitles([...byArticle.keys()])
    const topArticles = [...byArticle.values()]
      .map(g => ({
        articleId: g.articleId,
        title: titles.get(g.articleId) || g.articleId,
        sessions: g.sessions,
        avgScoreRatio: g.ratios.length ? Math.round((g.ratios.reduce((a, b) => a + b, 0) / g.ratios.length) * 1000) / 1000 : null,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 15)

    res.json({
      ...scope,
      totals: {
        ...summarizeSessions(sessions),
        totalAnswers: answers.length,
        registeredStudents: registeredIds.size,
        anonymousSessions,
      },
      accuracyByPart: partAccuracy(answers, meta),
      accuracyByType: typeAccuracy(answers, meta),
      topArticles,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/performance/questions?kind=&part=&articleId=&minAttempts=
router.get("/questions", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const scope = scopeFromQuery(req)
    const minAttempts = Math.max(1, parseInt(req.query.minAttempts, 10) || 5)
    const { sessions, answers, meta } = await loadScope(scope)

    let scoped = answers
    if (req.query.kind) {
      const kinds = sessionKindById(sessions)
      scoped = scoped.filter(a => kinds.get(a.session_id) === req.query.kind)
    }

    let rows = questionStats(scoped, meta, { minAttempts })
    if (req.query.part) rows = rows.filter(r => r.question && r.question.part === parseInt(req.query.part, 10))
    if (req.query.articleId) rows = rows.filter(r => r.question && r.question.articleId === req.query.articleId)

    // Questions deleted since the answer was logged have no meta; keep them but they can't be edited
    res.json({ ...scope, minAttempts, questions: rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/performance/students?search=&sort=
router.get("/students", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const scope = { ...scopeFromQuery(req), includeAnonymous: false }
    const { sessions, profiles, answers, meta } = await loadScope(scope)

    const answersBySession = new Map()
    for (const a of answers) {
      if (!answersBySession.has(a.session_id)) answersBySession.set(a.session_id, [])
      answersBySession.get(a.session_id).push(a)
    }

    const byUser = new Map()
    for (const s of sessions) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, [])
      byUser.get(s.user_id).push(s)
    }

    let students = [...byUser.entries()].map(([userId, userSessions]) => {
      const p = profiles.get(userId) || {}
      const summary = summarizeSessions(userSessions)
      const userAnswers = userSessions.flatMap(s => answersBySession.get(s.id) || [])
      return {
        userId,
        email: p.email || null,
        displayName: p.display_name || null,
        isPro: !!p.is_pro,
        sessions: summary.totalSessions,
        finishedSessions: summary.finishedSessions,
        avgScoreRatio: summary.avgScoreRatio,
        lastActive: userSessions.reduce((m, s) => (s.started_at > m ? s.started_at : m), ""),
        weakestPart: weakestKey(partAccuracy(userAnswers, meta)),
      }
    })

    const search = String(req.query.search || "").trim().toLowerCase()
    if (search) {
      students = students.filter(s =>
        (s.email || "").toLowerCase().includes(search) || (s.displayName || "").toLowerCase().includes(search))
    }

    const sorts = {
      lastActive: (a, b) => (b.lastActive > a.lastActive ? 1 : -1),
      sessions: (a, b) => b.sessions - a.sessions,
      score: (a, b) => (a.avgScoreRatio ?? 2) - (b.avgScoreRatio ?? 2), // weakest first
    }
    students.sort(sorts[req.query.sort] || sorts.lastActive)

    res.json({ days: scope.days, students })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/performance/students/:userId
router.get("/students/:userId", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { userId } = req.params
    if (!UUID_RE.test(userId)) return res.status(400).json({ error: "Invalid user id" })
    const days = parseDays(req.query.days || 90)

    const sessions = await fetchSessions({ days, userId })
    const profiles = await fetchProfiles([userId])
    const answers = await fetchAnswers(sessions.map(s => s.id))
    const meta = await fetchQuestionMeta(answers.map(a => a.question_id))
    const titles = await fetchArticleTitles(sessions.map(s => s.article_id))
    const revision = await getRevisionSummary(userId)

    const answerCounts = new Map()
    for (const a of answers) answerCounts.set(a.session_id, (answerCounts.get(a.session_id) || 0) + 1)

    const p = profiles.get(userId)
    if (!p) return res.status(404).json({ error: "Student not found" })

    res.json({
      days,
      profile: { userId, email: p.email, displayName: p.display_name, isPro: !!p.is_pro },
      summary: summarizeSessions(sessions),
      unresolvedMistakes: revision.overall.totalMistakes,
      accuracyByPart: partAccuracy(answers, meta),
      accuracyByType: typeAccuracy(answers, meta),
      sessions: sessions.map(s => ({
        id: s.id,
        kind: s.kind,
        articleId: s.article_id,
        articleTitle: s.article_id ? titles.get(s.article_id) || s.article_id : null,
        startedAt: s.started_at,
        finishedAt: s.finished_at,
        score: s.score,
        totalPoints: s.total_points,
        scoreRatio: sessionScoreRatio(s),
        totalSeconds: s.total_seconds,
        expectedSeconds: s.expected_seconds,
        answerCount: answerCounts.get(s.id) || 0,
      })),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/performance/sessions/:id
router.get("/sessions/:id", async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { id } = req.params
    if (!UUID_RE.test(id)) return res.status(400).json({ error: "Invalid session id" })

    const { data: session, error } = await supabase
      .from("exercise_sessions")
      .select("id, user_id, article_id, kind, started_at, finished_at, total_seconds, expected_seconds, score, total_points")
      .eq("id", id)
      .maybeSingle()
    if (error) throw new Error("session query failed: " + error.message)
    if (!session) return res.status(404).json({ error: "Session not found" })

    const answers = await fetchAnswers([id])
    const meta = await fetchQuestionMeta(answers.map(a => a.question_id))
    const profiles = await fetchProfiles([session.user_id])
    const titles = await fetchArticleTitles([session.article_id])
    const p = profiles.get(session.user_id)

    res.json({
      session: {
        ...session,
        articleTitle: session.article_id ? titles.get(session.article_id) || session.article_id : null,
        scoreRatio: sessionScoreRatio(session),
        student: p ? { email: p.email, displayName: p.display_name } : null,
      },
      answers: answers.map(a => {
        const q = meta.get(String(a.question_id)) || null
        return {
          questionId: a.question_id,
          isCorrect: a.is_correct,
          pointsEarned: a.points_earned,
          // MC letters are stored in the student's shuffled option order (QuizShell re-keys A/B/C/D),
          // so they can't be matched to the stored question's options; only non-MC answers are shown.
          userAnswer: q && q.format === "mc" ? null : a.user_answer,
          question: q,
        }
      }),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
