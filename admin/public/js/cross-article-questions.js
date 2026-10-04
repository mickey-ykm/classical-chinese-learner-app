let questionsList = []
let editingQuestionId = null
let articlesList = []

// Load questions on page load
window.addEventListener('DOMContentLoaded', () => {
  loadArticles()
  loadQuestions()
})

// Sign out
window.signOut = async function() {
  await fetch('/api/admin/logout', { method: 'POST' })
  window.location.href = '/login.html'
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.className = type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 3000)
}

// Load articles for checkbox selection
async function loadArticles() {
  try {
    const res = await fetch('/api/exercises')
    if (!res.ok) throw new Error('Failed to load articles')
    const data = await res.json()
    articlesList = data
    const container = document.getElementById('qm-articles-checkboxes')
    document.getElementById('import-article-ref').innerHTML = data.map(a =>
      `<div><span class="text-slate-800">${escapeHtml(String(a.id))}</span> <span class="text-slate-400 font-sans">${escapeHtml(a.title)}</span></div>`
    ).join('')
    container.innerHTML = data.map(a =>
      `<label class="flex items-center gap-2 text-sm hover:bg-stone-50 px-2 py-1 rounded cursor-pointer">
        <input type="checkbox" value="${a.id}" class="article-checkbox w-4 h-4 accent-amber-500" />
        <span class="flex-1">${escapeHtml(a.title)}</span>
        <span class="text-xs text-slate-400">${a.articleType || 'other'}</span>
      </label>`
    ).join('')
  } catch (e) {
    console.error('Failed to load articles:', e)
  }
}

// Load questions with filters
window.loadQuestions = async function() {
  const status = document.getElementById('filter-status').value
  const part = document.getElementById('filter-part').value
  const listEl = document.getElementById('questions-list')
  listEl.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-sm text-slate-400">Loading…</td></tr>'

  try {
    let url = '/api/cross-article-questions?'
    if (status) url += `status=${status}&`
    if (part) url += `part=${part}&`

    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to load')
    questionsList = await res.json()

    if (!questionsList.length) {
      listEl.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-sm text-slate-400">No questions found</td></tr>'
      return
    }

    listEl.innerHTML = questionsList.map(q => renderQuestionRow(q)).join('')
    updateBulkActions()
  } catch (e) {
    listEl.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-sm text-red-500">Error: ${escapeHtml(e.message)}</td></tr>`
  }
}

// Render question row
function renderQuestionRow(q) {
  const formatLabels = {
    'mc': 'MC',
    'fill-blank': 'Fill',
    'sentence-order': 'Order'
  }
  const statusBadge = q.status === 'published'
    ? '<span class="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Published</span>'
    : '<span class="text-xs px-2 py-1 rounded bg-stone-100 text-stone-600">Draft</span>'

  const checkbox = q.status === 'draft'
    ? `<input type="checkbox" class="question-checkbox w-3.5 h-3.5" data-id="${q.id}" onchange="updateBulkActions()" />`
    : ''

  const questionPreview = q.questionText.length > 60
    ? escapeHtml(q.questionText.substring(0, 60)) + '...'
    : escapeHtml(q.questionText)

  return `
    <tr class="hover:bg-stone-50">
      <td class="px-4 py-3">${checkbox}</td>
      <td class="px-4 py-3">
        <div class="text-sm">${questionPreview}</div>
      </td>
      <td class="px-4 py-3 text-center">
        <span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Part ${q.part}</span>
      </td>
      <td class="px-4 py-3 text-center">
        <span class="text-xs">${formatLabels[q.format] || q.format}</span>
      </td>
      <td class="px-4 py-3 text-center">
        <span class="text-xs text-slate-600">${q.relatedArticleCount || 0} articles</span>
      </td>
      <td class="px-4 py-3 text-center">${statusBadge}</td>
      <td class="px-4 py-3 text-right">
        <button onclick="openQuestionModal('${q.id}')" class="text-xs text-amber-600 hover:text-amber-800 mr-2">Edit</button>
        ${q.status === 'draft' ? `<button onclick="deleteQuestion('${q.id}')" class="text-xs text-red-600 hover:text-red-800">Delete</button>` : ''}
      </td>
    </tr>
  `
}

// Update bulk actions visibility
window.updateBulkActions = function() {
  const checkboxes = document.querySelectorAll('.question-checkbox:checked')
  const bulkActions = document.getElementById('bulk-actions')
  const count = document.getElementById('selected-count')

  if (checkboxes.length > 0) {
    bulkActions.classList.remove('hidden')
    count.textContent = checkboxes.length
  } else {
    bulkActions.classList.add('hidden')
  }
}

