import { escHtml, showToast, validateArticle, validateQuiz, PANELS } from './ui.js'
import { loadExercises } from './exercises.js'

export let modelList = []
let pollTimer = null
export let rawArticlesQueue = []
let rawModalGenerateTimer = null
let rawModalArticleValid = false
let rawModalQuizValid = false
let detailRunId = null
const detailCache = {}
let sortDetailCol = -1
let sortDetailDir = 'asc'

// ── Assessment config ──────────────────────────────────────────────────────────

export async function loadAssessmentConfig() {
  try {
    const [cfgRes, artRes] = await Promise.all([
      fetch('/api/assessment/config'),
      fetch('/api/exercises'),
    ])
    const cfg = await cfgRes.json()
    const articles = await artRes.json()

    document.getElementById('translation-prompt').value = cfg.translationPrompt || ''
    document.getElementById('quiz-prompt').value = cfg.quizPrompt || ''
    renderModels(cfg.models || [])
    renderAssessmentArticles(articles)
    loadHistory()
  } catch (e) {
    showToast('Failed to load assessment config: ' + e.message, 'error')
  }
}

function renderAssessmentArticles(articles) {
  const container = document.getElementById('assessment-articles')
  if (!articles.length) {
    container.innerHTML = '<p class="text-xs text-slate-400">No articles found</p>'
    return
  }
  container.innerHTML = articles.map((a, i) => `
    <label class="flex items-start gap-2.5 cursor-pointer">
      <input type="checkbox" value="${escHtml(a.id)}" ${i < 2 ? 'checked' : ''}
        class="mt-0.5 accent-amber-600 w-3.5 h-3.5 shrink-0 cursor-pointer" />
      <div class="min-w-0">
        <p class="text-sm font-medium leading-tight">${escHtml(a.title)}</p>
        <p class="text-xs text-slate-400">${escHtml(a.id)}</p>
      </div>
    </label>
  `).join('')
}

export function renderModels(models) {
  modelList = [...models]
  const container = document.getElementById('models-list')
  if (!modelList.length) {
    container.innerHTML = '<p class="text-xs text-slate-400">No models configured</p>'
    return
  }
  container.innerHTML = modelList.map((m, i) => `
    <div class="flex gap-2 items-center">
      <input type="text" value="${escHtml(m)}"
        oninput="modelList[${i}] = this.value"
        class="flex-1 text-xs font-mono border border-stone-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-stone-50" />
      <button onclick="removeModel(${i})"
        class="shrink-0 text-slate-400 hover:text-red-500 text-xs px-1.5 py-1 rounded hover:bg-red-50 transition-colors">✕</button>
    </div>
  `).join('')
}

export function addModel() {
  modelList.push('')
  renderModels(modelList)
  const inputs = document.querySelectorAll('#models-list input[type=text]')
  if (inputs.length) inputs[inputs.length - 1].focus()
}

export function removeModel(i) {
  modelList.splice(i, 1)
  renderModels(modelList)
}

export function updateRunBtn() {
  const key = document.getElementById('openrouter-key').value.trim()
  document.getElementById('run-btn').disabled = !key
}

// ── Run assessment ─────────────────────────────────────────────────────────────

export async function saveAndRun() {
  const apiKey = document.getElementById('openrouter-key').value.trim()
  if (!apiKey) return

  const articleIds = [...document.querySelectorAll('#assessment-articles input[type=checkbox]:checked')].map(el => el.value)
  const rawArticles = rawArticlesQueue.map(item => ({ id: item.id, title: item.title, text: item.text }))

  if (!articleIds.length && !rawArticles.length) { showToast('請選擇或輸入至少一篇文章', 'error'); return }

  const models = modelList.filter(m => m.trim())
  if (!models.length) { showToast('Add at least one model', 'error'); return }

  const translationPrompt = document.getElementById('translation-prompt').value
  const quizPrompt = document.getElementById('quiz-prompt').value

  await fetch('/api/assessment/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ models, translationPrompt, quizPrompt }),
  })

  const btn = document.getElementById('run-btn')
  btn.disabled = true
  btn.textContent = 'Running…'
  document.getElementById('assessment-results').classList.add('hidden')
  document.getElementById('run-error').classList.add('hidden')
  document.getElementById('run-progress').classList.remove('hidden')
  document.getElementById('progress-bar').style.width = '0%'
  document.getElementById('progress-count').textContent = '0 / 0'
  document.getElementById('progress-task').textContent = ''

  try {
    const res = await fetch('/api/assessment/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleIds, rawArticles, models, translationPrompt, quizPrompt, apiKey }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Failed to start run')
    startPolling(body.runId)
  } catch (e) {
    document.getElementById('run-error').textContent = 'Error: ' + e.message
    document.getElementById('run-error').classList.remove('hidden')
    btn.disabled = false
    btn.textContent = 'Run Assessment'
    updateRunBtn()
  }
}

