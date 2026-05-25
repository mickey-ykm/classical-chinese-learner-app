import { PANELS } from './ui.js'
import { loadExercises } from './exercises.js'
import { loadAssessmentConfig } from './assessment.js'
import { loadNewArticleConfig } from './generate-article.js'
import { loadQuizPrompts } from './prompts.js'

// Import all modules to register their window.* exports
import './article-detail.js'
import './questions.js'

let assessmentTabLoaded = false
let newArticleTabLoaded = false
let quizPromptsTabLoaded = false

export function showTab(name) {
  for (const t of PANELS) {
    document.getElementById(`panel-${t}`).classList.toggle('hidden', t !== name)
    document.getElementById(`tab-${t}`).className = t === name
      ? 'tab-active px-5 pb-2.5 text-sm font-medium'
      : 'px-5 pb-2.5 text-sm font-medium text-slate-500 hover:text-slate-700'
  }
  document.getElementById('panel-detail').classList.add('hidden')
  document.getElementById('panel-article-detail').classList.add('hidden')
  if (name === 'exercises') {
    document.getElementById('panel-exercises').classList.remove('hidden')
  }
  if (name === 'assessment' && !assessmentTabLoaded) {
    assessmentTabLoaded = true
    loadAssessmentConfig()
  }
  if (name === 'new-article' && !newArticleTabLoaded) {
    newArticleTabLoaded = true
    loadNewArticleConfig()
  }
  if (name === 'quiz-prompts' && !quizPromptsTabLoaded) {
    quizPromptsTabLoaded = true
    loadQuizPrompts()
  }
}

export async function signOut() {
  await fetch('/api/admin/logout', { method: 'POST' })
  window.location.href = '/login.html'
}

window.showTab = showTab
window.signOut = signOut

// ── Init ──────────────────────────────────────────────────────────────────────

fetch('/api/admin/me').then(r => r.json()).then(d => {
  if (d.email) document.getElementById('adminEmail').textContent = d.email
})

loadExercises()
assessmentTabLoaded = true
loadAssessmentConfig()
