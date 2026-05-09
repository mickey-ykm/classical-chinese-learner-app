import type { Article, Quiz, Question, ArticleEntry } from "./types"
import { getArticleIndex as _getIndex, getArticle as _getArticle, getQuiz as _getQuiz } from "./contentStore"

export function getArticleIndex(): ArticleEntry[] {
  return _getIndex()
}

export function getArticle(id: string): Article {
  return _getArticle(id)
}

export function getQuiz(id: string): Quiz {
  return _getQuiz(id)
}

export function getAllQuestions(id: string): Question[] {
  return getQuiz(id).parts.flatMap((p) => p.questions)
}

export function getPartTitles(id: string): Record<number, string> {
  return Object.fromEntries(getQuiz(id).parts.map((p) => [p.part, p.title]))
}

export const QUIZ_SEQUENCE = [
  "wang-rong-he-jiao",
  "zeng-zi-sha-zhu",
  "hua-xin-wang-lang",
  "mai-you-weng",
  "chun-ye-xi-yu",
  "da-tong-yu-xiao-kang",
  "lun-yu-si-ze",
  "er-zi-xue-yi",
  "lou-shi-ming",
  "mu-lan-shi-1",
  "lun-si-duan",
  "ai-lian-shuo",
  "zou-ji-feng-qi-wang-na-jian",
  "cao-gui-lun-zhan",
  "xiao-yao-you-jie-lu",
  "shi-de-xi-shan-yan-you-ji",
  "lun-ren-lun-xiao-lun-jun-zi",
  "nian-nu-jiao-chi-bi-huai-gu",
]

export function getNextQuizId(currentId: string): string | null {
  const idx = QUIZ_SEQUENCE.indexOf(currentId)
  if (idx === -1 || idx >= QUIZ_SEQUENCE.length - 1) return null
  return QUIZ_SEQUENCE[idx + 1]
}
