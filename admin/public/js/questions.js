import { escHtml, showToast } from './ui.js'
import { currentArticleId } from './state.js'

let questionsList = []
let editingQuestionId = null
let qmOptionKeys = ['A', 'B', 'C', 'D', 'E', 'F']

export async function loadQuestions() {
  if (!currentArticleId) return
  const loadingEl = document.getElementById('ad-questions-loading')
  const listEl = document.getElementById('ad-questions-list')
  const emptyEl = document.getElementById('ad-questions-empty')
  loadingEl.classList.remove('hidden')
  listEl.classList.add('hidden')
  emptyEl.classList.add('hidden')

  try {
    const res = await fetch(`/api/questions?articleId=${encodeURIComponent(currentArticleId)}`)
    if (!res.ok) throw new Error('Failed to load')
    questionsList = await res.json()
    loadingEl.classList.add('hidden')
    if (!questionsList.length) {
      emptyEl.classList.remove('hidden')
      return
    }
    const published = questionsList.filter(q => q.status === 'published')
    const drafts = questionsList.filter(q => q.status !== 'published')
    let html = ''
    if (published.length) {
      html += `<div class="mb-4">
        <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">已發布題目 (Published)</h4>
        <div class="flex flex-col gap-2">${published.map(q => renderQuestionCard(q)).join('')}</div>
      </div>`
    }
    if (drafts.length) {
      html += `<div>
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wide">草稿題目 (Draft)</h4>
          <div class="flex gap-2">
            <button onclick="bulkPublishDraftQuestions()"
              class="text-xs px-2.5 py-1 rounded border border-green-200 text-green-600 hover:bg-green-50 transition-colors">Publish Selected</button>
            <button onclick="bulkDeleteDraftQuestions()"
              class="text-xs px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Delete Selected</button>
          </div>
        </div>
        <div class="flex flex-col gap-2">${drafts.map(q => renderQuestionCard(q)).join('')}</div>
      </div>`
    }
    listEl.innerHTML = html
    listEl.classList.remove('hidden')
  } catch (e) {
    loadingEl.textContent = 'Failed to load questions: ' + e.message
  }
}

export async function publishQuestion(id) {
  try {
    const res = await fetch(`/api/questions/${encodeURIComponent(id)}/publish`, { method: 'PATCH' })
    if (!res.ok) throw new Error('Failed to publish')
    showToast('Question published', 'success')
    loadQuestions(currentArticleId)
  } catch (e) {
    showToast('Error: ' + e.message, 'error')
  }
}

export async function bulkDeleteDraftQuestions() {
  const checkboxes = document.querySelectorAll('.draft-q-checkbox:checked')
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id)
  if (!ids.length) { showToast('No draft questions selected', 'error'); return }
  if (!confirm(`Delete ${ids.length} selected draft question(s)? This cannot be undone.`)) return
  try {
    const res = await fetch('/api/questions/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
    if (!res.ok) throw new Error('Failed to delete')
    showToast(`Deleted ${ids.length} question(s)`, 'success')
    loadQuestions(currentArticleId)
  } catch (e) {
    showToast('Error: ' + e.message, 'error')
  }
}

export async function bulkPublishDraftQuestions() {
  const checkboxes = document.querySelectorAll('.draft-q-checkbox:checked')
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id)
  if (!ids.length) { showToast('No draft questions selected', 'error'); return }
  if (!confirm(`Publish ${ids.length} selected draft question(s)?`)) return
  try {
    const res = await fetch('/api/questions/bulk-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to publish')
    showToast(`Published ${data.published} question(s)`, 'success')
    loadQuestions(currentArticleId)
  } catch (e) {
    showToast('Error: ' + e.message, 'error')
  }
}