function startPolling(runId) {
  clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/assessment/status/${runId}`)
      const { status, done, total, error, currentTask } = await res.json()
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      document.getElementById('progress-bar').style.width = pct + '%'
      document.getElementById('progress-count').textContent = `${done} / ${total}`
      document.getElementById('progress-label').textContent =
        status === 'running' ? 'Running…' : status === 'done' ? 'Complete' : 'Error'
      document.getElementById('progress-task').textContent = currentTask || ''

      if (status === 'done') {
        clearInterval(pollTimer)
        renderDownloads(runId)
        document.getElementById('run-btn').disabled = false
        document.getElementById('run-btn').textContent = 'Run Assessment'
        updateRunBtn()
        showToast('Assessment complete!', 'success')
      } else if (status === 'error') {
        clearInterval(pollTimer)
        document.getElementById('run-error').textContent = 'Run failed: ' + (error || 'Unknown error')
        document.getElementById('run-error').classList.remove('hidden')
        document.getElementById('run-btn').disabled = false
        document.getElementById('run-btn').textContent = 'Run Assessment'
        updateRunBtn()
      }
    } catch (_) { /* ignore transient network errors */ }
  }, 2000)
}

function renderDownloads(runId) {
  const section = document.getElementById('assessment-results')
  section.classList.remove('hidden')
  document.getElementById('dl-summary').onclick = () => { window.location.href = `/api/assessment/download/${runId}/summary` }
  document.getElementById('dl-translations').onclick = () => { window.location.href = `/api/assessment/download/${runId}/translations` }
  document.getElementById('dl-quiz').onclick = () => { window.location.href = `/api/assessment/download/${runId}/quiz` }
  loadHistory()
}

// ── History ───────────────────────────────────────────────────────────────────

export async function loadHistory() {
  const list = document.getElementById('history-list')
  try {
    const res = await fetch('/api/assessment/history')
    const history = await res.json()
    if (!history.length) {
      list.innerHTML = '<div class="px-4 py-6 text-center text-sm text-slate-400">No assessments yet</div>'
      return
    }
    list.innerHTML = history.map((entry) => {
      const dlBtns = ['summary', 'translations', 'quiz']
        .filter((t) => entry.files[t])
        .map((t) => `<button onclick="window.location.href='/api/assessment/download/${escHtml(entry.runId)}/${t}'"
          class="text-xs px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors capitalize">${t}</button>`)
        .join('')
      const hasFiles = Object.keys(entry.files).length > 0
      return `
        <div class="px-4 py-3 flex items-center justify-between gap-4">
          <div class="min-w-0">
            <p class="text-sm font-medium">${escHtml(entry.datetime || '—')}</p>
            <p class="text-xs text-slate-400 font-mono">${escHtml(entry.runId)}</p>
          </div>
          <div class="flex gap-2 shrink-0 items-center">
            ${hasFiles ? `<button onclick="openDetail('${escHtml(entry.runId)}', '${escHtml(entry.datetime || entry.runId)}')"
              class="text-xs px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors font-medium">View</button>` : ''}
            ${dlBtns}
          </div>
        </div>`
    }).join('')
  } catch (e) {
    list.innerHTML = `<div class="px-4 py-4 text-sm text-red-500">Failed to load: ${escHtml(e.message)}</div>`
  }
}

// ── Assessment detail view ────────────────────────────────────────────────────

export function openDetail(runId, datetime) {
  detailRunId = runId
  if (!detailCache[runId]) detailCache[runId] = {}
  document.getElementById('detail-title').textContent = datetime || runId
  document.getElementById('detail-run-id').textContent = 'Run ID: ' + runId
  for (const t of ['summary', 'translations', 'quiz']) {
    document.getElementById(`detail-dl-${t}`).onclick = () => {
      window.location.href = `/api/assessment/download/${runId}/${t}`
    }
  }
  document.getElementById('panel-assessment').classList.add('hidden')
  document.getElementById('panel-detail').classList.remove('hidden')
  for (const t of PANELS) {
    document.getElementById(`tab-${t}`).className = t === 'assessment'
      ? 'tab-active px-5 pb-2.5 text-sm font-medium'
      : 'px-5 pb-2.5 text-sm font-medium text-slate-500 hover:text-slate-700'
  }
  switchDetailTab('summary')
}

export function closeDetail() {
  document.getElementById('panel-detail').classList.add('hidden')
  document.getElementById('panel-assessment').classList.remove('hidden')
}

export function switchDetailTab(type) {
  sortDetailCol = -1
  sortDetailDir = 'asc'
  for (const t of ['summary', 'translations', 'quiz']) {
    document.getElementById(`dtab-${t}`).className = t === type
      ? 'tab-active px-5 pb-2.5 text-sm font-medium'
      : 'px-5 pb-2.5 text-sm font-medium text-slate-500 hover:text-slate-700'
  }
  loadDetailTab(detailRunId, type)
}

async function loadDetailTab(runId, type) {
  const container = document.getElementById('detail-table-container')
  const countEl = document.getElementById('detail-row-count')
  if (detailCache[runId]?.[type]) {
    const { headers, rows } = detailCache[runId][type]
    renderTable(container, headers, rows)
    countEl.textContent = `${rows.length} row${rows.length !== 1 ? 's' : ''}`
    return
  }
  container.innerHTML = '<div class="px-4 py-8 text-center text-sm text-slate-400">Loading…</div>'
  countEl.textContent = ''
  try {
    const res = await fetch(`/api/assessment/data/${runId}/${type}`)
    if (!res.ok) {
      const body = await res.json()
      container.innerHTML = `<div class="px-4 py-4 text-sm text-red-500">${escHtml(body.error || 'Not found')}</div>`
      return
    }
    const { headers, rows } = await res.json()
    detailCache[runId][type] = { headers, rows }
    renderTable(container, headers, rows)
    countEl.textContent = `${rows.length} row${rows.length !== 1 ? 's' : ''}`
  } catch (e) {
    container.innerHTML = `<div class="px-4 py-4 text-sm text-red-500">Failed: ${escHtml(e.message)}</div>`
    countEl.textContent = ''
  }
}

export function sortDetailTable(col) {
  if (sortDetailCol === col) {
    sortDetailDir = sortDetailDir === 'asc' ? 'desc' : 'asc'
  } else {
    sortDetailCol = col
    sortDetailDir = 'asc'
  }
  const activeTab = document.querySelector('[id^="dtab-"].tab-active')?.id.replace('dtab-', '')
  if (!activeTab || !detailCache[detailRunId]?.[activeTab]) return
  const { headers, rows } = detailCache[detailRunId][activeTab]
  const container = document.getElementById('detail-table-container')
  renderTable(container, headers, rows)
}

function renderTable(container, headers, rows) {
  if (!headers.length) {
    container.innerHTML = '<div class="px-4 py-8 text-center text-sm text-slate-400">No data</div>'
    return
  }
  let displayRows = rows
  if (sortDetailCol >= 0 && sortDetailCol < headers.length) {
    displayRows = [...rows].sort((a, b) => {
      const av = a[sortDetailCol] ?? '', bv = b[sortDetailCol] ?? ''
      const an = parseFloat(av), bn = parseFloat(bv)
      const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : av.localeCompare(bv, undefined, { numeric: true })
      return sortDetailDir === 'asc' ? cmp : -cmp
    })
  }
  const thCells = headers.map((h, ci) => {
    const isActive = ci === sortDetailCol
    const arrow = isActive ? (sortDetailDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'
    const arrowColor = isActive ? 'text-amber-600' : 'text-slate-300'
    return `<th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 bg-stone-50 whitespace-nowrap border-r border-stone-200 last:border-r-0 sticky top-0 z-10 cursor-pointer select-none hover:bg-stone-100" onclick="sortDetailTable(${ci})">${escHtml(h)}<span class="${arrowColor} ml-0.5">${arrow}</span></th>`
  }).join('')
  const trs = displayRows.map((row, ri) => {
    const tds = headers.map((_, ci) => {
      const val = row[ci] ?? ''
      return `<td class="px-3 py-2 text-xs text-slate-700 border-r border-stone-100 last:border-r-0 max-w-[320px] align-top whitespace-pre-wrap break-words">${escHtml(val)}</td>`
    }).join('')
    return `<tr class="${ri % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'} border-b border-stone-100 last:border-b-0">${tds}</tr>`
  }).join('')
  container.innerHTML = `<table class="border-collapse min-w-max w-full">
    <thead class="border-b border-stone-200"><tr>${thCells}</tr></thead>
    <tbody>${trs}</tbody>
  </table>`
}

