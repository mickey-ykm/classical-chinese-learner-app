#!/usr/bin/env node
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function deleteInBatches(table, ids, batchSize = 100) {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { error } = await supabase.from(table).delete().in('id', batch);
    if (error) throw new Error(`Failed deleting batch from ${table}: ${error.message}`);
    deleted += batch.length;
    process.stdout.write(`\r  Progress: ${deleted}/${ids.length}`);
  }
  console.log('');
}

async function main() {
  console.log('⚠️  WARNING: This will DELETE ALL data from articles and questions tables!\n');

  const a1 = await ask('Have you created a backup? Type "yes" to continue: ');
  if (a1.trim().toLowerCase() !== 'yes') {
    console.log('❌ Aborted.');
    rl.close();
    return;
  }

  const a2 = await ask('\n🔴 Type "DELETE ALL DATA" to confirm: ');
  if (a2.trim() !== 'DELETE ALL DATA') {
    console.log('❌ Confirmation failed. Aborted.');
    rl.close();
    return;
  }

  // Load IDs from the most recent backup
  const backupsDir = path.join(__dirname, 'backups');
  const backupFiles = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('full_backup_'))
    .sort()
    .reverse();

  if (backupFiles.length === 0) {
    console.error('❌ No backup file found in admin/backups/. Run backup-supabase.js first.');
    rl.close();
    process.exit(1);
  }

  const backupFile = path.join(backupsDir, backupFiles[0]);
  console.log(`\n📂 Using backup: ${backupFiles[0]}`);
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  const questionIds = (backup.questions || []).map(q => q.id);
  const articleIds = (backup.articles || []).map(a => a.id);

  console.log(`  Found ${questionIds.length} questions, ${articleIds.length} articles to delete\n`);
  console.log('\n🔄 Starting data deletion...\n');

  // Delete questions first (FK: questions.article_id → articles.id)
  if (questionIds.length > 0) {
    console.log(`🗑️  Deleting ${questionIds.length} questions...`);
    await deleteInBatches('questions', questionIds);
    console.log('✅ Deleted all questions');
  } else {
    console.log('ℹ️  No questions to delete');
  }

  // Delete articles
  if (articleIds.length > 0) {
    console.log(`🗑️  Deleting ${articleIds.length} articles...`);
    await deleteInBatches('articles', articleIds);
    console.log('✅ Deleted all articles');
  } else {
    console.log('ℹ️  No articles to delete');
  }

  console.log('\n✨ All data cleared successfully!');
  console.log('Note: quiz_prompts table was preserved.');
  rl.close();
}

main().catch((e) => { console.error('❌ Unexpected error:', e.message); rl.close(); process.exit(1); });
