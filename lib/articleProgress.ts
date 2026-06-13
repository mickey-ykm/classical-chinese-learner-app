/**
 * Fetches and caches per-article quiz progress for a user.
 *
 * Response shape from /api/quiz/progress:
 *   { progress: { [articleId]: { seenCount, totalInPool, attemptCount, correctRate } } }
 */

const ADMIN_BASE_URL =
  process.env.EXPO_PUBLIC_ADMIN_URL ?? "https://ccladmin.mickey-calligraphy.art"

export interface ArticleProgress {
  seenCount: number
  totalInPool: number
  attemptCount: number
  correctRate: number // 0–100
}

export type ArticleProgressMap = Record<string, ArticleProgress>

let cachedUserId: string | null = null
let cachedProgress: ArticleProgressMap = {}

/**
 * Fetch progress for all articles for the given user.
 * Results are cached in-memory for the session; pass `force = true` to bypass.
 */
export async function fetchArticleProgress(
  userId: string,
  force = false
): Promise<ArticleProgressMap> {
  if (!force && cachedUserId === userId && Object.keys(cachedProgress).length > 0) {
    return cachedProgress
  }

  try {
    const url = `${ADMIN_BASE_URL}/api/quiz/progress?userId=${encodeURIComponent(userId)}`
    const res = await fetch(url)
    if (!res.ok) return {}
    const body = await res.json()
    cachedUserId = userId
    cachedProgress = (body?.progress ?? {}) as ArticleProgressMap
    return cachedProgress
  } catch {
    return {}
  }
}

/** Clear the cache (call after a quiz is completed to force a refresh). */
export function invalidateArticleProgress() {
  cachedUserId = null
  cachedProgress = {}
}
