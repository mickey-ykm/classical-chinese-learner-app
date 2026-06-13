#!/usr/bin/env node
/**
 * delete-user.js
 *
 * Completely erases a user account from Supabase — auth record + all user data.
 * Use this to reset a test account so you can re-test the login / registration flow.
 *
 * Usage:
 *   node admin/delete-user.js <email>
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in admin/.env
 *
 * Deletion order (respects FK constraints):
 *   quiz_answers → quiz_attempts → exercise_sessions → read_progress → profiles → auth.users
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function deleteRow(table, column, value) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .eq(column, value);
  if (error) throw new Error(`Failed deleting from ${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith('--'))?.trim();
  const confirmed = args.includes('--confirm');

  if (!email) {
    console.error('Usage: node admin/delete-user.js <email> [--confirm]');
    console.error('  Omit --confirm to do a dry run (shows what would be deleted).');
    process.exit(1);
  }

  console.log(`\n🔍 Looking up user: ${email}\n`);

  // Look up the user via the profiles table (which mirrors auth.users.id)
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('email', email)
    .maybeSingle();

  if (profileErr) {
    console.error('❌ Error querying profiles:', profileErr.message);
    process.exit(1);
  }

  if (!profile) {
    // Fall back to auth.users list search (handles case where profile row doesn't exist yet)
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
      console.error('❌ Error listing auth users:', authErr.message);
      process.exit(1);
    }
    const authUser = users.find((u) => u.email === email);
    if (!authUser) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }
    console.log(`⚠️  Found auth record only (no profile row yet)`);
    console.log(`   ID:    ${authUser.id}`);
    console.log(`   Email: ${authUser.email}\n`);

    if (!confirmed) {
      console.log('ℹ️  Dry run — pass --confirm to actually delete.');
      return;
    }

    const { error: delErr } = await supabase.auth.admin.deleteUser(authUser.id);
    if (delErr) throw new Error(`Failed deleting auth user: ${delErr.message}`);
    console.log('✅ Auth record deleted.');
    return;
  }

  const userId = profile.id;
  console.log(`👤 Found user:`);
  console.log(`   ID:           ${userId}`);
  console.log(`   Email:        ${profile.email}`);
  console.log(`   Display name: ${profile.display_name ?? '(none)'}\n`);

  console.log('⚠️  This will permanently delete ALL data for this user:\n');
  console.log('   • quiz_answers');
  console.log('   • quiz_attempts');
  console.log('   • exercise_sessions');
  console.log('   • read_progress');
  console.log('   • profiles');
  console.log('   • auth.users record\n');

  if (!confirmed) {
    console.log('ℹ️  Dry run — pass --confirm to actually delete.');
    return;
  }

  console.log('\n🔄 Deleting user data...\n');

  // 1. quiz_answers — FK: attempt_id → quiz_attempts.id
  //    Must go first; delete via attempt IDs belonging to this user.
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('id')
    .eq('user_id', userId);

  const attemptIds = (attempts ?? []).map((a) => a.id);
  if (attemptIds.length > 0) {
    const { error: qaErr, count: qaCount } = await supabase
      .from('quiz_answers')
      .delete({ count: 'exact' })
      .in('attempt_id', attemptIds);
    if (qaErr) throw new Error(`Failed deleting quiz_answers: ${qaErr.message}`);
    console.log(`✅ Deleted ${qaCount ?? 0} quiz_answers`);
  } else {
    console.log('ℹ️  No quiz_answers to delete');
  }

  // 2. quiz_attempts
  const n2 = await deleteRow('quiz_attempts', 'user_id', userId);
  console.log(`✅ Deleted ${n2} quiz_attempts`);

  // 3. exercise_sessions
  const n3 = await deleteRow('exercise_sessions', 'user_id', userId);
  console.log(`✅ Deleted ${n3} exercise_sessions`);

  // 4. read_progress
  const n4 = await deleteRow('read_progress', 'user_id', userId);
  console.log(`✅ Deleted ${n4} read_progress rows`);

  // 5. profiles
  const n5 = await deleteRow('profiles', 'id', userId);
  console.log(`✅ Deleted ${n5} profile row`);

  // 6. auth.users — must be last (other tables may FK to this)
  const { error: authDelErr } = await supabase.auth.admin.deleteUser(userId);
  if (authDelErr) throw new Error(`Failed deleting auth user: ${authDelErr.message}`);
  console.log(`✅ Deleted auth.users record`);

  console.log(`\n✨ User ${email} fully erased. You can now re-register with this email.\n`);
}

main().catch((e) => {
  console.error('\n❌ Unexpected error:', e.message);
  process.exit(1);
});