// ── Raw Article Modal ─────────────────────────────────────────────────────────

export function updateRawGenerateBtn() {
  const title = document.getElementById('raw-modal-title').value.trim()
  const text = document.getElementById('raw-modal-text').value.trim()
  const key = document.getElementById('raw-modal-api-key').value.trim()
  document.getElementById('raw-modal-generate-btn').disabled = !title || !text || !key
}

export function openRawArticleModal() {
  if (modelList.length) {
    const preferred = 'qwen/qwen3.6-flash'
    document.getElementById('raw-modal-model').value =
      modelList.includes(preferred) ? preferred : modelList[0]
  }
  const existingKey = document.getElementById('openrouter-key').value
  if (existingKey && !document.getElementById('raw-modal-api-key').value) {
    document.getElementById('raw-modal-api-key').value = existingKey
  }
  document.getElementById('raw-modal').classList.remove('hidden')
  document.body.style.overflow = 'hidden'
  updateRawGenerateBtn()
}

export function closeRawArticleModal() {
  document.getElementById('raw-modal').classList.add('hidden')
  document.body.style.overflow = ''
  clearInterval(rawModalGenerateTimer)
}

function setRawModalStatus(prefix, valid, errors) {
  const statusEl = document.getElementById(`raw-modal-${prefix}-status`)
  const errorBox = document.getElementById(`raw-modal-${prefix}-errors`)
  if (valid) {
    statusEl.textContent = 'Valid'
    statusEl.className = 'text-xs text-green-600'
    errorBox.classList.add('hidden')
    errorBox.innerHTML = ''
  } else if (errors.length) {
    statusEl.textContent = `${errors.length} error${errors.length > 1 ? 's' : ''}`
    statusEl.className = 'text-xs text-red-600'
    errorBox.innerHTML = errors.map((e) =>
      `<p class="text-xs text-red-600 flex items-start gap-1.5"><span class="mt-0.5 shrink-0">✕</span>${escHtml(e)}</p>`
    ).join('')
    errorBox.classList.remove('hidden')
  } else {
    statusEl.textContent = ''
    statusEl.className = 'text-xs text-slate-400'
    errorBox.classList.add('hidden')
    errorBox.innerHTML = ''
  }
}