// Toggle select all
window.toggleSelectAll = function() {
  const selectAll = document.getElementById('select-all')
  const checkboxes = document.querySelectorAll('.question-checkbox')
  checkboxes.forEach(cb => cb.checked = selectAll.checked)
  updateBulkActions()
}

// Open question modal
window.openQuestionModal = async function(id = null) {
  editingQuestionId = id
  const modal = document.getElementById('question-modal')
  const title = document.getElementById('modal-title')

  // Reset form
  document.getElementById('qm-text').value = ''
  document.getElementById('qm-format').value = 'mc'
  document.getElementById('qm-part').value = '7'
  document.getElementById('qm-correct-answer').value = ''
  document.getElementById('qm-explanation').value = ''
  document.getElementById('qm-status').value = 'draft'
  document.getElementById('qm-select-count').value = '1'
  document.querySelectorAll('.qm-type-checkbox').forEach(cb => cb.checked = false)

  // Clear article selection
  document.querySelectorAll('.article-checkbox').forEach(cb => cb.checked = false)

  if (id) {
    title.textContent = 'Edit Question'
    try {
      const res = await fetch(`/api/cross-article-questions/${id}`)
      if (!res.ok) throw new Error('Failed to load question')
      const q = await res.json()

      document.getElementById('qm-text').value = q.questionText
      document.getElementById('qm-format').value = q.format
      document.getElementById('qm-part').value = q.part
      document.getElementById('qm-correct-answer').value = q.correctAnswer
      document.getElementById('qm-explanation').value = q.explanation || ''
      document.getElementById('qm-status').value = q.status

      if (q.format === 'mc') {
        document.getElementById('qm-select-count').value = q.selectCount || 1
        // Populate options
        clearOptions()
        ;(q.options || []).forEach(opt => addOption(opt))
      }

      // Select related articles
      if (q.relatedArticles) {
        q.relatedArticles.forEach(a => {
          const checkbox = document.querySelector(`.article-checkbox[value="${a.id}"]`)
          if (checkbox) checkbox.checked = true
        })
      }

      // Set question type checkboxes
      if (q.questionTypes) {
        q.questionTypes.forEach(type => {
          const checkbox = document.querySelector(`.qm-type-checkbox[value="${type}"]`)
          if (checkbox) checkbox.checked = true
        })
      }
    } catch (e) {
      showToast('Error loading question: ' + e.message, 'error')
      return
    }
  } else {
    title.textContent = 'New Question'
    clearOptions()
    addOption()
    addOption()
  }

  updateFormatFields()
  modal.classList.remove('hidden')
}

// Close modal
window.closeModal = function() {
  document.getElementById('question-modal').classList.add('hidden')
  editingQuestionId = null
}

// Update format-specific fields
window.updateFormatFields = function() {
  const format = document.getElementById('qm-format').value
  const mcSection = document.getElementById('mc-options-section')
  const answerHint = document.getElementById('answer-hint')

  if (format === 'mc') {
    mcSection.classList.remove('hidden')
    answerHint.textContent = 'For MC: enter key(s) like "A" or "A,C".'
  } else {
    mcSection.classList.add('hidden')
    if (format === 'fill-blank') {
      answerHint.textContent = 'For fill-blank: enter the correct answer text.'
    } else if (format === 'sentence-order') {
      answerHint.textContent = 'For sentence-order: enter sequence like "C,A,B,D".'
    }
  }
}

// MC Options management
function clearOptions() {
  document.getElementById('mc-options-list').innerHTML = ''
}

window.addOption = function(text = '') {
  const list = document.getElementById('mc-options-list')
  const idx = list.children.length
  const key = String.fromCharCode(65 + idx) // A, B, C...
  const div = document.createElement('div')
  div.className = 'flex items-center gap-2'
  div.innerHTML = `
    <span class="text-sm font-medium text-slate-600 w-6">${key}:</span>
    <input type="text" class="mc-option-input flex-1 border border-stone-300 rounded px-2 py-1 text-sm" value="${escapeHtml(text)}" placeholder="Option ${key}" />
    <button onclick="removeOption(this)" class="text-red-500 hover:text-red-700 text-sm">Remove</button>
  `
  list.appendChild(div)
}

window.removeOption = function(btn) {
  btn.parentElement.remove()
}

