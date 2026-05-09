// Web stub — SQLite is not available on web.
// Uses bundled seed in memory; Supabase fetch updates memory only (no persistence).
import { supabase } from "@/lib/supabase"
import type { Article, Quiz, ArticleEntry } from "@/lib/types"

const SEED_ARTICLES: Record<string, Article> = {
  "wang-rong-he-jiao":          require("../data/articles/wang-rong-he-jiao.json"),
  "zeng-zi-sha-zhu":            require("../data/articles/zeng-zi-sha-zhu.json"),
  "hua-xin-wang-lang":          require("../data/articles/hua-xin-wang-lang.json"),
  "mai-you-weng":               require("../data/articles/mai-you-weng.json"),
  "chun-ye-xi-yu":              require("../data/articles/chun-ye-xi-yu.json"),
  "da-tong-yu-xiao-kang":       require("../data/articles/da-tong-yu-xiao-kang.json"),
  "lun-yu-si-ze":               require("../data/articles/lun-yu-si-ze.json"),
  "er-zi-xue-yi":               require("../data/articles/er-zi-xue-yi.json"),
  "lou-shi-ming":               require("../data/articles/lou-shi-ming.json"),
  "mu-lan-shi-1":               require("../data/articles/mu-lan-shi-1.json"),
  "lun-si-duan":                require("../data/articles/lun-si-duan.json"),
  "ai-lian-shuo":               require("../data/articles/ai-lian-shuo.json"),
  "zou-ji-feng-qi-wang-na-jian":require("../data/articles/zou-ji-feng-qi-wang-na-jian.json"),
  "cao-gui-lun-zhan":           require("../data/articles/cao-gui-lun-zhan.json"),
  "xiao-yao-you-jie-lu":        require("../data/articles/xiao-yao-you-jie-lu.json"),
  "shi-de-xi-shan-yan-you-ji":  require("../data/articles/shi-de-xi-shan-yan-you-ji.json"),
  "lun-ren-lun-xiao-lun-jun-zi":require("../data/articles/lun-ren-lun-xiao-lun-jun-zi.json"),
  "nian-nu-jiao-chi-bi-huai-gu":require("../data/articles/nian-nu-jiao-chi-bi-huai-gu.json"),
}

const SEED_QUIZZES: Record<string, Quiz> = {
  "wang-rong-he-jiao":          require("../data/quizzes/wang-rong-he-jiao.json"),
  "zeng-zi-sha-zhu":            require("../data/quizzes/zeng-zi-sha-zhu.json"),
  "hua-xin-wang-lang":          require("../data/quizzes/hua-xin-wang-lang.json"),
  "mai-you-weng":               require("../data/quizzes/mai-you-weng.json"),
  "chun-ye-xi-yu":              require("../data/quizzes/chun-ye-xi-yu.json"),
  "da-tong-yu-xiao-kang":       require("../data/quizzes/da-tong-yu-xiao-kang.json"),
  "lun-yu-si-ze":               require("../data/quizzes/lun-yu-si-ze.json"),
  "er-zi-xue-yi":               require("../data/quizzes/er-zi-xue-yi.json"),
  "lou-shi-ming":               require("../data/quizzes/lou-shi-ming.json"),
  "mu-lan-shi-1":               require("../data/quizzes/mu-lan-shi-1.json"),
  "lun-si-duan":                require("../data/quizzes/lun-si-duan.json"),
  "ai-lian-shuo":               require("../data/quizzes/ai-lian-shuo.json"),
  "zou-ji-feng-qi-wang-na-jian":require("../data/quizzes/zou-ji-feng-qi-wang-na-jian.json"),
  "cao-gui-lun-zhan":           require("../data/quizzes/cao-gui-lun-zhan.json"),
  "xiao-yao-you-jie-lu":        require("../data/quizzes/xiao-yao-you-jie-lu.json"),
  "shi-de-xi-shan-yan-you-ji":  require("../data/quizzes/shi-de-xi-shan-yan-you-ji.json"),
  "lun-ren-lun-xiao-lun-jun-zi":require("../data/quizzes/lun-ren-lun-xiao-lun-jun-zi.json"),
  "nian-nu-jiao-chi-bi-huai-gu":require("../data/quizzes/nian-nu-jiao-chi-bi-huai-gu.json"),
}

const ARTICLE_ORDER = Object.keys(SEED_ARTICLES)

const _articles = new Map<string, Article>(Object.entries(SEED_ARTICLES))
const _quizzes = new Map<string, Quiz>(Object.entries(SEED_QUIZZES))

type ArticleMeta = { level?: number; isChallenge?: boolean }
const _meta = new Map<string, ArticleMeta>()

function buildIndexEntry(id: string): ArticleEntry | null {
  const article = _articles.get(id)
  const quiz = _quizzes.get(id)
  if (!article) return null
  const meta = _meta.get(id) ?? {}
  return {
    id: article.id,
    title: article.title,
    source: article.source ?? "",
    totalPoints: quiz?.totalPoints ?? 0,
    totalQuestions: quiz ? quiz.parts.reduce((s, p) => s + p.questions.length, 0) : 0,
    level: meta.level,
    type: meta.isChallenge ? "challenge" : undefined,
  }
}

function mapSupabaseRow(row: Record<string, unknown>): { article: Article; quiz: Quiz | null; meta: ArticleMeta } | null {
  try {
    const modernTranslation = Array.isArray(row.modern_translation)
      ? (row.modern_translation as string[])
      : [row.modern_translation as string]
    const article: Article = {
      id: row.id as string,
      title: row.title as string,
      source: (row.source as string) || undefined,
      titleFootnoteId: (row.title_footnote_id as string) || undefined,
      segments: row.segments as Article["segments"],
      footnotes: row.footnotes as Article["footnotes"],
      modernTranslation,
    }
    return {
      article,
      quiz: (row.quiz_json as Quiz | null) ?? null,
      meta: { level: (row.level as number) ?? undefined, isChallenge: !!(row.is_challenge) },
    }
  } catch {
    return null
  }
}

async function fetchAndStore(lastSyncAt: string | null): Promise<{ updated: number; errors: number }> {
  let query = supabase
    .from("articles")
    .select("id, title, source, title_footnote_id, segments, footnotes, modern_translation, level, is_challenge, quiz_json, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: true })
  if (lastSyncAt) query = query.gt("updated_at", lastSyncAt)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return { updated: 0, errors: 0 }

  let updated = 0, errors = 0
  for (const row of data) {
    const mapped = mapSupabaseRow(row as Record<string, unknown>)
    if (!mapped) { errors++; continue }
    _articles.set(row.id, mapped.article)
    if (mapped.quiz) _quizzes.set(row.id, mapped.quiz)
    _meta.set(row.id, mapped.meta)
    if (!ARTICLE_ORDER.includes(row.id)) ARTICLE_ORDER.push(row.id)
    updated++
  }
  return { updated, errors }
}

export async function init(): Promise<void> {}

export async function backgroundFetch(): Promise<void> {
  try { await fetchAndStore(null) } catch {}
}

export async function refresh(): Promise<{ updated: number; errors: number }> {
  return fetchAndStore(null)
}

export function getArticleIndex(): ArticleEntry[] {
  return ARTICLE_ORDER.flatMap((id) => {
    const e = buildIndexEntry(id)
    return e ? [e] : []
  })
}

export function getArticle(id: string): Article {
  const a = _articles.get(id)
  if (!a) throw new Error(`Article not found: ${id}`)
  return a
}

export function getQuiz(id: string): Quiz {
  const q = _quizzes.get(id)
  if (!q) throw new Error(`Quiz not found: ${id}`)
  return q
}
