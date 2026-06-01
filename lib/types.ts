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
  id: number
  part: 1 | 2 | 3 | 4
  points: number
  stem: string
  format?: QuestionFormat
  options: QuizOption[]
  correctAnswer: string  // OptionKey for mc; comma-sep keys for mc-multi; >-sep tokens for sentence-order
  selectCount?: number   // how many options to select (1 = single, >1 = multi)
  sequenceTokens?: string[]  // shuffled tokens for sentence-order
  explanation?: string
  questionTypes?: string[]  // Question type labels: 字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點
}

export interface QuizAnswer {
  questionId: number
  selectedOption: string | null  // OptionKey | comma-sep keys | null for fill-blank/sentence-order
  isCorrect: boolean
  pointsEarned?: number
}

export interface QuizPart {
  part: 1 | 2 | 3 | 4
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
