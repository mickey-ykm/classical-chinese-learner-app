export interface Footnote {
  id: string
  marker: string
  term: string
  explanation: string
}

export interface ArticleSegment {
  text: string
  footnoteId?: string
}

export interface Article {
  id: string
  title: string
  titleFootnoteId?: string
  source?: string
  segments: ArticleSegment[]
  footnotes: Footnote[]
  modernTranslation: string[]
}

export type OptionKey = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"

export type QuestionFormat = "mc" | "fill-blank" | "sentence-order"

export interface QuizOption {
  key: OptionKey
  text: string
}

export interface Question {
  id: string | number  // UUID string for Supabase-sourced questions; number for legacy bundled data
  articleId?: string  // Article this question belongs to (for multi-article quizzes)
  part: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  points: number
  stem: string
  format?: QuestionFormat
  options: QuizOption[]
  correctAnswer: string  // OptionKey for mc; comma-sep keys for mc-multi; >-sep tokens for sentence-order
  selectCount?: number   // how many options to select (1 = single, >1 = multi)
  sequenceTokens?: string[]  // shuffled tokens for sentence-order
  explanation?: string
  questionTypes?: string[]  // Question type labels: 字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點
  relatedArticleIds?: string[]  // For weight-training cross-article questions
}

export interface QuizAnswer {
  questionId: string | number
  selectedOption: string | null  // OptionKey | comma-sep keys | null for fill-blank/sentence-order
  isCorrect: boolean
  pointsEarned?: number
}

export interface QuizPart {
  part: 1 | 2 | 3 | 4 | 5 | 6
  title: string
  pointsPerQuestion: number
  questions: Question[]
}

export interface Quiz {
  articleId: string
  totalPoints: number
  parts: QuizPart[]
}

export interface ArticleEntry {
  id: string
  title: string
  source: string
  totalPoints: number
  totalQuestions: number
  type?: "challenge"
  level?: 1 | 2 | 3 | 4 | 5 | 6 | 7
  expectedMinutes?: number
  isFree?: boolean
  articleType?: string
}

export interface PoolProgress {
  totalInPool: number
  seenCount: number
  attemptNumber: number
  estimatedAttemptsToComplete: number
}

export interface SampledQuizResponse {
  articleId: string
  totalQuestions: number
  poolProgress: PoolProgress
  questions: Question[]
}

// Weight Training Types
export interface CrossArticleQuestion {
  id: string
  questionText: string
  format: QuestionFormat
  part: 7 | 8
  options?: string[]
  correctAnswer: string
  explanation?: string
  selectCount?: number
  sequenceTokens?: string[]
  relatedArticleIds: string[]
}

export interface WeightTrainingProgress {
  totalInPool: number
  seenCount: number
  part7Seen: number
  part7Total: number
  part8Seen: number
  part8Total: number
  attemptNumber: number
  estimatedAttemptsToComplete: number
}

export interface ExerciseAnswer {
  questionId: string
  userAnswer: string | null
  isCorrect: boolean
  pointsEarned?: number
}

