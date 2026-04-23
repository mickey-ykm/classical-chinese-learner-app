import type { Article, Quiz, Question, ArticleEntry } from "./types"
import indexData from "../data/index.json"

const ARTICLES: Record<string, Article> = {
  "wang-rong-he-jiao": require("../data/articles/wang-rong-he-jiao.json"),
  "zeng-zi-sha-zhu": require("../data/articles/zeng-zi-sha-zhu.json"),
  "hua-xin-wang-lang": require("../data/articles/hua-xin-wang-lang.json"),
  "mai-you-weng": require("../data/articles/mai-you-weng.json"),
  "chun-ye-xi-yu": require("../data/articles/chun-ye-xi-yu.json"),
  "da-tong-yu-xiao-kang": require("../data/articles/da-tong-yu-xiao-kang.json"),
}

const QUIZZES: Record<string, Quiz> = {
  "wang-rong-he-jiao": require("../data/quizzes/wang-rong-he-jiao.json"),
  "zeng-zi-sha-zhu": require("../data/quizzes/zeng-zi-sha-zhu.json"),
  "hua-xin-wang-lang": require("../data/quizzes/hua-xin-wang-lang.json"),
  "mai-you-weng": require("../data/quizzes/mai-you-weng.json"),
  "chun-ye-xi-yu": require("../data/quizzes/chun-ye-xi-yu.json"),
  "da-tong-yu-xiao-kang": require("../data/quizzes/da-tong-yu-xiao-kang.json"),
}

export function getArticleIndex(): ArticleEntry[] {
  return indexData as ArticleEntry[]
}

export function getArticle(id: string): Article {
  const data = ARTICLES[id]
  if (!data) throw new Error(`Article not found: ${id}`)
  return data
}

export function getQuiz(id: string): Quiz {
  const data = QUIZZES[id]
  if (!data) throw new Error(`Quiz not found: ${id}`)
  return data
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
]

export function getNextQuizId(currentId: string): string | null {
  const idx = QUIZ_SEQUENCE.indexOf(currentId)
  if (idx === -1 || idx >= QUIZ_SEQUENCE.length - 1) return null
  return QUIZ_SEQUENCE[idx + 1]
}
