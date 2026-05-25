export const PANELS = ['exercises', 'new-article', 'quiz-prompts', 'assessment']

let toastTimer = null

export function showToast(msg, type = 'success') {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.className = type === 'success'
    ? 'show bg-green-700 text-white'
    : 'show bg-red-700 text-white'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { el.className = type === 'success' ? 'bg-green-700 text-white' : 'bg-red-700 text-white' }, 3500)
}

export function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function fmtDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return iso
  }
}

export function levelLabel(n) {
  return ({ 1: '中一', 2: '中二', 3: '中三', 4: '中四', 5: '中五', 6: '中六', 7: '高中DSE' })[n] || '—'
}

export function validateArticle(a) {
  const errs = []
  if (!a || typeof a !== 'object') return ['Article must be a JSON object']
  if (!a.id || typeof a.id !== 'string') errs.push('Missing: id (string)')
  if (!a.title || typeof a.title !== 'string') errs.push('Missing: title (string)')
  if (!Array.isArray(a.segments) || !a.segments.length) errs.push('Missing/empty: segments[]')
  if (!Array.isArray(a.footnotes)) errs.push('Missing: footnotes[]')
  if (!Array.isArray(a.modernTranslation) || !a.modernTranslation.length)
    errs.push('Missing/empty: modernTranslation[]')
  return errs
}

export function validateQuiz(q) {
  if (!q || typeof q !== 'object') return ['Quiz must be a JSON object']
  const errs = []
  if (!q.articleId || typeof q.articleId !== 'string') errs.push('Missing: articleId (string)')
  if (typeof q.totalPoints !== 'number') errs.push('Missing/invalid: totalPoints (must be a number)')
  if (!Array.isArray(q.parts) || !q.parts.length) errs.push('Missing/empty: parts[]')
  else {
    q.parts.forEach((p, pi) => {
      if (!Array.isArray(p.questions) || !p.questions.length) {
        errs.push(`parts[${pi}]: empty questions[]`)
      } else {
        p.questions.forEach((qq, qi) => {
          const derivedFmt = qq.format
            ?? (qq.type === 'fill-blank' ? 'fill-blank'
              : qq.type === 'sentence-order' ? 'sentence-order'
              : 'mc')
          if (!qq.correctAnswer && derivedFmt === 'mc')
            errs.push(`parts[${pi}].questions[${qi}]: missing correctAnswer`)
          if (derivedFmt === 'mc') {
            const opts = qq.options
            const optCount = Array.isArray(opts) ? opts.length
              : (opts && typeof opts === 'object' ? Object.keys(opts).length : 0)
            if (optCount < 2)
              errs.push(`parts[${pi}].questions[${qi}]: needs ≥2 options`)
          }
        })
      }
    })
  }
  return errs
}
