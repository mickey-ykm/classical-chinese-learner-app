import { WeightTrainingProgress } from './types'
import { getWeightTrainingProgress } from './weightTraining'

let cachedProgress: WeightTrainingProgress | null = null
let lastFetchTime: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get weight training progress with in-memory caching
 */
export async function getWeightTrainingProgressCached(
  userId: string,
  forceRefresh = false
): Promise<WeightTrainingProgress> {
  const now = Date.now()

  if (!forceRefresh && cachedProgress && now - lastFetchTime < CACHE_TTL) {
    return cachedProgress
  }

  const progress = await getWeightTrainingProgress(userId)
  cachedProgress = progress
  lastFetchTime = now

  return progress
}

/**
 * Refresh weight training progress (call after completing a session)
 */
export async function refreshWeightTrainingProgress(userId: string): Promise<WeightTrainingProgress> {
  return getWeightTrainingProgressCached(userId, true)
}

/**
 * Clear cached progress
 */
export function clearWeightTrainingProgressCache(): void {
  cachedProgress = null
  lastFetchTime = 0
}
