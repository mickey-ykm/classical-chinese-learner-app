import { CrossArticleQuestion, WeightTrainingProgress, ExerciseAnswer } from './types'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ccladmin.mickey-calligraphy.art'

/**
 * Sample 10 weight training questions (5 from part 7, 5 from part 8)
 */
export async function sampleWeightTraining(userId?: string): Promise<CrossArticleQuestion[]> {
  const url = userId
    ? `${API_URL}/api/quiz/weight-training/sample?userId=${encodeURIComponent(userId)}`
    : `${API_URL}/api/quiz/weight-training/sample`

  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to sample questions' }))
    throw new Error(`${error.error || 'Failed to sample weight training questions'} (URL: ${url})`)
  }

  return response.json()
}

/**
 * Get weight training progress for a user
 */
export async function getWeightTrainingProgress(userId: string): Promise<WeightTrainingProgress> {
  const url = `${API_URL}/api/quiz/weight-training/progress?userId=${encodeURIComponent(userId)}`

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get progress' }))
    throw new Error(`${error.error || 'Failed to get weight training progress'} (URL: ${url})`)
  }

  return response.json()
}

/**
 * Save a completed weight training session with answers
 */
export async function saveWeightTrainingSession(
  userId: string,
  score: number,
  totalQuestions: number,
  answers: ExerciseAnswer[]
): Promise<{ sessionId: string }> {
  const response = await fetch(`${API_URL}/api/quiz/weight-training/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      score,
      totalQuestions,
      answers,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to save session' }))
    throw new Error(error.error || 'Failed to save weight training session')
  }

  return response.json()
}
