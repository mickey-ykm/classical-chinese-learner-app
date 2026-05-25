import { escHtml, showToast, validateArticle } from './ui.js'

let naGenerateTimer = null
let naArticleValid = false

export async function loadNewArticleConfig() {
  try {
    const res = await fetch('/api/assessment/config')
    const cfg = await res.json()
    const models = cfg.models || []
    const preferred = 'qwen/qwen3.6-flash'
    document.getElementById('na-model').value = models.includes(preferred) ? preferred : (models[0] || '')
    document.getElementById('na-translation-prompt').value = cfg.translationPrompt || ''
  } catch (_) { /* silent */ }
}

export function updateNaGenerateBtn() {
  const title = document.getElementById('na-title').value.trim()
  const text = document.getElementById('na-text').value.trim()
  const key = document.getElementById('na-api-key').value.trim()
  document.getElementById('na-generate-btn').disabled = !title || !text || !key
}

export async function generateArticle() {
  const title = document.getElementById('na-title').value.trim()
  const source = document.getElementById('na-source').value.trim()
  const text = document.getElementById('na-text').value.trim()
  const footnotesText = document.getElementById('na-footnotes').value.trim()
  const model = document.getElementById('na-model').value.trim()
  const translationPrompt = document.getElementById('na-translation-prompt').value
  const apiKey = document.getElementById('na-api-key').value.trim()

  const btn = document.getElementById('na-generate-btn')
  btn.disabled = true
  btn.textContent = 'Generating…'
  document.getElementById('na-result').classList.add('hidden')
  document.getElementById('na-error').classList.add('hidden')
  document.getElementById('na-progress').classList.remove('hidden')
  document.getElementById('na-progress-bar').style.width = '0%'
  document.getElementById('na-progress-count').textContent = '0 / 1'
  document.getElementById('na-progress-step').textContent = ''
  document.getElementById('na-progress-label').textContent = 'Running…'

  try {
    const res = await fetch('/api/generate-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, source, text, footnotesText, model, translationPrompt, apiKey, skipQuiz: true }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Failed to start generation')
    pollGenerate(body.runId)
  } catch (e) {
    document.getElementById('na-error').textContent = 'Error: ' + e.message
    document.getElementById('na-error').classList.remove('hidden')
    btn.disabled = false
    btn.textContent = 'Generate Article'
    updateNaGenerateBtn()
  }
}

function pollGenerate(runId) {
  clearInterval(naGenerateTimer)
  naGenerateTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/generate-article/status/${runId}`)
      const { status, step, done, total, articleJson, error } = await res.json()
      const pct = total > 0 ? Math.round(done / total * 100) : 0
      document.getElementById('na-progress-bar').style.width = pct + '%'
      document.getElementById('na-progress-count').textContent = `${done} / ${total}`
      document.getElementById('na-progress-step').textContent = step || ''
      document.getElementById('na-progress-label').textContent =
        status === 'running' ? 'Running…' : status === 'done' ? 'Complete' : 'Error'

      if (status === 'done') {
        clearInterval(naGenerateTimer)
        document.getElementById('na-progress-bar').style.width = '100%'
        document.getElementById('na-article-json').value = JSON.stringify(articleJson, null, 2)
        onNaArticleInput()
        document.getElementById('na-result').classList.remove('hidden')
        document.getElementById('na-generate-btn').disabled = false
        document.getElementById('na-generate-btn').textContent = 'Generate Article'
        updateNaGenerateBtn()
        showToast('Article generated! Review and save.', 'success')
      } else if (status === 'error') {
        clearInterval(naGenerateTimer)
        document.getElementById('na-error').textContent = 'Generation failed: ' + (error || 'Unknown error')
        document.getElementById('na-error').classList.remove('hidden')
        document.getElementById('na-generate-btn').disabled = false
        document.getElementById('na-generate-btn').textContent = 'Generate Article'
        updateNaGenerateBtn()
      }
    } catch (_) { /* ignore transient errors */ }
  }, 2000)
}

function setNaStatus(prefix, valid, errors) {
  const statusEl = document.getElementById(`na-${prefix}-status`)
  const errorBox = document.getElementById(`na-${prefix}-errors`)
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

export function onNaArticleInput() {
  let parsed = null
  try { parsed = JSON.parse(document.getElementById('na-article-json').value) } catch (_) {}
  const errs = parsed
    ? validateArticle(parsed)
    : document.getElementById('na-article-json').value.trim() ? ['Invalid JSON'] : []
  naArticleValid = !!parsed && errs.length === 0
  setNaStatus('article', naArticleValid, errs)
  updateNaSaveBtn()
}

export function updateNaSaveBtn() {
  let art = null
  try { art = JSON.parse(document.getElementById('na-article-json').value) } catch (_) {}
  document.getElementById('na-save-btn').disabled = !(naArticleValid && !!art && !!art.id)
}

export async function saveGeneratedArticle() {
  let article
  try { article = JSON.parse(document.getElementById('na-article-json').value) }
  catch (_) { showToast('Article JSON is invalid', 'error'); return }

  const btn = document.getElementById('na-save-btn')
  btn.disabled = true
  btn.textContent = 'Saving…'

  try {
    const res = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article,
        quiz: null,
        isChallenge: document.getElementById('na-is-challenge').checked,
        isFree: document.getElementById('na-is-free').checked,
        articleType: document.getElementById('na-article-type').value || 'other',
        expectedMinutes: parseInt(document.getElementById('na-expected-minutes').value) || null,
        status: 'draft',
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      showToast(`Error: ${(data.articleErrors || []).concat(data.quizErrors || []).join('; ') || data.error}`, 'error')
    } else {
      showToast(`Article "${data.id}" saved as draft! Open it in Article Library to generate a quiz.`, 'success')
      document.getElementById('na-result').classList.add('hidden')
      document.getElementById('na-article-json').value = ''
      document.getElementById('na-is-challenge').checked = false
      document.getElementById('na-is-free').checked = false
      naArticleValid = false
    }
  } catch (e) {
    showToast(`Network error: ${e.message}`, 'error')
  }

  btn.textContent = 'Save to Library'
  updateNaSaveBtn()
}

window.loadNewArticleConfig = loadNewArticleConfig
window.updateNaGenerateBtn = updateNaGenerateBtn
window.generateArticle = generateArticle
window.onNaArticleInput = onNaArticleInput
window.updateNaSaveBtn = updateNaSaveBtn
window.saveGeneratedArticle = saveGeneratedArticle
