import * as SQLite from "expo-sqlite"
import { supabase } from "@/lib/supabase"
import type { Article, Quiz, ArticleEntry } from "@/lib/types"

// ── Bundled seed (frozen snapshot shipped with each app release) ──────────────

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

// Order used for the article index / journey map
const ARTICLE_ORDER = Object.keys(SEED_ARTICLES)

// ── In-memory cache ───────────────────────────────────────────────────────────

type ArticleMeta = { level?: number; isChallenge?: boolean; expectedMinutes?: number; isFree?: boolean; articleType?: string }

const _articles = new Map<string, Article>()
const _quizzes = new Map<string, Quiz>()
const _meta = new Map<string, ArticleMeta>()
let _initialized = false
let _sessionFetched = false

// ── SQLite ────────────────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db
  _db = await SQLite.openDatabaseAsync("content.db")
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS content_cache (
      id TEXT PRIMARY KEY,
      article_json TEXT NOT NULL,
      quiz_json TEXT,
      meta_json TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS content_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  return _db
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildIndexEntry(id: string): ArticleEntry | null {
  const article = _articles.get(id)
  const quiz = _quizzes.get(id)
  if (!article) return null
  const meta = _meta.get(id) ?? {}
  const totalPoints = quiz?.totalPoints ?? 0
  const totalQuestions = quiz ? quiz.parts.reduce((s, p) => s + p.questions.length, 0) : 0
  return {
    id: article.id,
    title: article.title,
    source: article.source ?? "",
    totalPoints,
    totalQuestions,
    level: meta.level as ArticleEntry["level"],
    type: meta.isChallenge ? "challenge" : undefined,
    expectedMinutes: meta.expectedMinutes,
    isFree: meta.isFree,
    articleType: meta.articleType,
  }
}

function loadSeedIntoMemory() {
  for (const [id, article] of Object.entries(SEED_ARTICLES)) {
    _articles.set(id, article)
  }
  for (const [id, quiz] of Object.entries(SEED_QUIZZES)) {
    _quizzes.set(id, quiz)
  }
}

async function loadFromSQLite(): Promise<boolean> {
  const db = await getDb()
  const rows = await db.getAllAsync<{
    id: string
    article_json: string
    quiz_json: string | null
    meta_json: string | null
  }>("SELECT id, article_json, quiz_json, meta_json FROM content_cache")
  if (rows.length === 0) return false
  for (const row of rows) {
    try {
      _articles.set(row.id, JSON.parse(row.article_json))
      if (row.quiz_json) _quizzes.set(row.id, JSON.parse(row.quiz_json))
      if (row.meta_json) _meta.set(row.id, JSON.parse(row.meta_json))
      if (!ARTICLE_ORDER.includes(row.id)) ARTICLE_ORDER.push(row.id)
    } catch {
      // skip malformed rows; seed data remains in memory
    }
  }

  // Apply tombstones so seed articles that were later drafted don't resurrect
  const tombstoneRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM content_meta WHERE key = ?",
    ["removed_ids"]
  )
  if (tombstoneRow) {
    const removedIds: string[] = JSON.parse(tombstoneRow.value)
    for (const id of removedIds) {
      _articles.delete(id)
      _quizzes.delete(id)
      _meta.delete(id)
      const idx = ARTICLE_ORDER.indexOf(id)
      if (idx !== -1) ARTICLE_ORDER.splice(idx, 1)
    }
  }

  return true
}

async function seedSQLite() {
  const db = await getDb()
  for (const id of Object.keys(SEED_ARTICLES)) {
    await db.runAsync(
      "INSERT OR IGNORE INTO content_cache (id, article_json, quiz_json, meta_json, updated_at) VALUES (?, ?, ?, ?, ?)",
      [
        id,
        JSON.stringify(SEED_ARTICLES[id]),
        SEED_QUIZZES[id] ? JSON.stringify(SEED_QUIZZES[id]) : null,
        null,
        new Date(0).toISOString(),
      ]
    )
  }
}

// Maps a Supabase articles row to mobile Article + Quiz types
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
    const quiz = (row.quiz_json as Quiz | null) ?? null
    const meta: ArticleMeta = {
      level: (row.level as number) ?? undefined,
      isChallenge: (row.is_challenge as boolean) ?? false,
      expectedMinutes: (row.expected_minutes as number) ?? undefined,
      isFree: (row.is_free as boolean) ?? false,
      articleType: (row.article_type as string) ?? "other",
    }
    return { article, quiz, meta }
  } catch {
    return null
  }
}

