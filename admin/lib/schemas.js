const { z } = require("zod")

const VALID_QUESTION_TYPES = [
  '字詞解釋',
  '語句背誦',
  '語句翻譯',
  '修辭手法',
  '內容重點'
]

const SegmentSchema = z.object({
  text: z.string(),
  footnoteId: z.string().optional(),
})

const FootnoteSchema = z.object({
  id: z.string(),
  marker: z.string(),
  term: z.string(),
  explanation: z.string(),
})

const ArticleSchema = z.object({
  id: z.string().min(1, "id is required"),
  title: z.string().min(1, "title is required"),
  titleFootnoteId: z.string().optional(),
  source: z.string().optional(),
  segments: z.array(SegmentSchema).min(1, "segments[] must not be empty"),
  footnotes: z.array(FootnoteSchema),
  modernTranslation: z.array(z.string()).min(1, "modernTranslation[] must not be empty"),
})

const QuizOptionSchema = z.object({
  key: z.string().min(1),
  text: z.string().min(1),
})

const QuizQuestionSchema = z.object({
  id: z.union([z.number(), z.string()]),
  part: z.number().int().positive().optional(),
  points: z.number().int().positive().optional(),
  stem: z.string().min(1, "stem is required"),
  format: z.enum(["mc", "fill-blank", "sentence-order"]).optional(),
  type: z.string().optional(),
  options: z.array(QuizOptionSchema).optional().default([]),
  correctAnswer: z.string().optional().default(""),
  explanation: z.string().optional(),
  selectCount: z.number().int().positive().optional(),
  sequenceTokens: z.array(z.string()).optional(),
  questionTypes: z.array(z.enum(VALID_QUESTION_TYPES)).optional(),
}).refine(
  (q) => {
    const fmt = q.format ?? "mc"
    if (fmt === "mc") return (q.options?.length ?? 0) >= 2
    return true
  },
  { message: "mc questions require options[] with ≥2 items" }
)

const QuizPartSchema = z.object({
  part: z.number().int().positive(),
  title: z.string(),
  pointsPerQuestion: z.number().int().positive(),
  questions: z.array(QuizQuestionSchema).min(1, "questions[] must not be empty"),
})

const QuizSchema = z.object({
  articleId: z.string().min(1, "articleId is required"),
  totalPoints: z.number().int().nonnegative(),
  parts: z.array(QuizPartSchema).min(1, "parts[] must not be empty"),
})

const QuestionUpsertSchema = z.object({
  article_id: z.string().min(1),
  type: z.enum(["mc-single", "mc-multi", "true-false", "fill-blank", "sentence-order", "comprehension"]),
  format: z.enum(["mc", "fill-blank", "sentence-order"]),
  part: z.number().int().positive().optional().nullable(),
  points: z.number().int().positive().default(1),
  stem: z.string().min(1, "stem is required"),
  options: z.record(z.string()).optional().nullable(),
  correct_answer: z.string().min(1, "correct_answer is required"),
  select_count: z.number().int().positive().default(1),
  sequence_tokens: z.array(z.string()).optional().nullable(),
  explanation: z.string().optional().nullable(),
  source_excerpt: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
  question_types: z.array(z.enum(VALID_QUESTION_TYPES)).optional().nullable(),
})

function formatZodErrors(zodError) {
  return zodError.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
}

module.exports = {
  VALID_QUESTION_TYPES,
  SegmentSchema,
  FootnoteSchema,
  ArticleSchema,
  QuizOptionSchema,
  QuizQuestionSchema,
  QuizPartSchema,
  QuizSchema,
  QuestionUpsertSchema,
  formatZodErrors,
}
