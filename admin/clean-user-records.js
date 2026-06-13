#!/usr/bin/env node

/**
 * Clean quiz records for a specific user (for testing purposes)
 * Usage: node clean-user-records.js <user_id>
 *
 * Deletes:
 *   - quiz_answers  (all rows where attempt_id belongs to this user)
 *   - quiz_attempts (all rows for this user)
 *
 * Does NOT touch: articles, questions, profiles, auth users
 */

require('dotenv').config();
const { supabase } = require('./lib/supabase.js');

async function cleanUserRecords(userId) {
  if (!supabase) {
    console.error('❌ Supabase not configured. Please create admin/.env with:');
    console.error('   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    process.exit(1);
  }

  console.log(`🔍 Cleaning quiz records for user: ${userId}\n`);

  // 1. Fetch attempt IDs first so we can count them
  const { data: attempts, error: fetchErr } = await supabase
    .from('quiz_attempts')
    .select('id')
    .eq('user_id', userId);

  if (fetchErr) {
    console.error('❌ Failed to fetch attempts:', fetchErr.message);
    process.exit(1);
  }

  if (!attempts || attempts.length === 0) {
    console.log('ℹ️  No quiz attempts found for this user. Nothing to delete.');
    return;
  }

  const attemptIds = attempts.map((a) => a.id);
  console.log(`📊 Found ${attemptIds.length} attempt(s) to delete.\n`);

  // 2. Delete quiz_answers for those attempts
  console.log('🗑️  Deleting quiz_answers...');
  const { error: answersErr, count: answersCount } = await supabase
    .from('quiz_answers')
    .delete({ count: 'exact' })
    .in('attempt_id', attemptIds);

  if (answersErr) {
    console.error('❌ Failed to delete quiz_answers:', answersErr.message);
    process.exit(1);
  }
  console.log(`✅ Deleted ${answersCount ?? '?'} quiz_answers row(s).`);

  // 3. Delete quiz_attempts
  console.log('🗑️  Deleting quiz_attempts...');
  const { error: attemptsErr, count: attemptsDeleted } = await supabase
    .from('quiz_attempts')
    .delete({ count: 'exact' })
    .eq('user_id', userId);

  if (attemptsErr) {
    console.error('❌ Failed to delete quiz_attempts:', attemptsErr.message);
    process.exit(1);
  }
  console.log(`✅ Deleted ${attemptsDeleted ?? '?'} quiz_attempts row(s).`);

  console.log(`\n✨ Done! User ${userId} now has a clean slate.\n`);
}

// ── Entry point ────────────────────────────────────────────────────────────────

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: node clean-user-records.js <user_id>');
  console.error('Example: node clean-user-records.js abc123-...-uuid');
  process.exit(1);
}

cleanUserRecords(userId);