// Save question
window.saveQuestion = async function() {
  const questionData = collectQuestionData()
  if (!questionData) return

  try {
    const url = editingQuestionId
      ? `/api/cross-article-questions/${editingQuestionId}`
      : '/api/cross-article-questions'
    const method = editingQuestionId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questionData)
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save')

    showToast(editingQuestionId ? 'Question updated' : 'Question created', 'success')
    closeModal()
    loadQuestions()
  } catch (e) {
    showToast('Error: ' + e.message, 'error')
  }
}

// Save and publish
window.saveAndPublish = async function() {
  // Temporarily set status to published
  const originalStatus = document.getElementById('qm-status').value
  document.getElementById('qm-status').value = 'published'
  await saveQuestion()
  document.getElementById('qm-status').value = originalStatus
}

// Collect question data from form
function collectQuestionData() {
  const questionText = document.getElementById('qm-text').value.trim()
  const format = document.getElementById('qm-format').value
  const part = parseInt(document.getElementById('qm-part').value, 10)
  const correctAnswer = document.getElementById('qm-correct-answer').value.trim()
  const explanation = document.getElementById('qm-explanation').value.trim()
  const status = document.getElementById('qm-status').value

  // Get selected articles from checkboxes
  const selectedCheckboxes = document.querySelectorAll('.article-checkbox:checked')
  const relatedArticleIds = Array.from(selectedCheckboxes).map(cb => cb.value)

  // Validation
  if (!questionText) { showToast('Question text is required', 'error'); return null }
  if (!correctAnswer) { showToast('Correct answer is required', 'error'); return null }
  if (relatedArticleIds.length === 0) { showToast('At least one related article is required', 'error'); return null }

  const data = {
    questionText,
    format,
    part,
    correctAnswer,
    explanation,
    status,
    relatedArticleIds,
  }

  // Format-specific fields
  if (format === 'mc') {
    const optionInputs = document.querySelectorAll('.mc-option-input')
    data.options = Array.from(optionInputs).map(input => input.value.trim()).filter(v => v)
    data.selectCount = parseInt(document.getElementById('qm-select-count').value, 10)

    if (data.options.length < 2) {
      showToast('MC questions need at least 2 options', 'error')
      return null
    }
  }

  // Question types
  const questionTypes = Array.from(document.querySelectorAll('.qm-type-checkbox:checked')).map(cb => cb.value)
  if (questionTypes.length > 0) {
    data.questionTypes = questionTypes
  }

  return data
}

