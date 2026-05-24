import { z } from "zod"

// ── Article ───────────────────────────────────────────────────────────────────

export const SegmentSchema = z.object({
  text: z.string(),
  footnoteId: z.string().optional(),
})

export const FootnoteSchema = z.object({
  id: z.string(),
  marker: z.string(),
  term: z.string(),
  explanation: z.string(),
})

export const ArticleSchema = z.object({
  id: z.string().min(1, "id is required"),
  title: z.string().min(1, "title is required"),
  titleFootnoteId: z.string().optional(),
  source: z.string().optional(),
  segments: z.array(SegmentSchema).min(1, "segments[] must not be empty"),
  footnotes: z.array(FootnoteSchema),
  modernTranslation: z.array(z.string()).min(1, "modernTranslation[] must not be empty"),
  is_dse_core: z.boolean().optional().default(false),
})

export type Article = z.infer<typeof ArticleSchema>

// ── Quiz ──────────────────────────────────────────────────────────────────────

export const QuizOptionSchema = z.object({
  key: z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]),
  text: z.string().min(1),
})

export const QuizQuestionSchema = z.object({
  id: z.union([z.number(), z.string()]),
  part: z.number().int().positive().optional(),
  points: z.number().int().positive().optional(),
  stem: z.string().min(1, "stem is required"),
  options: z.array(QuizOptionSchema).min(2, "options[] needs ≥2 items"),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().optional(),
})

export const QuizPartSchema = z.object({
  part: z.number().int().positive(),
  title: z.string(),
  pointsPerQuestion: z.number().int().positive(),
  questions: z.array(QuizQuestionSchema).min(1, "questions[] must not be empty"),
})

export const QuizSchema = z.object({
  articleId: z.string().min(1, "articleId is required"),
  totalPoints: z.number().int().nonnegative(),
  parts: z.array(QuizPartSchema).min(1, "parts[] must not be empty"),
})

export type Quiz = z.infer<typeof QuizSchema>

// ── Quiz Prompt ───────────────────────────────────────────────────────────────

export const QuizPromptSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  promptTemplate: z.string().min(1, "promptTemplate is required"),
  defaultModel: z.string().optional(),
})

export type QuizPrompt = z.infer<typeof QuizPromptSchema>

// ── Exercise Template ─────────────────────────────────────────────────────────

export const ExerciseTemplateItemSchema = z.object({
  type: z.string().min(1),
  count: z.number().int().positive(),
})

export const ExerciseTemplateSchema = z.array(ExerciseTemplateItemSchema)

export type ExerciseTemplate = z.infer<typeof ExerciseTemplateSchema>

// ── Question Types & Formats ──────────────────────────────────────────────────

export const QUESTION_TYPES = [
  "mc-single",
  "mc-multi",
  "true-false",
  "fill-blank",
  "sentence-order",
] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

export const QUESTION_FORMATS = ["mc", "fill-blank", "sentence-order"] as const

export type QuestionFormat = (typeof QUESTION_FORMATS)[number]

// ── Question (Supabase row) ───────────────────────────────────────────────────
//
// type         — one of QUESTION_TYPES
// format       — one of QUESTION_FORMATS (derived from type)
// stem         — the question prompt / stem text
// options      — JSON array of { key, text } for mc/true-false questions
// correct_answer
//   mc-single / true-false : single key e.g. "B"
//   mc-multi               : comma-separated keys e.g. "A,C,E"
//   fill-blank             : pipe-separated accepted answers e.g. "學則不固|學則不固。"
//   sentence-order         : >-delimited correct token sequence e.g. "明>月>松>間>照>清>泉>石>上>流"
// select_count — number of correct options to select (mc-multi); 1 for mc-single/true-false
// sequence_tokens — shuffled display tokens for sentence-order questions
// points       — marks awarded for a correct answer
// status       — "draft" | "published"
// explanation  — optional explanation shown after answer reveal

export const QuestionOptionSchema = z.object({
  key: z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]),
  text: z.string().min(1),
})

export const QuestionSchema = z.object({
  id: z.union([z.number(), z.string()]),
  article_id: z.string().min(1),
  type: z.enum(QUESTION_TYPES),
  format: z.enum(QUESTION_FORMATS),
  stem: z.string().min(1, "stem is required"),
  options: z.array(QuestionOptionSchema).optional(),
  correct_answer: z.string().min(1, "correct_answer is required"),
  select_count: z.number().int().positive().default(1),
  sequence_tokens: z.array(z.string()).optional(),
  points: z.number().int().positive().default(1),
  status: z.enum(["draft", "published"]).default("draft"),
  explanation: z.string().optional(),
  source_excerpt: z.string().optional(),
})

export type Question = z.infer<typeof QuestionSchema>
