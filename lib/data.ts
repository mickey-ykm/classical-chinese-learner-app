import type { Article, Quiz, Question, ArticleEntry } from "./types"
import indexData from "../data/index.json"

const ARTICLES: Record<string, Article> = {
  "wang-rong-he-jiao": require("../data/articles/wang-rong-he-jiao.json"),
  "zeng-zi-sha-zhu": require("../data/articles/zeng-zi-sha-zhu.json"),
}

const QUIZZES: Record<string, Quiz> = {
  "wang-rong-he-jiao": require("../data/quizzes/wang-rong-he-jiao.json"),
  "zeng-zi-sha-zhu": require("../data/quizzes/zeng-zi-sha-zhu.json"),
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