function renderQuestionCard(q) {
  const typeInfo = {
    'mc-single':     { label: '單選', cls: 'bg-blue-100 text-blue-700' },
    'mc-multi':      { label: '多選', cls: 'bg-purple-100 text-purple-700' },
    'true-false':    { label: '是非', cls: 'bg-green-100 text-green-700' },
    'fill-blank':    { label: '填充', cls: 'bg-orange-100 text-orange-700' },
    'sentence-order':{ label: '語序', cls: 'bg-red-100 text-red-700' },
  }[q.type] || { label: q.type, cls: 'bg-stone-100 text-stone-600' }
  const typeBadge = `<span class="text-xs font-bold px-1.5 py-0.5 rounded ${typeInfo.cls}">${escHtml(typeInfo.label)}</span>`
  const statusBadge = q.status === 'published'
    ? '<span class="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">Published</span>'
    : '<span class="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-medium">Draft</span>'

  // Question type labels (教學標籤)
  const questionTypeLabelInfo = {
    '字詞解釋': { cls: 'bg-teal-100 text-teal-700' },
    '語句背誦': { cls: 'bg-indigo-100 text-indigo-700' },
    '語句翻譯': { cls: 'bg-rose-100 text-rose-700' },
    '修辭手法': { cls: 'bg-cyan-100 text-cyan-700' },
    '內容重點': { cls: 'bg-amber-100 text-amber-700' },
  }
  const questionTypeLabels = (q.question_types || [])
    .map(label => {
      const info = questionTypeLabelInfo[label] || { cls: 'bg-stone-100 text-stone-600' }
      return `<span class="text-xs px-1.5 py-0.5 rounded ${info.cls}">${escHtml(label)}</span>`
    })
    .join('')

  const publishBtn = q.status !== 'published'
    ? `<button onclick="publishQuestion('${q.id}')"
        class="text-xs px-2.5 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 transition-colors">Publish</button>`
    : ''
  const draftCheckbox = q.status !== 'published'
    ? `<input type="checkbox" class="draft-q-checkbox w-3.5 h-3.5 accent-red-500 cursor-pointer shrink-0 mt-0.5" data-id="${q.id}" />`
    : '<span class="w-3.5 shrink-0"></span>'
  return `
    <div class="border border-stone-200 rounded-xl px-4 py-3 bg-stone-50">
      <div class="flex items-start gap-3">
        ${draftCheckbox}
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            ${typeBadge}
            <span class="text-xs text-slate-400">Part ${escHtml(String(q.part ?? 1))}</span>
            <span class="text-xs text-slate-400">${escHtml(String(q.points ?? 1))}pt</span>
            ${statusBadge}
            ${questionTypeLabels}
          </div>
          <p class="text-sm text-slate-800 leading-snug">${escHtml(q.stem || '')}</p>
          ${q.explanation ? `<p class="text-xs text-slate-400 mt-1">💡 ${escHtml(q.explanation)}</p>` : ''}
        </div>
        <div class="flex gap-1.5 shrink-0">
          ${publishBtn}
          <button onclick="openQuestionModal('${q.id}')"
            class="text-xs px-2.5 py-1 rounded border border-stone-200 hover:bg-white transition-colors">Edit</button>
          <button onclick="deleteQuestion('${q.id}')"
            class="text-xs px-2 py-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">✕</button>
        </div>
      </div>
    </div>`
}

export function onQmTypeChange() {
  const type = document.getElementById('qm-type').value
  const mcSection = document.getElementById('qm-mc-section')
  const fillSection = document.getElementById('qm-fill-section')
  const orderSection = document.getElementById('qm-order-section')
  const selectCountWrap = document.getElementById('qm-select-count-wrap')

  mcSection.classList.toggle('hidden', type === 'fill-blank' || type === 'sentence-order')
  fillSection.classList.toggle('hidden', type !== 'fill-blank')
  orderSection.classList.toggle('hidden', type !== 'sentence-order')
  selectCountWrap.classList.toggle('hidden', type !== 'mc-multi')

  if (type === 'true-false') {
    document.getElementById('qm-options-list').innerHTML = renderQmOptionRow('A', '是（True）') + renderQmOptionRow('B', '否（False）')
  } else if (type === 'mc-single' || type === 'mc-multi') {
    if (!document.getElementById('qm-options-list').children.length) {
      document.getElementById('qm-options-list').innerHTML =
        renderQmOptionRow('A') + renderQmOptionRow('B') + renderQmOptionRow('C') + renderQmOptionRow('D')
    }
  }
}

function renderQmOptionRow(key, value = '') {
  return `
    <div class="flex items-center gap-2" id="qm-opt-row-${key}">
      <span class="text-xs font-bold text-slate-500 w-4 shrink-0">${escHtml(key)}</span>
      <input type="text" id="qm-opt-${key}" value="${escHtml(value)}"
        placeholder="Option ${escHtml(key)}"
        class="flex-1 text-sm border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white" />
    </div>`
}

export function addQmOption() {
  const list = document.getElementById('qm-options-list')
  const count = list.children.length
  if (count >= 8) { showToast('Maximum 8 options', 'error'); return }
  const key = qmOptionKeys[count] || String.fromCharCode(65 + count)
  list.insertAdjacentHTML('beforeend', renderQmOptionRow(key))
}

