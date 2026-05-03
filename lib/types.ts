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

export type OptionKey = "A" | "B" | "C" | "D"

export interface QuizOption {
  key: OptionKey
  text: string
}

export interface Question {
  id: number
  part: 1 | 2 | 3 | 4
  points: number
  stem: string
  options: QuizOption[]
  correctAnswer: OptionKey
  explanation?: string
}

export interface QuizAnswer {
  questionId: number
  selectedOption: OptionKey
  isCorrect: boolean
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
}
