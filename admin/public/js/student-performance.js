let currentTab = 'overview'
let questionRows = []
let currentStudentId = null
let searchTimer = null

const KIND_LABELS = {
  'article-quiz': '篇章測驗',
  'dse-training': 'DSE 模擬',
  'weight-training': '難題訓練',
  'revision': '重溫',
}

window.addEventListener('DOMContentLoaded', () => reload())

window.signOut = async function() {
  await fetch('/api/admin/logout', { method: 'POST' })
  window.location.href = '/login.html'
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.className = type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 3000)
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text == null ? '' : String(text)
  return div.innerHTML
}

function pctText(x) { return x == null ? '—' : Math.round(x * 100) + '%' }
function dateText(iso) { return iso ? new Date(iso).toLocaleString() : '—' }
function secText(s) {
  if (s == null) return '—'
  return s >= 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's' : s + 's'
}

function scope() {
  const days = document.getElementById('f-days').value
  const includeAnonymous = !document.getElementById('f-registered').checked
  return `days=${days}&includeAnonymous=${includeAnonymous}`
}

async function api(path) {
  const res = await fetch(path)
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) { window.location.href = '/login.html'; return }
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

window.showTab = function(tab) {
  currentTab = tab
  for (const t of ['overview', 'questions', 'students']) {
    document.getElementById('panel-' + t).classList.toggle('hidden', t !== tab)
    const btn = document.getElementById('tab-' + t)
    btn.className = t === tab
      ? 'tab-active px-5 pb-2.5 text-sm font-medium'
      : 'px-5 pb-2.5 text-sm font-medium text-slate-500 hover:text-slate-700'
  }
  reload()
}

window.reload = function() {
  if (currentTab === 'overview') loadOverview()
  else if (currentTab === 'questions') loadQuestions()
  else loadStudents()
}

function loadingRow(cols) {
  return `<tr><td colspan="${cols}" class="px-4 py-8 text-center text-sm text-slate-400">Loading…</td></tr>`
}
function errorRow(cols, e) {
  return `<tr><td colspan="${cols}" class="px-4 py-8 text-center text-sm text-red-500">Error: ${escapeHtml(e.message)}</td></tr>`
}

// ---- Shared widgets -------------------------------------------------------

function barList(items, labelFn) {
  if (!items.length) return '<p class="text-xs text-slate-400">No data in this range</p>'
  return items.map(it => {
    const w = Math.round((it.ratio ?? 0) * 100)
    const color = it.ratio == null ? 'bg-stone-300' : it.ratio < 0.5 ? 'bg-red-400' : it.ratio < 0.75 ? 'bg-amber-400' : 'bg-green-500'
    return `<div class="flex items-center gap-2 mb-1.5 text-xs">
      <div class="w-28 shrink-0 truncate text-slate-600" title="${escapeHtml(labelFn(it))}">${escapeHtml(labelFn(it))}</div>
      <div class="flex-1 bg-stone-100 rounded h-3"><div class="${color} h-3 rounded" style="width:${w}%"></div></div>
      <div class="w-20 text-right text-slate-500">${pctText(it.ratio)}${it.n != null ? ` <span class="text-slate-400">(${it.n})</span>` : ''}</div>
    </div>`
  }).join('')
}

function dailyChart(days) {
  if (!days.length) return '<p class="text-xs text-slate-400">No sessions in this range</p>'
  const max = Math.max(...days.map(d => d.count))
  const w = 100 / days.length
  const bars = days.map((d, i) => {
    const h = Math.max(2, (d.count / max) * 80)
    return `<rect x="${i * w + w * 0.1}" y="${90 - h}" width="${w * 0.8}" height="${h}" fill="#d97706"><title>${d.date}: ${d.count}</title></rect>`
  }).join('')
  return `<svg viewBox="0 0 100 90" preserveAspectRatio="none" class="w-full h-32">${bars}</svg>
    <div class="flex justify-between text-xs text-slate-400"><span>${days[0].date}</span><span>${days[days.length - 1].date} · peak ${max}</span></div>`
}

function kpi(label, value, sub = '') {
  return `<div class="bg-white rounded-xl border border-stone-200 p-4">
    <div class="text-xs text-slate-500">${label}</div>
    <div class="text-2xl font-semibold mt-1">${value}</div>
    ${sub ? `<div class="text-xs text-slate-400 mt-0.5">${sub}</div>` : ''}
  </div>`
}

