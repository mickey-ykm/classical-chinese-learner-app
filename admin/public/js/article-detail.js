import { escHtml, showToast, validateArticle } from './ui.js'
import { currentArticleId, setCurrentArticleId } from './state.js'
import { loadExercises } from './exercises.js'

let adOriginal = null
let adArticleValid = false
let adQuizValid = true
export let quizPromptsCache = []

export function setQuizPromptsCache(arr) { quizPromptsCache = arr }

function setAdStatus(prefix, valid, errors) {
  const statusEl = document.getElementById(`ad-${prefix}-status`)
  const errorBox = document.getElementById(`ad-${prefix}-errors`)
  if (valid) {
    statusEl.textContent = errors.length ? '' : 'Valid'
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

export function onAdArticleInput() {
  let parsed = null
  try { parsed = JSON.parse(document.getElementById('ad-article-json').value) } catch (_) {}
  const val = document.getElementById('ad-article-json').value.trim()
  const errs = parsed ? validateArticle(parsed) : (val ? ['Invalid JSON'] : [])
  adArticleValid = !!parsed && errs.length === 0
  setAdStatus('article', adArticleValid, errs)
  updateAdSaveBtn()
}

export function onAdQuizInput() {
  adQuizValid = true
  updateAdSaveBtn()
}

export function updateAdSaveBtn() {
  let art = null
  try { art = JSON.parse(document.getElementById('ad-article-json').value) } catch (_) {}
  document.getElementById('ad-save-btn').disabled = !(adArticleValid && art)
}

export async function loadQuizPromptsCache() {
  try {
    const res = await fetch('/api/quiz-prompts')
    if (!res.ok) throw new Error('Failed to load')
    quizPromptsCache = await res.json()
  } catch (e) {
    quizPromptsCache = []
    console.error('Failed to load quiz prompts:', e)
  }
}

export function populateAdPromptSelector() {
  const sel = document.getElementById('ad-quiz-prompt-id')
  sel.innerHTML = quizPromptsCache.length
    ? quizPromptsCache.map((p) => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('')
    : '<option value="">No prompts available</option>'
  sel.onchange = () => onAdPromptChange()
  if (quizPromptsCache.length) {
    sel.value = quizPromptsCache[0].id
    onAdPromptChange()
  }
}

export function onAdPromptChange() {
  const id = document.getElementById('ad-quiz-prompt-id').value
  const p = quizPromptsCache.find((x) => x.id === id)
  document.getElementById('ad-quiz-prompt-desc').textContent = p?.description || ''
  if (p?.defaultModel && !document.getElementById('ad-quiz-model').value) {
    document.getElementById('ad-quiz-model').value = p.defaultModel
  }
}

export async function openArticleDetail(id) {
  setCurrentArticleId(id)
  adArticleValid = false
  adQuizValid = true

  document.getElementById('panel-exercises').classList.add('hidden')
  document.getElementById('panel-article-detail').classList.remove('hidden')
  document.getElementById('ad-title').textContent = '…'
  document.getElementById('ad-id').textContent = id
  document.getElementById('ad-article-json').value = 'Loading…'
  document.getElementById('ad-article-status').textContent = ''
  document.getElementById('ad-article-errors').classList.add('hidden')
  document.getElementById('ad-generate-status').classList.add('hidden')
  document.getElementById('ad-legacy-warning').classList.add('hidden')

  await loadQuizPromptsCache()
  populateAdPromptSelector()

  try {
    const res = await fetch(`/api/exercises/${encodeURIComponent(id)}`)
    if (!res.ok) throw new Error('Failed to load')
    const data = await res.json()

    adOriginal = data

    document.getElementById('ad-title').textContent = data.article.title || id
    document.getElementById('ad-article-json').value = JSON.stringify(data.article, null, 2)
    document.getElementById('ad-is-challenge').checked = !!data.isChallenge
    document.getElementById('ad-is-free').checked = !!data.isFree
    document.getElementById('ad-article-type').value = data.articleType || 'other'
    document.getElementById('ad-status').value = data.status || 'published'
    document.getElementById('ad-expected-minutes').value = data.expectedMinutes ?? ''

    if (data.level && data.level <= 3) {
      document.getElementById('ad-legacy-warning').classList.remove('hidden')
    }

    const genBtn = document.getElementById('ad-generate-quiz-btn')
    if (data.hasQuizzes) {
      genBtn.textContent = 'Re-generate Quiz'
      genBtn.dataset.hasQuiz = 'true'
    } else {
      genBtn.textContent = 'Generate Quiz'
      genBtn.dataset.hasQuiz = 'false'
    }

    setAdReadOnly(true)
    // Import lazily to avoid circular reference at module parse time
    const { loadQuestions } = await import('./questions.js')
    loadQuestions()
  } catch (e) {
    document.getElementById('ad-title').textContent = 'Error'
    document.getElementById('ad-article-json').value = 'Failed to load: ' + e.message
  }
}

export function closeArticleDetail() {
  document.getElementById('panel-article-detail').classList.add('hidden')
  document.getElementById('panel-exercises').classList.remove('hidden')
  setCurrentArticleId(null)
  adOriginal = null
  loadExercises()
}

export function setAdReadOnly(readOnly) {
  document.getElementById('ad-article-json').readOnly = readOnly
  document.getElementById('ad-is-challenge').disabled = readOnly
  document.getElementById('ad-is-free').disabled = readOnly
  document.getElementById('ad-article-type').disabled = readOnly
  document.getElementById('ad-status').disabled = readOnly
  document.getElementById('ad-expected-minutes').disabled = readOnly
  document.getElementById('ad-edit-btn').classList.toggle('hidden', !readOnly)
  document.getElementById('ad-save-btn').classList.toggle('hidden', readOnly)
  document.getElementById('ad-cancel-btn').classList.toggle('hidden', readOnly)
  document.getElementById('ad-generate-quiz-btn').disabled = readOnly
  const addQBtn = document.getElementById('ad-add-question-btn')
  if (addQBtn) addQBtn.disabled = readOnly
}

export function editArticleDetail() {
  setAdReadOnly(false)
  onAdArticleInput()
  document.getElementById('ad-article-json').focus()
}

export async function saveArticleDetail() {
  let article
  try { article = JSON.parse(document.getElementById('ad-article-json').value) }
  catch (_) { showToast('Article JSON is invalid', 'error'); return }

  const btn = document.getElementById('ad-save-btn')
  btn.disabled = true
  btn.textContent = 'Saving…'

  try {
    const expectedMinutes = parseInt(document.getElementById('ad-expected-minutes').value)
    const res = await fetch(`/api/exercises/${encodeURIComponent(currentArticleId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article,
        isChallenge: document.getElementById('ad-is-challenge').checked,
        isFree: document.getElementById('ad-is-free').checked,
        articleType: document.getElementById('ad-article-type').value || 'other',
        status: document.getElementById('ad-status').value,
        expectedMinutes: Number.isFinite(expectedMinutes) ? expectedMinutes : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const msg = (data.articleErrors || []).join('; ') || data.error
      showToast('Save failed: ' + msg, 'error')
    } else {
      showToast('Saved successfully!', 'success')
      adOriginal = {
        ...adOriginal,
        article,
        status: document.getElementById('ad-status').value,
        isChallenge: document.getElementById('ad-is-challenge').checked,
        isFree: document.getElementById('ad-is-free').checked,
        articleType: document.getElementById('ad-article-type').value || 'other',
        expectedMinutes: Number.isFinite(expectedMinutes) ? expectedMinutes : null,
      }
      document.getElementById('ad-title').textContent = article.title || currentArticleId
      setAdReadOnly(true)
    }
  } catch (e) {
    showToast('Network error: ' + e.message, 'error')
  }

  btn.textContent = 'Save'
  updateAdSaveBtn()
}

export function cancelArticleDetail() {
  setAdReadOnly(true)
  if (adOriginal) {
    document.getElementById('ad-article-json').value = JSON.stringify(adOriginal.article, null, 2)
    document.getElementById('ad-is-challenge').checked = !!adOriginal.isChallenge
    document.getElementById('ad-is-free').checked = !!adOriginal.isFree
    document.getElementById('ad-article-type').value = adOriginal.articleType || 'other'
    document.getElementById('ad-status').value = adOriginal.status || 'published'
    document.getElementById('ad-expected-minutes').value = adOriginal.expectedMinutes ?? ''
    document.getElementById('ad-article-status').textContent = ''
    document.getElementById('ad-article-errors').classList.add('hidden')
    document.getElementById('ad-generate-status').classList.add('hidden')
  }
}

export async function generateQuizForArticle() {
  const promptId = document.getElementById('ad-quiz-prompt-id').value
  const fallbackModel = quizPromptsCache.find((p) => p.id === promptId)?.defaultModel || 'qwen/qwen3.6-flash'
  const model = document.getElementById('ad-quiz-model').value.trim() || fallbackModel
  const apiKey = document.getElementById('ad-quiz-api-key').value.trim()
  if (!apiKey) { showToast('OpenRouter API key required', 'error'); return }
  if (!promptId) { showToast('Select a prompt first', 'error'); return }

  const btn = document.getElementById('ad-generate-quiz-btn')
  if (btn.dataset.hasQuiz === 'true') {
    if (!confirm('警告：重新生成測驗將覆蓋所有現有題目及答案，此操作無法復原。確定要繼續嗎？')) return
  }
  const statusEl = document.getElementById('ad-generate-status')
  btn.disabled = true
  btn.textContent = 'Generating…'
  statusEl.classList.remove('hidden')
  statusEl.textContent = '正在啟動…'

  try {
    const res = await fetch(`/api/exercises/${encodeURIComponent(currentArticleId)}/generate-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId, model, apiKey }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to start')

    const runId = data.runId
    let done = false
    while (!done) {
      await new Promise((r) => setTimeout(r, 2000))
      const sRes = await fetch(`/api/exercises/${encodeURIComponent(currentArticleId)}/generate-quiz/status/${runId}`)
      const s = await sRes.json()
      statusEl.textContent = s.step || `Status: ${s.status}`
      if (s.status === 'done') {
        showToast('Quiz generated — draft questions saved! Review in the Questions section below.', 'success')
        statusEl.textContent = '✓ Generated. Draft questions saved below — review and publish.'
        const { loadQuestions } = await import('./questions.js')
        loadQuestions(currentArticleId)
        btn.dataset.hasQuiz = 'true'
        btn.textContent = 'Re-generate Quiz'
        done = true
      } else if (s.status === 'error') {
        showToast('Generation failed: ' + s.error, 'error')
        statusEl.textContent = '✕ ' + s.error
        done = true
      }
    }
  } catch (e) {
    showToast('Generation failed: ' + e.message, 'error')
    statusEl.textContent = '✕ ' + e.message
  }

  btn.disabled = false
  btn.textContent = 'Generate Quiz'
}

window.openArticleDetail = openArticleDetail
window.closeArticleDetail = closeArticleDetail
window.editArticleDetail = editArticleDetail
window.saveArticleDetail = saveArticleDetail
window.cancelArticleDetail = cancelArticleDetail
window.onAdArticleInput = onAdArticleInput
window.onAdQuizInput = onAdQuizInput
window.generateQuizForArticle = generateQuizForArticle
