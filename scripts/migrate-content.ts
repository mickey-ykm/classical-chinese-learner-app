#!/usr/bin/env tsx
/**
 * Phase 4 migration: JSON files → Supabase
 *
 * Usage:
 *   npx tsx scripts/migrate-content.ts
 *
 * Reads data/articles/*.json, data/quizzes/*.json, data/index.json and
 * admin/assessment-config.json then upserts everything into Supabase.
 * Idempotent — re-running upserts by primary key.
 *
 * Requires env vars (set in root .env):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { ArticleSchema, QuizSchema, QuizPromptSchema } from "../shared/schema.js"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const ADMIN_DIR = path.join(ROOT, "admin")

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function inferQuestionType(partTitle: string): string {
  const t = partTitle.toLowerCase()
  if (t.includes("字詞") || t.includes("詞義") || t.includes("釋義")) return "word-meaning"
  if (t.includes("句子") || t.includes("語譯")) return "sentence-meaning"
  if (t.includes("修辭")) return "rhetorical-device"
  if (t.includes("主題") || t.includes("主旨") || t.includes("大意")) return "theme"
  if (t.includes("人物") || t.includes("形象")) return "character-analysis"
  return "comprehension"
}

function quizToQuestionRows(articleId: string, quiz: any) {
  const rows: any[] = []
  for (const part of quiz.parts ?? []) {
    const qType = inferQuestionType(part.title ?? "")
    for (const q of part.questions ?? []) {
      const optMap: Record<string, string> = {}
      for (const o of q.options ?? []) optMap[o.key] = o.text
      rows.push({
        article_id: articleId,
        type: qType,
        format: "mc",
        part: part.part,
        points: q.points ?? part.pointsPerQuestion ?? 1,
        stem: q.stem,
        options: optMap,
        correct_answer: q.correctAnswer,
        explanation: q.explanation ?? null,
        source_excerpt: null,
        status: "published",
      })
    }
  }
  return rows
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Phase 4 content migration\n")

  const index: any[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "index.json"), "utf8")
  )

  let articleOk = 0
  let articleErr = 0
  let questionOk = 0

  for (const entry of index) {
    const id: string = entry.id
    const articlePath = path.join(DATA_DIR, "articles", `${id}.json`)
    const quizPath = path.join(DATA_DIR, "quizzes", `${id}.json`)

    if (!fs.existsSync(articlePath)) {
      console.warn(`  ⚠ Missing article file: ${id}`)
      articleErr++
      continue
    }

    const articleRaw = JSON.parse(fs.readFileSync(articlePath, "utf8"))
    const articleResult = ArticleSchema.safeParse(articleRaw)
    if (!articleResult.success) {
      const issues = articleResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")
      console.error(`  ✗ ${id} article validation failed: ${issues}`)
      articleErr++
      continue
    }
    const article = articleResult.data

    let quiz: any = null
    if (fs.existsSync(quizPath)) {
      const quizRaw = JSON.parse(fs.readFileSync(quizPath, "utf8"))
      const quizResult = QuizSchema.safeParse(quizRaw)
      if (!quizResult.success) {
        const issues = quizResult.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")
        console.warn(`  ⚠ ${id} quiz validation failed (will skip quiz): ${issues}`)
      } else {
        quiz = quizResult.data
      }
    }

    const levelNum = typeof entry.level === "number" ? entry.level : null

    const row = {
      id: article.id,
      title: article.title,
      title_footnote_id: article.titleFootnoteId ?? null,
      source: article.source ?? "",
      segments: article.segments,
      footnotes: article.footnotes,
      modern_translation: article.modernTranslation,
      level: levelNum,
      is_challenge: entry.type === "challenge",
      status: entry.status === "draft" ? "draft" : "published",
      expected_minutes: entry.expectedMinutes ?? null,
      exercise_template: entry.exerciseTemplate ?? null,
      quiz_json: quiz,
      created_at: entry.createdAt ?? new Date().toISOString(),
    }

    const { error: upsertErr } = await supabase
      .from("articles")
      .upsert(row, { onConflict: "id" })

    if (upsertErr) {
      console.error(`  ✗ ${id} upsert failed: ${upsertErr.message}`)
      articleErr++
      continue
    }

    // Upsert questions
    let questionCount = 0
    if (quiz) {
      await supabase.from("questions").delete().eq("article_id", id)
      const qRows = quizToQuestionRows(id, quiz)
      if (qRows.length > 0) {
        const { error: qErr } = await supabase.from("questions").insert(qRows)
        if (qErr) {
          console.warn(`  ⚠ ${id} questions insert failed: ${qErr.message}`)
        } else {
          questionOk += qRows.length
          questionCount = qRows.length
        }
      }
    }

    // Version snapshot
    await supabase.from("article_versions").insert({
      article_id: id,
      snapshot: { article: articleRaw, quiz },
      edited_by: "migrate-content.ts",
    })

    console.log(`  ✓ ${id} (${questionCount} questions)`)
    articleOk++
  }

  // ── Quiz Prompts ─────────────────────────────────────────────────────────────

  const configPath = path.join(ADMIN_DIR, "assessment-config.json")
  if (fs.existsSync(configPath)) {
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"))
    const prompts: any[] = Array.isArray(cfg.quizPrompts) ? cfg.quizPrompts : []
    let promptOk = 0
    for (const p of prompts) {
      const result = QuizPromptSchema.safeParse({
        name: p.name,
        description: p.description,
        promptTemplate: p.promptTemplate,
        defaultModel: p.defaultModel,
      })
      if (!result.success) {
        console.warn(`  ⚠ quiz prompt "${p.name}" validation failed, skipping`)
        continue
      }
      const { error } = await supabase.from("quiz_prompts").upsert(
        {
          name: result.data.name,
          description: result.data.description ?? null,
          prompt_template: result.data.promptTemplate,
          default_model: result.data.defaultModel ?? null,
        },
        { onConflict: "name" }
      )
      if (error) {
        console.warn(`  ⚠ quiz prompt "${p.name}" upsert failed: ${error.message}`)
      } else {
        promptOk++
      }
    }
    console.log(`\n  Quiz prompts: ${promptOk}/${prompts.length} migrated`)
  }

  console.log(`\nDone — articles: ${articleOk} ok, ${articleErr} errors; questions: ${questionOk} inserted`)
  if (articleErr > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