// ---- Overview ---------------------------------------------------------------

async function loadOverview() {
  try {
    const d = await api('/api/performance/overview?' + scope())
    if (!d) return
    const t = d.totals
    document.getElementById('ov-kpis').innerHTML =
      kpi('Sessions', t.totalSessions, `${t.finishedSessions} finished`) +
      kpi('Completion rate', pctText(t.completionRate), `${t.abandonedSessions} abandoned`) +
      kpi('Avg score', pctText(t.avgScoreRatio), 'finished sessions') +
      kpi('Registered students', t.registeredStudents, `${t.anonymousSessions} anonymous sessions`) +
      kpi('Answers logged', t.totalAnswers) +
      kpi('Time vs expected', pctText(t.avgTimeRatio), '100% = on expected pace')

    document.getElementById('ov-daily').innerHTML = dailyChart(t.sessionsPerDay)
    document.getElementById('ov-kinds').innerHTML = barList(
      Object.entries(t.byKind).map(([k, v]) => ({ key: k, ratio: v.avgScoreRatio, n: v.sessions })),
      it => KIND_LABELS[it.key] || it.key)
    document.getElementById('ov-parts').innerHTML = barList(
      d.accuracyByPart.map(g => ({ key: g.key, ratio: g.accuracy, n: g.answers })), it => 'Part ' + it.key)
    document.getElementById('ov-types').innerHTML = barList(
      d.accuracyByType.map(g => ({ key: g.key, ratio: g.accuracy, n: g.answers })), it => it.key)

    document.getElementById('ov-articles').innerHTML = d.topArticles.length
      ? d.topArticles.map(a => `<tr class="hover:bg-stone-50">
          <td class="px-4 py-2.5">${escapeHtml(a.title)}</td>
          <td class="px-4 py-2.5 text-center">${a.sessions}</td>
          <td class="px-4 py-2.5 text-center">${pctText(a.avgScoreRatio)}</td></tr>`).join('')
      : '<tr><td colspan="3" class="px-4 py-6 text-center text-sm text-slate-400">No article sessions in this range</td></tr>'
  } catch (e) {
    showToast('Error: ' + e.message, 'error')
  }
}

// ---- Questions --------------------------------------------------------------

window.loadQuestions = async function() {
  const list = document.getElementById('q-list')
  list.innerHTML = loadingRow(6)
  try {
    const kind = document.getElementById('qf-kind').value
    const part = document.getElementById('qf-part').value
    const min = document.getElementById('qf-min').value || 5
    let url = `/api/performance/questions?${scope()}&minAttempts=${encodeURIComponent(min)}`
    if (kind) url += `&kind=${kind}`
    if (part) url += `&part=${part}`
    const d = await api(url)
    if (!d) return
    questionRows = d.questions
    renderQuestions()
  } catch (e) {
    list.innerHTML = errorRow(6, e)
  }
}

window.renderQuestions = function() {
  const flag = document.getElementById('qf-flag').value
  const rows = questionRows.filter(r => !flag || r.flag === flag)
  const list = document.getElementById('q-list')
  if (!rows.length) {
    list.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-slate-400">No questions match (try a longer range or lower min attempts)</td></tr>'
    return
  }
  const flagBadge = f => f === 'hard'
    ? '<span class="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Hard</span>'
    : f === 'easy' ? '<span class="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Easy</span>' : ''
  list.innerHTML = rows.map(r => {
    const q = r.question
    const text = q ? (q.text.length > 70 ? q.text.slice(0, 70) + '…' : q.text) : '(question deleted)'
    const edit = !q ? ''
      : q.source === 'cross_article_questions'
        ? '<a href="/cross-article-questions.html" class="text-xs text-amber-600 hover:text-amber-800">跨文章題目 ↗</a>'
        : `<a href="/index.html" class="text-xs text-amber-600 hover:text-amber-800" title="Article ${escapeHtml(q.articleId)}">Article Library ↗</a>`
    return `<tr class="hover:bg-stone-50">
      <td class="px-4 py-2.5">${escapeHtml(text)}</td>
      <td class="px-4 py-2.5 text-center">${q && q.part != null ? q.part : '—'}</td>
      <td class="px-4 py-2.5 text-center">${r.attempts}</td>
      <td class="px-4 py-2.5 text-center">${pctText(r.accuracy)}</td>
      <td class="px-4 py-2.5 text-center">${flagBadge(r.flag)}</td>
      <td class="px-4 py-2.5 text-right">${edit}</td></tr>`
  }).join('')
}

