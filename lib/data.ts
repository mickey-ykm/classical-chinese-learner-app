import type { Article, Quiz, Question, ArticleEntry } from "./types"
import indexData from "../data/index.json"

const ARTICLES: Record<string, Article> = {
  "wang-rong-he-jiao": require("../data/articles/wang-rong-he-jiao.json"),
  "zeng-zi-sha-zhu": require("../data/articles/zeng-zi-sha-zhu.json"),
  "hua-xin-wang-lang": require("../data/articles/hua-xin-wang-lang.json"),
  "mai-you-weng": require("../data/articles/mai-you-weng.json"),
  "chun-ye-xi-yu": require("../data/articles/chun-ye-xi-yu.json"),
  "da-tong-yu-xiao-kang": require("../data/articles/da-tong-yu-xiao-kang.json"),
  "lun-yu-si-ze": require("../data/articles/lun-yu-si-ze.json"),
  "er-zi-xue-yi": require("../data/articles/er-zi-xue-yi.json"),
  "lou-shi-ming": require("../data/articles/lou-shi-ming.json"),
  "mu-lan-shi-1": require("../data/articles/mu-lan-shi-1.json"),
  "lun-si-duan": require("../data/articles/lun-si-duan.json"),
  "ai-lian-shuo": require("../data/articles/ai-lian-shuo.json"),
  "zou-ji-feng-qi-wang-na-jian": require("../data/articles/zou-ji-feng-qi-wang-na-jian.json"),
  "cao-gui-lun-zhan": require("../data/articles/cao-gui-lun-zhan.json"),
  "xiao-yao-you-jie-lu": require("../data/articles/xiao-yao-you-jie-lu.json"),
  "shi-de-xi-shan-yan-you-ji": require("../data/articles/shi-de-xi-shan-yan-you-ji.json"),
  "lun-ren-lun-xiao-lun-jun-zi": require("../data/articles/lun-ren-lun-xiao-lun-jun-zi.json"),
  "nian-nu-jiao-chi-bi-huai-gu": require("../data/articles/nian-nu-jiao-chi-bi-huai-gu.json"),
}

const QUIZZES: Record<string, Quiz> = {
  "wang-rong-he-jiao": require("../data/quizzes/wang-rong-he-jiao.json"),
  "zeng-zi-sha-zhu": require("../data/quizzes/zeng-zi-sha-zhu.json"),
  "hua-xin-wang-lang": require("../data/quizzes/hua-xin-wang-lang.json"),
  "mai-you-weng": require("../data/quizzes/mai-you-weng.json"),
  "chun-ye-xi-yu": require("../data/quizzes/chun-ye-xi-yu.json"),
  "da-tong-yu-xiao-kang": require("../data/quizzes/da-tong-yu-xiao-kang.json"),
  "lun-yu-si-ze": require("../data/quizzes/lun-yu-si-ze.json"),
  "er-zi-xue-yi": require("../data/quizzes/er-zi-xue-yi.json"),
  "lou-shi-ming": require("../data/quizzes/lou-shi-ming.json"),
  "mu-lan-shi-1": require("../data/quizzes/mu-lan-shi-1.json"),
  "lun-si-duan": require("../data/quizzes/lun-si-duan.json"),
  "ai-lian-shuo": require("../data/quizzes/ai-lian-shuo.json"),
  "zou-ji-feng-qi-wang-na-jian": require("../data/quizzes/zou-ji-feng-qi-wang-na-jian.json"),
  "cao-gui-lun-zhan": require("../data/quizzes/cao-gui-lun-zhan.json"),
  "xiao-yao-you-jie-lu": require("../data/quizzes/xiao-yao-you-jie-lu.json"),
  "shi-de-xi-shan-yan-you-ji": require("../data/quizzes/shi-de-xi-shan-yan-you-ji.json"),
  "lun-ren-lun-xiao-lun-jun-zi": require("../data/quizzes/lun-ren-lun-xiao-lun-jun-zi.json"),
  "nian-nu-jiao-chi-bi-huai-gu": require("../data/quizzes/nian-nu-jiao-chi-bi-huai-gu.json"),
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
