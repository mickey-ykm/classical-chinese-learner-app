const { supabase } = require("./lib/supabase")

/**
 * Migrate historical quiz_attempts + quiz_answers to exercise_sessions + exercise_answers
 *
 * Usage: node admin/migrate-to-unified-model.js [--dry-run]
 */

async function migrate() {
  const isDryRun = process.argv.includes("--dry-run")

  console.log(isDryRun ? "DRY RUN MODE\n" : "MIGRATION MODE\n")

  // Fetch all quiz_attempts
  const { data: attempts, error: attErr } = await supabase
    .from("quiz_attempts")
    .select("*")
    .order("completed_at", { ascending: true })

  if (attErr) {
    console.error("Failed to fetch quiz_attempts:", attErr.message)
    return
  }

  console.log(`Found ${attempts.length} quiz_attempts to migrate\n`)

  let migrated = 0
  let skipped = 0

  for (const attempt of attempts) {
    // Check if already migrated (look for exercise_session with matching user+article+timestamp)
    const { data: existing } = await supabase
      .from("exercise_sessions")
      .select("id")
      .eq("user_id", attempt.user_id)
      .eq("kind", "article-quiz")
      .eq("article_id", attempt.article_id)
      .eq("finished_at", attempt.completed_at)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    // Fetch answers for this attempt
    const { data: answers, error: ansErr } = await supabase
      .from("quiz_answers")
      .select("*")
      .eq("attempt_id", attempt.id)

    if (ansErr || !answers) {
      console.warn(`Skipping attempt ${attempt.id}: no answers found`)
      skipped++
      continue
    }

    if (isDryRun) {
      console.log(`Would migrate attempt ${attempt.id}: ${answers.length} answers`)
      migrated++
      continue
    }

    // Insert session
    const { data: session, error: sessErr } = await supabase
      .from("exercise_sessions")
      .insert({
        user_id: attempt.user_id,
        kind: "article-quiz",
        article_id: attempt.article_id,
        score: attempt.score,
        total_points: attempt.total_points,
        total_seconds: attempt.total_seconds,
        expected_seconds: attempt.expected_seconds,
        started_at: new Date(
          new Date(attempt.completed_at).getTime() - (attempt.total_seconds || 0) * 1000
        ).toISOString(),
        finished_at: attempt.completed_at,
      })
      .select("id")
      .single()

    if (sessErr) {
      console.error(`Failed to insert session for attempt ${attempt.id}:`, sessErr.message)
      skipped++
      continue
    }

    // Insert answers - map user_choice integer index to letter (A-H)
    const answerRows = answers.map(a => ({
      session_id: session.id,
      question_id: String(a.question_id),
      user_answer: a.user_choice != null ? ["A", "B", "C", "D", "E", "F", "G", "H"][a.user_choice] : null,
      is_correct: a.is_correct,
      points_earned: a.points_earned || (a.is_correct ? 1 : 0),
      answered_at: attempt.completed_at,
    }))

    const { error: ansInsertErr } = await supabase
      .from("exercise_answers")
      .insert(answerRows)

    if (ansInsertErr) {
      console.error(`Failed to insert answers for session ${session.id}:`, ansInsertErr.message)
      skipped++
      continue
    }

    migrated++
    if (migrated % 10 === 0) {
      console.log(`Migrated ${migrated} attempts...`)
    }
  }

  console.log(`\nMigration complete:`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Skipped: ${skipped}`)
}

migrate().catch(console.error)