// Delete question
window.deleteQuestion = async function(id) {
  if (!confirm('Delete this question? This cannot be undone.')) return

  try {
    const res = await fetch(`/api/cross-article-questions/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete')
    showToast('Question deleted', 'success')
    loadQuestions()
  } catch (e) {
    showToast('Error: ' + e.message, 'error')
  }
}

// Bulk publish
window.bulkPublish = async function() {
  const checkboxes = document.querySelectorAll('.question-checkbox:checked')
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id)

  if (!ids.length) { showToast('No questions selected', 'error'); return }
  if (!confirm(`Publish ${ids.length} question(s)?`)) return

  try {
    const res = await fetch('/api/cross-article-questions/bulk-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to publish')
    showToast(`Published ${data.published} question(s)`, 'success')
    loadQuestions()
  } catch (e) {
    showToast('Error: ' + e.message, 'error')
  }
}

// Bulk delete
window.bulkDelete = async function() {
  const checkboxes = document.querySelectorAll('.question-checkbox:checked')
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id)

  if (!ids.length) { showToast('No questions selected', 'error'); return }
  if (!confirm(`Delete ${ids.length} question(s)? This cannot be undone.`)) return

  try {
    const res = await fetch('/api/cross-article-questions/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to delete')
    showToast(`Deleted ${data.deleted} question(s)`, 'success')
    loadQuestions()
  } catch (e) {
    showToast('Error: ' + e.message, 'error')
  }
}

// ---- Batch import ----
let importedIds = []

window.openImportModal = function() {
  document.getElementById('import-json').value = ''
  document.getElementById('import-file').value = ''
  importedIds = []
  showImportResult(null)
  document.getElementById('import-submit-btn').classList.remove('hidden')
  document.getElementById('import-publish-btn').classList.add('hidden')
  document.getElementById('import-modal').classList.remove('hidden')
}

window.closeImportModal = function() {
  document.getElementById('import-modal').classList.add('hidden')
}

window.loadImportFile = function(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { document.getElementById('import-json').value = reader.result }
  reader.readAsText(file)
}

function showImportResult(html, kind = 'info') {
  const el = document.getElementById('import-result')
  if (!html) { el.classList.add('hidden'); return }
  const styles = {
    info: 'bg-stone-50 border-stone-200 text-slate-700',
    ok: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warn: 'bg-amber-50 border-amber-200 text-amber-800',
  }
  el.className = `text-sm rounded border px-3 py-2 ${styles[kind]}`
  el.innerHTML = html
}

// Parse the textarea with JS. Returns the questions array, or null after showing the error.
function parseImportJson() {
  const text = document.getElementById('import-json').value.trim()
  if (!text) { showImportResult('Paste some JSON first.', 'error'); return null }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    showImportResult(`<b>Invalid JSON:</b> ${escapeHtml(e.message)}`, 'error')
    return null
  }
  const questions = Array.isArray(parsed) ? parsed : parsed && parsed.questions
  if (!Array.isArray(questions) || questions.length === 0) {
    showImportResult('JSON must be a non-empty array of questions, or an object with a <code>questions</code> array.', 'error')
    return null
  }
  return questions
}

async function postImport(questions, opts) {
  const res = await fetch('/api/cross-article-questions/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions, ...opts })
  })
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

function renderValidationErrors(data) {
  const rows = (data.errors || []).map(e =>
    `<li>Question #${e.index + 1}: ${e.errors.map(escapeHtml).join('; ')}</li>`).join('')
  showImportResult(`<b>${escapeHtml(data.error || 'Validation failed')}</b><ul class="list-disc ml-5 mt-1 text-xs">${rows}</ul>`, 'error')
}

function describeDuplicates(dups) {
  return dups.map(d => {
    const where = d.existingId ? 'already in database' : `repeats question #${d.duplicateOfIndex + 1} in this batch`
    return `#${d.index + 1} (Part ${d.part}) "${d.questionText.slice(0, 30)}${d.questionText.length > 30 ? '…' : ''}" – ${where}`
  })
}

window.validateImport = async function() {
  const questions = parseImportJson()
  if (!questions) return
  try {
    const { res, data } = await postImport(questions, { dryRun: true })
    if (res.status === 400 && data.errors) return renderValidationErrors(data)
    if (!res.ok) throw new Error(data.error || 'Validation failed')
    let html = `<b>Valid:</b> ${data.count} question(s) ready to import as drafts.`
    let kind = 'ok'
    if (data.duplicates.length) {
      kind = 'warn'
      html += `<div class="mt-1 text-xs">Warning: ${data.duplicates.length} possible duplicate(s):<ul class="list-disc ml-5">${describeDuplicates(data.duplicates).map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul></div>`
    }
    showImportResult(html, kind)
  } catch (e) {
    showImportResult('Error: ' + escapeHtml(e.message), 'error')
  }
}

window.submitImport = async function() {
  const questions = parseImportJson()
  if (!questions) return
  try {
    // Validate first; surfaces errors and duplicates before anything is written
    const check = await postImport(questions, { dryRun: true })
    if (check.res.status === 400 && check.data.errors) return renderValidationErrors(check.data)
    if (!check.res.ok) throw new Error(check.data.error || 'Validation failed')

    let allowDuplicates = false
    if (check.data.duplicates.length) {
      const msg = `${check.data.duplicates.length} question(s) look like duplicates:\n\n` +
        describeDuplicates(check.data.duplicates).join('\n') +
        '\n\nImport anyway?'
      if (!confirm(msg)) { showImportResult('Import cancelled.', 'info'); return }
      allowDuplicates = true
    }

    const { res, data } = await postImport(questions, { allowDuplicates })
    if (res.status === 400 && data.errors) return renderValidationErrors(data)
    if (!res.ok) throw new Error(data.error || 'Import failed')

    importedIds = data.ids
    showImportResult(`<b>Imported ${data.imported} question(s) as drafts.</b> Publish them now, or review them in the list first.`, 'ok')
    document.getElementById('import-submit-btn').classList.add('hidden')
    document.getElementById('import-publish-btn').classList.remove('hidden')
    showToast(`Imported ${data.imported} draft(s)`, 'success')
    loadQuestions()
  } catch (e) {
    showImportResult('Error: ' + escapeHtml(e.message), 'error')
  }
}

window.publishImported = async function() {
  if (!importedIds.length) return
  if (!confirm(`Publish ${importedIds.length} imported question(s)? They will be served in weight training.`)) return
  try {
    const res = await fetch('/api/cross-article-questions/bulk-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: importedIds })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to publish')
    showToast(`Published ${data.published} question(s)`, 'success')
    closeImportModal()
    loadQuestions()
  } catch (e) {
    showImportResult('Error: ' + escapeHtml(e.message), 'error')
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