export function onRawModalArticleInput() {
  let parsed = null
  try { parsed = JSON.parse(document.getElementById('raw-modal-article-json').value) } catch (_) {}
  const errs = parsed
    ? validateArticle(parsed)
    : document.getElementById('raw-modal-article-json').value.trim() ? ['Invalid JSON'] : []
  rawModalArticleValid = !!parsed && errs.length === 0
  setRawModalStatus('article', rawModalArticleValid, errs)
  updateRawModalActionBtns()
}

export function onRawModalQuizInput() {
  let parsed = null
  try { parsed = JSON.parse(document.getElementById('raw-modal-quiz-json').value) } catch (_) {}
  const errs = parsed
    ? validateQuiz(parsed)
    : document.getElementById('raw-modal-quiz-json').value.trim() ? ['Invalid JSON'] : []
  rawModalQuizValid = !!parsed && errs.length === 0
  setRawModalStatus('quiz', rawModalQuizValid, errs)
  updateRawModalActionBtns()
}

export function updateRawModalActionBtns() {
  let art = null, quiz = null
  try { art = JSON.parse(document.getElementById('raw-modal-article-json').value) } catch (_) {}
  try { quiz = JSON.parse(document.getElementById('raw-modal-quiz-json').value) } catch (_) {}
  const idsOk = !!(art && quiz && art.id && art.id === quiz.articleId)
  const ok = rawModalArticleValid && rawModalQuizValid && idsOk
  document.getElementById('raw-modal-add-btn').disabled = !ok
  document.getElementById('raw-modal-save-btn').disabled = !ok
}