export function openQuestionModal(id) {
  editingQuestionId = id
  document.getElementById('qm-title').textContent = id ? 'Edit Question' : 'Add Question'

  document.getElementById('qm-type').value = 'mc-single'
  document.getElementById('qm-part').value = '1'
  document.getElementById('qm-points').value = '1'
  document.getElementById('qm-status').value = 'draft'
  document.getElementById('qm-select-count').value = '1'
  document.getElementById('qm-stem').value = ''
  document.getElementById('qm-correct-answer-mc').value = ''
  document.getElementById('qm-fill-answers').value = ''
  document.getElementById('qm-order-tokens').value = ''
  document.getElementById('qm-explanation').value = ''
  document.getElementById('qm-source-excerpt').value = ''
  document.getElementById('qm-options-list').innerHTML =
    renderQmOptionRow('A') + renderQmOptionRow('B') + renderQmOptionRow('C') + renderQmOptionRow('D')
  // Clear question type checkboxes
  document.querySelectorAll('.qm-type-checkbox').forEach(cb => cb.checked = false)

  if (id) {
    const q = questionsList.find((x) => String(x.id) === String(id))
    if (!q) { showToast('Question not found', 'error'); return }
    const validTypes = ['mc-single', 'mc-multi', 'true-false', 'fill-blank', 'sentence-order']
    const resolvedType = validTypes.includes(q.type)
      ? q.type
      : (q.format === 'fill-blank' ? 'fill-blank' : q.format === 'sentence-order' ? 'sentence-order' : 'mc-single')
    document.getElementById('qm-type').value = resolvedType
    document.getElementById('qm-part').value = q.part ?? 1
    document.getElementById('qm-points').value = q.points ?? 1
    document.getElementById('qm-status').value = q.status || 'draft'
    document.getElementById('qm-select-count').value = q.select_count ?? 1
    document.getElementById('qm-stem').value = q.stem || ''
    document.getElementById('qm-explanation').value = q.explanation || ''
    document.getElementById('qm-source-excerpt').value = q.source_excerpt || ''

    // Set question type checkboxes
    const questionTypes = q.question_types || []
    document.querySelectorAll('.qm-type-checkbox').forEach(cb => {
      cb.checked = questionTypes.includes(cb.value)
    })

    if (q.format === 'mc') {
      const opts = q.options || {}
      const keys = Object.keys(opts)
      document.getElementById('qm-options-list').innerHTML = keys.map((k) => renderQmOptionRow(k, opts[k])).join('')
      document.getElementById('qm-correct-answer-mc').value = q.correct_answer || ''
    } else if (q.format === 'fill-blank') {
      document.getElementById('qm-fill-answers').value = (q.correct_answer || '').split('|').join('\n')
    } else if (q.format === 'sentence-order') {
      document.getElementById('qm-order-tokens').value = (q.correct_answer || '').split('>').join(',')
    }
  }

  onQmTypeChange()
  document.getElementById('question-modal').classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

export function closeQuestionModal() {
  document.getElementById('question-modal').classList.add('hidden')
  document.body.style.overflow = ''
  editingQuestionId = null
}

export async function saveQuestion() {
  const type = document.getElementById('qm-type').value
  const format = (type === 'fill-blank') ? 'fill-blank' : (type === 'sentence-order') ? 'sentence-order' : 'mc'
  const stem = document.getElementById('qm-stem').value.trim()
  if (!stem) { showToast('Stem is required', 'error'); return }

  let correct_answer = ''
  let options = undefined
  let sequence_tokens = undefined

  if (format === 'mc') {
    const optRows = document.getElementById('qm-options-list').querySelectorAll('input[id^="qm-opt-"]')
    options = {}
    optRows.forEach((el) => {
      const key = el.id.replace('qm-opt-', '')
      if (el.value.trim()) options[key] = el.value.trim()
    })
    correct_answer = document.getElementById('qm-correct-answer-mc').value.trim().toUpperCase()
    if (!correct_answer) { showToast('Correct answer is required', 'error'); return }
  } else if (format === 'fill-blank') {
    const lines = document.getElementById('qm-fill-answers').value.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) { showToast('At least one accepted answer is required', 'error'); return }
    correct_answer = lines.join('|')
  } else if (format === 'sentence-order') {
    const tokens = document.getElementById('qm-order-tokens').value.split(',').map((t) => t.trim()).filter(Boolean)
    if (!tokens.length) { showToast('Tokens are required', 'error'); return }
    correct_answer = tokens.join('>')
    sequence_tokens = [...tokens].sort(() => Math.random() - 0.5)
  }

  // Collect selected question type labels
  const questionTypes = Array.from(document.querySelectorAll('.qm-type-checkbox:checked')).map(cb => cb.value)

  const body = {
    article_id: currentArticleId,
    type,
    format,
    part: parseInt(document.getElementById('qm-part').value) || 1,
    points: parseInt(document.getElementById('qm-points').value) || 1,
    stem,
    options,
    correct_answer,
    select_count: parseInt(document.getElementById('qm-select-count').value) || 1,
    sequence_tokens,
    explanation: document.getElementById('qm-explanation').value.trim() || undefined,
    source_excerpt: document.getElementById('qm-source-excerpt').value.trim() || undefined,
    status: document.getElementById('qm-status').value,
    question_types: questionTypes.length > 0 ? questionTypes : undefined,
  }

  try {
    const url = editingQuestionId ? `/api/questions/${editingQuestionId}` : '/api/questions'
    const method = editingQuestionId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      showToast('Save failed: ' + (data.errors?.join('; ') || data.error), 'error')
    } else {
      showToast(editingQuestionId ? 'Question updated' : 'Question created', 'success')
      closeQuestionModal()
      loadQuestions()
    }
  } catch (e) {
    showToast('Network error: ' + e.message, 'error')
  }
}

