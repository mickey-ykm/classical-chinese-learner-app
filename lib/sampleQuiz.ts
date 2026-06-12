import type { SampledQuizResponse } from "./types"

const ADMIN_BASE_URL =
  process.env.EXPO_PUBLIC_ADMIN_URL ?? "https://ccladmin.mickey-calligraphy.art"

export async function sampleQuiz(
  articleId: string,
  userId?: string
): Promise<SampledQuizResponse> {
  const url = new URL(`${ADMIN_BASE_URL}/api/quiz/${encodeURIComponent(articleId)}/sample`)
  if (userId) {
    url.searchParams.set("userId", userId)
  }

  const res = await fetch(url.toString())

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore parse errors — keep the HTTP status message
    }
    throw new Error(message)
  }

  return res.json() as Promise<SampledQuizResponse>
}
