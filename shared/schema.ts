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
})

export type Article = z.infer<typeof ArticleSchema>

// ── Quiz ──────────────────────────────────────────────────────────────────────

export const QuizOptionSchema = z.object({
  key: z.enum(["A", "B", "C", "D"]),
  text: z.string().min(1),
})

export const QuizQuestionSchema = z.object({
  id: z.union([z.number(), z.string()]),
  part: z.number().int().positive().optional(),
  points: z.number().int().positive().optional(),
  stem: z.string().min(1, "stem is required"),
  options: z.array(QuizOptionSchema).min(2, "options[] needs ≥2 items"),
  correctAnswer: z.enum(["A", "B", "C", "D"], {
    errorMap: () => ({ message: "correctAnswer must be A, B, C, or D" }),
  }),
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

// ── Question Types ────────────────────────────────────────────────────────────

export const QUESTION_TYPES = [
  "word-meaning",
  "sentence-meaning",
  "comprehension",
  "theme",
  "character-analysis",
  "rhetorical-device",
  "citation",
  "application",
] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]
