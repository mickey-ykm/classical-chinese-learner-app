import { escHtml, fmtDate } from './ui.js'
import { showToast } from './ui.js'

export async function loadExercises() {
  const tbody = document.getElementById('exercise-list')
  tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-slate-400">Loading…</td></tr>'
  try {
    const res = await fetch('/api/exercises')
    const data = await res.json()
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-slate-400">No articles yet</td></tr>'
      return
    }
    tbody.innerHTML = data.map((ex) => {
      const status = ex.status || 'published'
      const statusBadge = status === 'published'
        ? '<span class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Published</span>'
        : '<span class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-slate-600">Draft</span>'
      const hasQuiz = ex.hasQuizzes
        ? '<span class="text-green-600 font-bold">✓</span>'
        : '<span class="text-slate-300">✗</span>'
      const challengeBadge = ex.type === 'challenge'
        ? ' <span class="shrink-0 text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">挑戰</span>'
        : ''
      return `
        <tr class="hover:bg-stone-50">
          <td class="px-4 py-3">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-medium truncate">${escHtml(ex.title)}</span>${challengeBadge}
            </div>
            <p class="text-xs text-slate-400 font-mono mt-0.5">${escHtml(ex.id)}${ex.source ? ' · ' + escHtml(ex.source) : ''}</p>
          </td>
          <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">${fmtDate(ex.createdAt)}</td>
          <td class="px-4 py-3 text-center">${hasQuiz}${ex.hasQuizzes ? `<span class="text-xs text-slate-400 ml-1">(${ex.totalQuestions}Q)</span>` : ''}</td>
          <td class="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">${({'dse-exam':'DSE考試','dse-non-exam':'DSE非考試','other':'其他'})[ex.articleType] || '—'}</td>
          <td class="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">${ex.isFree ? '<span class="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">免費</span>' : '—'}</td>
          <td class="px-4 py-3">${statusBadge}</td>
          <td class="px-4 py-3 text-right whitespace-nowrap">
            <button onclick="openArticleDetail('${escHtml(ex.id)}')"
              class="text-xs px-3 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors">Detail</button>
            <button onclick="deleteExercise('${escHtml(ex.id)}')"
              class="ml-1 text-xs px-2 py-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete">✕</button>
          </td>
        </tr>`
    }).join('')
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-4 text-sm text-red-500">Failed to load: ${escHtml(e.message)}</td></tr>`
  }
}

export async function deleteExercise(id) {
  if (!confirm(`Delete exercise "${id}"?\n\nThis will remove the JSON files and unregister the exercise.`)) return
  try {
    const res = await fetch(`/api/exercises/${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      showToast(`Error: ${data.error}`, 'error')
    } else {
      showToast(`Deleted "${id}"`, 'success')
      loadExercises()
    }
  } catch (e) {
    showToast(`Network error: ${e.message}`, 'error')
  }
}

window.loadExercises = loadExercises
window.deleteExercise = deleteExercise