export async function saveAndPublishQuestion() {
  // Temporarily override the status dropdown to "published"
  const statusDropdown = document.getElementById('qm-status')
  const originalStatus = statusDropdown.value
  statusDropdown.value = 'published'

  // Call the regular save function
  await saveQuestion()

  // Restore original status (in case save failed and modal stays open)
  statusDropdown.value = originalStatus
}

export async function deleteQuestion(id) {
  if (!confirm('Delete this question?')) return
  try {
    const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      showToast('Delete failed: ' + data.error, 'error')
    } else {
      showToast('Question deleted', 'success')
      loadQuestions()
    }
  } catch (e) {
    showToast('Network error: ' + e.message, 'error')
  }
}

window.loadQuestions = loadQuestions
window.publishQuestion = publishQuestion
window.bulkDeleteDraftQuestions = bulkDeleteDraftQuestions
window.bulkPublishDraftQuestions = bulkPublishDraftQuestions
window.onQmTypeChange = onQmTypeChange
window.addQmOption = addQmOption
window.openQuestionModal = openQuestionModal
window.closeQuestionModal = closeQuestionModal
window.saveQuestion = saveQuestion
window.saveAndPublishQuestion = saveAndPublishQuestion
window.deleteQuestion = deleteQuestion
window.openImportQuizModal = openImportQuizModal
window.closeImportQuizModal = closeImportQuizModal
window.confirmImportQuiz = confirmImportQuiz

// ── Import Quiz JSON modal ────────────────────────────────────────────────────

function openImportQuizModal() {
  document.getElementById('import-quiz-textarea').value = ''
  document.getElementById('import-quiz-error').classList.add('hidden')
  document.getElementById('import-quiz-confirm-btn').disabled = false
  document.getElementById('import-quiz-modal').classList.remove('hidden')
}

function closeImportQuizModal() {
  document.getElementById('import-quiz-modal').classList.add('hidden')
}

async function confirmImportQuiz() {
  const raw = document.getElementById('import-quiz-textarea').value.trim()
  const errEl = document.getElementById('import-quiz-error')
  const btn = document.getElementById('import-quiz-confirm-btn')
  errEl.classList.add('hidden')

  let quizJson
  try {
    quizJson = JSON.parse(raw)
  } catch (e) {
    errEl.textContent = 'Invalid JSON: ' + e.message
    errEl.classList.remove('hidden')
    return
  }

  btn.disabled = true
  btn.textContent = 'Importing…'

  try {
    const res = await fetch('/api/questions/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: currentArticleId, quizJson }),
    })
    const data = await res.json()
    if (!res.ok) {
      errEl.textContent = data.error || 'Import failed'
      errEl.classList.remove('hidden')
      return
    }
    closeImportQuizModal()
    showToast(`Imported ${data.imported} question${data.imported === 1 ? '' : 's'} as drafts`, 'success')
    loadQuestions()
  } catch (e) {
    errEl.textContent = 'Network error: ' + e.message
    errEl.classList.remove('hidden')
  } finally {
    btn.disabled = false
    btn.textContent = 'Import as Drafts'
  }
}