// ---- Students ---------------------------------------------------------------

window.debouncedStudents = function() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadStudents, 300)
}

window.loadStudents = async function() {
  const list = document.getElementById('s-list')
  list.innerHTML = loadingRow(5)
  try {
    const search = document.getElementById('sf-search').value.trim()
    const sort = document.getElementById('sf-sort').value
    const d = await api(`/api/performance/students?${scope()}&sort=${sort}&search=${encodeURIComponent(search)}`)
    if (!d) return
    if (!d.students.length) {
      list.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-slate-400">No registered students active in this range</td></tr>'
      return
    }
    list.innerHTML = d.students.map(s => `<tr class="hover:bg-stone-50 cursor-pointer" onclick="openStudent('${s.userId}')">
      <td class="px-4 py-2.5">${escapeHtml(s.displayName || s.email || s.userId)}
        <div class="text-xs text-slate-400">${escapeHtml(s.displayName ? s.email || '' : '')}${s.isPro ? ' · Pro' : ''}</div></td>
      <td class="px-4 py-2.5 text-center">${s.sessions}</td>
      <td class="px-4 py-2.5 text-center">${pctText(s.avgScoreRatio)}</td>
      <td class="px-4 py-2.5 text-center">${s.weakestPart != null ? 'Part ' + s.weakestPart : '—'}</td>
      <td class="px-4 py-2.5 text-right text-xs text-slate-500">${dateText(s.lastActive)}</td></tr>`).join('')
  } catch (e) {
    list.innerHTML = errorRow(5, e)
  }
}

// ---- Detail modal -----------------------------------------------------------

window.closeDetail = function() {
  document.getElementById('detail-modal').classList.add('hidden')
}

function openDetailShell(title, showBack) {
  document.getElementById('detail-title').textContent = title
  document.getElementById('detail-back').classList.toggle('hidden', !showBack)
  document.getElementById('detail-body').innerHTML = '<p class="text-sm text-slate-400">Loading…</p>'
  document.getElementById('detail-modal').classList.remove('hidden')
}

window.openStudent = async function(userId) {
  currentStudentId = userId
  openDetailShell('Student', false)
  try {
    const days = document.getElementById('f-days').value
    const d = await api(`/api/performance/students/${userId}?days=${days}`)
    if (!d) return
    const p = d.profile
    document.getElementById('detail-title').textContent = p.displayName || p.email || 'Student'
    const s = d.summary
    document.getElementById('detail-body').innerHTML = `
      <p class="text-xs text-slate-500 mb-3">${escapeHtml(p.email || '')}${p.isPro ? ' · Pro' : ''} · showing last ${d.days} days</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        ${kpi('Sessions', s.totalSessions, `${s.abandonedSessions} abandoned`)}
        ${kpi('Avg score', pctText(s.avgScoreRatio))}
        ${kpi('Time vs expected', pctText(s.avgTimeRatio))}
        ${kpi('Unresolved mistakes', d.unresolvedMistakes, 'all time')}
      </div>
      <div class="grid md:grid-cols-2 gap-4 mb-5">
        <div><h4 class="font-semibold text-sm mb-2">Accuracy by part</h4>${barList(d.accuracyByPart.map(g => ({ ratio: g.accuracy, n: g.answers, key: g.key })), it => 'Part ' + it.key)}</div>
        <div><h4 class="font-semibold text-sm mb-2">Accuracy by question type</h4>${barList(d.accuracyByType.map(g => ({ ratio: g.accuracy, n: g.answers, key: g.key })), it => it.key)}</div>
      </div>
      <h4 class="font-semibold text-sm mb-2">Sessions</h4>
      <div class="border border-stone-200 rounded overflow-x-auto"><table class="min-w-full text-sm">
        <thead class="bg-stone-50 text-xs text-slate-500 uppercase tracking-wider"><tr>
          <th class="px-3 py-2 text-left font-medium">Date</th><th class="px-3 py-2 text-left font-medium">Type</th>
          <th class="px-3 py-2 text-left font-medium">Article</th><th class="px-3 py-2 text-center font-medium">Score</th>
          <th class="px-3 py-2 text-center font-medium">Time</th></tr></thead>
        <tbody class="divide-y divide-stone-100">${d.sessions.map(x => `
          <tr class="hover:bg-stone-50 cursor-pointer" onclick="openSession('${x.id}')">
            <td class="px-3 py-2 text-xs text-slate-500">${dateText(x.startedAt)}</td>
            <td class="px-3 py-2">${KIND_LABELS[x.kind] || escapeHtml(x.kind)}</td>
            <td class="px-3 py-2">${escapeHtml(x.articleTitle || '—')}</td>
            <td class="px-3 py-2 text-center">${x.finishedAt ? `${x.score ?? '—'} / ${x.totalPoints ?? '—'} (${pctText(x.scoreRatio)})` : '<span class="text-xs text-slate-400">abandoned</span>'}</td>
            <td class="px-3 py-2 text-center">${secText(x.totalSeconds)}${x.expectedSeconds ? ` / ${secText(x.expectedSeconds)}` : ''}</td></tr>`).join('')}
        </tbody></table></div>`
  } catch (e) {
    document.getElementById('detail-body').innerHTML = `<p class="text-sm text-red-500">Error: ${escapeHtml(e.message)}</p>`
  }
}