export async function generateRawArticle() {
  const title = document.getElementById('raw-modal-title').value.trim()
  const source = document.getElementById('raw-modal-source').value.trim()
  const text = document.getElementById('raw-modal-text').value.trim()
  const footnotesText = document.getElementById('raw-modal-footnotes').value.trim()
  const model = document.getElementById('raw-modal-model').value.trim()
  const apiKey = document.getElementById('raw-modal-api-key').value.trim()

  let translationPrompt = document.getElementById('translation-prompt').value || ''
  let quizPrompt = document.getElementById('quiz-prompt').value || ''
  if (!translationPrompt || !quizPrompt) {
    try {
      const cfg = await fetch('/api/assessment/config').then(r => r.json())
      translationPrompt = cfg.translationPrompt || ''
      quizPrompt = cfg.quizPrompt || ''
      document.getElementById('translation-prompt').value = translationPrompt
      document.getElementById('quiz-prompt').value = quizPrompt
      if (!modelList.length) renderModels(cfg.models || [])
    } catch (_) {}
  }

  const btn = document.getElementById('raw-modal-generate-btn')
  btn.disabled = true
  btn.textContent = 'Generating…'
  document.getElementById('raw-modal-result').classList.add('hidden')
  document.getElementById('raw-modal-error').classList.add('hidden')
  document.getElementById('raw-modal-progress').classList.remove('hidden')
  document.getElementById('raw-modal-progress-bar').style.width = '0%'
  document.getElementById('raw-modal-progress-count').textContent = '0 / 2'
  document.getElementById('raw-modal-progress-step').textContent = ''
  document.getElementById('raw-modal-progress-label').textContent = 'Running…'

  try {
    const res = await fetch('/api/generate-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, source, text, footnotesText, model, translationPrompt, quizPrompt, apiKey }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Failed to start')
    pollRawGenerate(body.runId)
  } catch (e) {
    document.getElementById('raw-modal-error').textContent = 'Error: ' + e.message
    document.getElementById('raw-modal-error').classList.remove('hidden')
    btn.disabled = false
    btn.textContent = 'Generate Exercise'
    updateRawGenerateBtn()
  }
}