async function fetchAndStore(lastSyncAt: string | null): Promise<{ updated: number; errors: number }> {
  let query = supabase
    .from("articles")
    .select(
      "id, title, source, title_footnote_id, segments, footnotes, modern_translation, level, is_challenge, is_free, quiz_json, expected_minutes, updated_at, status, article_type"
    )
    .order("updated_at", { ascending: true })

  if (lastSyncAt) {
    // Incremental: fetch all changed articles regardless of status so we can evict drafts
    query = query.gt("updated_at", lastSyncAt)
  } else {
    // Full sync: only fetch published articles
    query = query.eq("status", "published")
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return { updated: 0, errors: 0 }

  const db = await getDb()
  let updated = 0
  let errors = 0
  let newSyncAt = lastSyncAt

  // Load current tombstone set
  const tombstoneRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM content_meta WHERE key = ?",
    ["removed_ids"]
  )
  const removedIds = new Set<string>(tombstoneRow ? JSON.parse(tombstoneRow.value) : [])

  for (const row of data) {
    const status = (row as Record<string, unknown>).status as string

    if (status !== "published") {
      // Evict unpublished article from cache and memory
      try {
        await db.runAsync("DELETE FROM content_cache WHERE id = ?", [row.id])
        _articles.delete(row.id)
        _quizzes.delete(row.id)
        _meta.delete(row.id)
        const idx = ARTICLE_ORDER.indexOf(row.id)
        if (idx !== -1) ARTICLE_ORDER.splice(idx, 1)
        removedIds.add(row.id)
        updated++
        if (!newSyncAt || row.updated_at > newSyncAt) newSyncAt = row.updated_at
      } catch {
        errors++
      }
      continue
    }

    // Published: upsert
    const mapped = mapSupabaseRow(row as Record<string, unknown>)
    if (!mapped) { errors++; continue }
    try {
      await db.runAsync(
        "INSERT OR REPLACE INTO content_cache (id, article_json, quiz_json, meta_json, updated_at) VALUES (?, ?, ?, ?, ?)",
        [
          row.id,
          JSON.stringify(mapped.article),
          mapped.quiz ? JSON.stringify(mapped.quiz) : null,
          JSON.stringify(mapped.meta),
          row.updated_at,
        ]
      )
      _articles.set(row.id, mapped.article)
      if (mapped.quiz) _quizzes.set(row.id, mapped.quiz)
      _meta.set(row.id, mapped.meta)
      if (!ARTICLE_ORDER.includes(row.id)) ARTICLE_ORDER.push(row.id)
      removedIds.delete(row.id) // un-tombstone if re-published
      updated++
      if (!newSyncAt || row.updated_at > newSyncAt) newSyncAt = row.updated_at
    } catch {
      errors++
    }
  }

  // Always persist tombstones so seed articles don't resurrect on next launch
  await db.runAsync(
    "INSERT OR REPLACE INTO content_meta (key, value) VALUES (?, ?)",
    ["removed_ids", JSON.stringify([...removedIds])]
  )

  if (updated > 0 && newSyncAt && newSyncAt !== lastSyncAt) {
    await db.runAsync(
      "INSERT OR REPLACE INTO content_meta (key, value) VALUES (?, ?)",
      ["last_sync_at", newSyncAt]
    )
  }

  return { updated, errors }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function init(): Promise<void> {
  if (_initialized) return
  _initialized = true

  // 1. Load bundled seed into memory immediately
  loadSeedIntoMemory()

  // 2. Try to load fresher data from SQLite (from a previous session's fetch)
  const hasSQLite = await loadFromSQLite()

  // 3. If SQLite was empty, seed it so future sessions can diff-sync
  if (!hasSQLite) await seedSQLite()
}

export async function backgroundFetch(): Promise<void> {
  if (_sessionFetched) return
  _sessionFetched = true
  try {
    const db = await getDb()
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM content_meta WHERE key = ?",
      ["last_sync_at"]
    )
    await fetchAndStore(row?.value ?? null)
  } catch {
    // silent — background failure should never affect UX
  }
}

export async function refresh(): Promise<{ updated: number; errors: number }> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM content_meta WHERE key = ?",
    ["last_sync_at"]
  )
  return fetchAndStore(row?.value ?? null)
}

export async function clearCacheAndResync(): Promise<{ updated: number; errors: number }> {
  const db = await getDb()
  // Clear all cached content
  await db.execAsync("DELETE FROM content_cache; DELETE FROM content_meta;")
  // Clear in-memory cache
  _articles.clear()
  _quizzes.clear()
  _meta.clear()
  ARTICLE_ORDER.length = 0
  // Force full re-sync (no last_sync_at) — this will fetch ONLY published articles from Supabase
  const result = await fetchAndStore(null)
  // If sync returned nothing, fall back to seed data
  if (_articles.size === 0) {
    loadSeedIntoMemory()
  }
  return result
}

export function getArticleIndex(): ArticleEntry[] {
  const entries: ArticleEntry[] = []
  for (const id of ARTICLE_ORDER) {
    const entry = buildIndexEntry(id)
    if (entry) entries.push(entry)
  }
  return entries
}

export function getArticle(id: string): Article {
  const article = _articles.get(id)
  if (!article) throw new Error(`Article not found: ${id}`)
  return article
}

export function getQuiz(id: string): Quiz {
  const quiz = _quizzes.get(id)
  if (!quiz) throw new Error(`Quiz not found: ${id}`)
  return quiz
}
