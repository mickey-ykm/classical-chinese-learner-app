import { escHtml, fmtDate, showToast } from './ui.js'
import { quizPromptsCache, loadQuizPromptsCache } from './article-detail.js'

let editingPromptId = null

export async function loadQuizPrompts() {
  const tbody = document.getElementById('prompt-list')
  tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-slate-400">Loading…</td></tr>'
  await loadQuizPromptsCache()
  if (!quizPromptsCache.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-slate-400">No prompts yet</td></tr>'
    return
  }
  tbody.innerHTML = quizPromptsCache.map((p) => `
    <tr class="hover:bg-stone-50">
      <td class="px-4 py-3">
        <p class="text-sm font-medium">${escHtml(p.name)}</p>
        <p class="text-xs text-slate-400 font-mono mt-0.5">${escHtml(p.id)}</p>
      </td>
      <td class="px-4 py-3 text-xs text-slate-600 max-w-md">${escHtml(p.description || '—')}</td>
      <td class="px-4 py-3 text-xs text-slate-600 font-mono whitespace-nowrap">${escHtml(p.defaultModel || '—')}</td>
      <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">${fmtDate(p.updatedAt)}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button onclick="openQuizPromptForm('${escHtml(p.id)}')"
          class="text-xs px-3 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors">Edit</button>
        <button onclick="deleteQuizPrompt('${escHtml(p.id)}')"
          class="ml-1 text-xs px-2 py-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete">✕</button>
      </td>
    </tr>`).join('')
}

export function openQuizPromptForm(id) {
  editingPromptId = id || null
  document.getElementById('prompt-form').classList.remove('hidden')
  document.getElementById('prompt-form-title').textContent = id ? 'Edit Prompt' : 'Add Prompt'
  if (id) {
    const p = quizPromptsCache.find((x) => x.id === id)
    if (!p) { showToast('Prompt not found', 'error'); return }
    document.getElementById('prompt-form-name').value = p.name || ''
    document.getElementById('prompt-form-description').value = p.description || ''
    document.getElementById('prompt-form-default-model').value = p.defaultModel || ''
    document.getElementById('prompt-form-template').value = p.promptTemplate || ''
  } else {
    document.getElementById('prompt-form-name').value = ''
    document.getElementById('prompt-form-description').value = ''
    document.getElementById('prompt-form-default-model').value = 'qwen/qwen3.6-flash'
    document.getElementById('prompt-form-template').value = ''
  }
  document.getElementById('prompt-form-name').focus()
}

export function closeQuizPromptForm() {
  document.getElementById('prompt-form').classList.add('hidden')
  editingPromptId = null
}

export async function saveQuizPrompt() {
  const body = {
    name: document.getElementById('prompt-form-name').value.trim(),
    description: document.getElementById('prompt-form-description').value.trim(),
    defaultModel: document.getElementById('prompt-form-default-model').value.trim(),
    promptTemplate: document.getElementById('prompt-form-template').value,
  }
  if (!body.name) { showToast('Name is required', 'error'); return }
  if (!body.promptTemplate.trim()) { showToast('Prompt template is required', 'error'); return }

  const btn = document.getElementById('prompt-form-save-btn')
  btn.disabled = true
  btn.textContent = 'Saving…'
  try {
    const url = editingPromptId
      ? `/api/quiz-prompts/${encodeURIComponent(editingPromptId)}`
      : '/api/quiz-prompts'
    const res = await fetch(url, {
      method: editingPromptId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      showToast('Save failed: ' + (data.errors?.join('; ') || data.error), 'error')
    } else {
      showToast(editingPromptId ? 'Prompt updated' : 'Prompt created', 'success')
      closeQuizPromptForm()
      loadQuizPrompts()
    }
  } catch (e) {
    showToast('Network error: ' + e.message, 'error')
  }
  btn.disabled = false
  btn.textContent = 'Save'
}

export async function deleteQuizPrompt(id) {
  if (!confirm(`Delete prompt "${id}"?`)) return
  try {
    const res = await fetch(`/api/quiz-prompts/${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      showToast('Delete failed: ' + data.error, 'error')
    } else {
      showToast('Prompt deleted', 'success')
      loadQuizPrompts()
    }
  } catch (e) {
    showToast('Network error: ' + e.message, 'error')
  }
}

window.loadQuizPrompts = loadQuizPrompts
window.openQuizPromptForm = openQuizPromptForm
window.closeQuizPromptForm = closeQuizPromptForm
window.saveQuizPrompt = saveQuizPrompt
window.deleteQuizPrompt = deleteQuizPrompt