window.backToStudent = function() {
  if (currentStudentId) openStudent(currentStudentId)
}

window.openSession = async function(id) {
  openDetailShell('Session review', !!currentStudentId)
  try {
    const d = await api(`/api/performance/sessions/${id}`)
    if (!d) return
    const s = d.session
    document.getElementById('detail-body').innerHTML = `
      <p class="text-xs text-slate-500 mb-4">${escapeHtml(KIND_LABELS[s.kind] || s.kind)}${s.articleTitle ? ' · ' + escapeHtml(s.articleTitle) : ''} ·
        ${dateText(s.started_at)} · score ${s.score ?? '—'} / ${s.total_points ?? '—'} (${pctText(s.scoreRatio)}) · ${secText(s.total_seconds)}</p>
      <p class="text-xs text-slate-400 mb-3">For multiple-choice questions only the result is shown: option letters are stored in each student's shuffled order and can't be matched to the stored options.</p>
      <div class="space-y-3">${d.answers.map((a, i) => renderAnswer(a, i)).join('') || '<p class="text-sm text-slate-400">No answers logged</p>'}</div>`
  } catch (e) {
    document.getElementById('detail-body').innerHTML = `<p class="text-sm text-red-500">Error: ${escapeHtml(e.message)}</p>`
  }
}

function renderAnswer(a, i) {
  const q = a.question
  const mark = a.isCorrect
    ? '<span class="text-green-600 font-semibold">✓</span>'
    : '<span class="text-red-600 font-semibold">✗</span>'
  let body = '<p class="text-sm text-slate-400">(question no longer exists)</p>'
  if (q) {
    const lines = []
    if (q.format === 'mc') {
      lines.push(`<div class="text-xs text-slate-600">Correct: ${q.correctOptionTexts.map(escapeHtml).join('、') || escapeHtml(q.correctAnswer)}</div>`)
    } else {
      lines.push(`<div class="text-xs text-slate-600">Correct: ${escapeHtml(q.correctAnswer)}</div>`)
      lines.push(`<div class="text-xs text-slate-600">Student: ${a.userAnswer ? escapeHtml(a.userAnswer) : '<span class="text-slate-400">(no answer)</span>'}</div>`)
    }
    if (q.explanation) lines.push(`<div class="text-xs text-slate-400 mt-1">${escapeHtml(q.explanation)}</div>`)
    body = `<div class="text-sm">${escapeHtml(q.text)}</div>${lines.join('')}`
  }
  return `<div class="border border-stone-200 rounded px-3 py-2 flex gap-3">
    <div class="w-6 text-xs text-slate-400 pt-0.5">${i + 1}</div>
    <div class="flex-1">${body}</div>
    <div class="text-right text-xs text-slate-500 shrink-0">${mark}<div>${a.pointsEarned ?? 0} pt</div>${q && q.part != null ? `<div class="text-slate-400">P${q.part}</div>` : ''}</div>
  </div>`
}