function pollRawGenerate(runId) {
  clearInterval(rawModalGenerateTimer)
  rawModalGenerateTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/generate-article/status/${runId}`)
      const { status, step, done, total, articleJson, quizJson, error } = await res.json()
      const pct = total > 0 ? Math.round(done / total * 100) : 0
      document.getElementById('raw-modal-progress-bar').style.width = pct + '%'
      document.getElementById('raw-modal-progress-count').textContent = `${done} / ${total}`
      document.getElementById('raw-modal-progress-step').textContent = step || ''
      document.getElementById('raw-modal-progress-label').textContent =
        status === 'running' ? 'Running…' : status === 'done' ? 'Complete' : 'Error'

      if (status === 'done') {
        clearInterval(rawModalGenerateTimer)
        document.getElementById('raw-modal-progress-bar').style.width = '100%'
        document.getElementById('raw-modal-article-json').value = JSON.stringify(articleJson, null, 2)
        document.getElementById('raw-modal-quiz-json').value = JSON.stringify(quizJson, null, 2)
        onRawModalArticleInput()
        onRawModalQuizInput()
        document.getElementById('raw-modal-result').classList.remove('hidden')
        document.getElementById('raw-modal-generate-btn').disabled = false
        document.getElementById('raw-modal-generate-btn').textContent = 'Generate Exercise'
        updateRawGenerateBtn()
        showToast('Generation complete!', 'success')
      } else if (status === 'error') {
        clearInterval(rawModalGenerateTimer)
        document.getElementById('raw-modal-error').textContent = 'Generation failed: ' + (error || 'Unknown error')
        document.getElementById('raw-modal-error').classList.remove('hidden')
        document.getElementById('raw-modal-generate-btn').disabled = false
        document.getElementById('raw-modal-generate-btn').textContent = 'Generate Exercise'
        updateRawGenerateBtn()
      }
    } catch (_) { /* ignore transient errors */ }
  }, 2000)
}

function renderRawQueue() {
  const container = document.getElementById('raw-articles-queue')
  if (!rawArticlesQueue.length) {
    container.innerHTML = '<p class="text-xs text-slate-400">No raw articles queued</p>'
    return
  }
  container.innerHTML = rawArticlesQueue.map((item, i) => `
    <div class="flex items-center justify-between gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
      <div class="min-w-0">
        <p class="text-xs font-medium text-amber-800 truncate">${escHtml(item.title)}</p>
        <p class="text-xs text-amber-600 font-mono">${escHtml(item.id)}</p>
      </div>
      <button onclick="removeRawArticle(${i})" class="shrink-0 text-amber-400 hover:text-red-500 text-xs px-1">✕</button>
    </div>
  `).join('')
}

export function removeRawArticle(i) {
  rawArticlesQueue.splice(i, 1)
  renderRawQueue()
}

export function addRawToAssessment() {
  let article = null
  try { article = JSON.parse(document.getElementById('raw-modal-article-json').value) } catch (_) {}
  if (!article) { showToast('Invalid article JSON', 'error'); return }

  const text = document.getElementById('raw-modal-text').value.trim()
  rawArticlesQueue.push({
    id: article.id || 'raw-' + Date.now().toString(36),
    title: article.title || document.getElementById('raw-modal-title').value.trim(),
    text,
  })
  renderRawQueue()
  closeRawArticleModal()
  showToast(`"${article.title}" added to assessment`, 'success')
}

export async function saveRawToLibrary() {
  let article, quiz
  try { article = JSON.parse(document.getElementById('raw-modal-article-json').value) }
  catch (_) { showToast('Article JSON is invalid', 'error'); return }
  try { quiz = JSON.parse(document.getElementById('raw-modal-quiz-json').value) }
  catch (_) { showToast('Quiz JSON is invalid', 'error'); return }

  const btn = document.getElementById('raw-modal-save-btn')
  btn.disabled = true
  btn.textContent = 'Saving…'

  try {
    const res = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article,
        quiz,
        isChallenge: document.getElementById('raw-modal-is-challenge').checked,
        isFree: document.getElementById('raw-modal-is-free').checked,
        level: parseInt(document.getElementById('raw-modal-level').value) || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      showToast(`Error: ${(data.articleErrors || []).concat(data.quizErrors || []).join('; ') || data.error}`, 'error')
    } else {
      showToast(`Article "${data.id}" saved to library!`, 'success')
      closeRawArticleModal()
      loadExercises()
    }
  } catch (e) {
    showToast(`Network error: ${e.message}`, 'error')
  }

  btn.textContent = 'Save to Library'
  updateRawModalActionBtns()
}

window.loadAssessmentConfig = loadAssessmentConfig
window.addModel = addModel
window.removeModel = removeModel
window.updateRunBtn = updateRunBtn
window.saveAndRun = saveAndRun
window.openDetail = openDetail
window.closeDetail = closeDetail
window.switchDetailTab = switchDetailTab
window.sortDetailTable = sortDetailTable
window.openRawArticleModal = openRawArticleModal
window.closeRawArticleModal = closeRawArticleModal
window.generateRawArticle = generateRawArticle
window.addRawToAssessment = addRawToAssessment
window.saveRawToLibrary = saveRawToLibrary
window.removeRawArticle = removeRawArticle
window.onRawModalArticleInput = onRawModalArticleInput
window.onRawModalQuizInput = onRawModalQuizInput
window.updateRawGenerateBtn = updateRawGenerateBtn
window.updateRawModalActionBtns = updateRawModalActionBtns
