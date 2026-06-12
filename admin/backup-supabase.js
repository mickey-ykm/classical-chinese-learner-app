#!/usr/bin/env node

/**
 * Backup script for Supabase articles and questions tables
 * Usage: node backup-supabase.js
 *
 * Creates timestamped JSON files in admin/backups/
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load .env file
const { supabase } = require('./lib/supabase.js');

async function backupSupabase() {
  if (!supabase) {
    console.error('❌ Supabase not configured. Please create admin/.env with:');
    console.error('   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    process.exit(1);
  }

  console.log('🔄 Starting Supabase backup...\n');

  // Create backups directory if it doesn't exist
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

  try {

    // Backup articles table
    console.log('📦 Backing up articles table...');
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('*')
      .order('id', { ascending: true });

    if (articlesError) throw articlesError;

    const articlesFile = path.join(backupsDir, `articles_${timestamp}.json`);
    fs.writeFileSync(articlesFile, JSON.stringify(articles, null, 2));
    console.log(`✅ Saved ${articles.length} articles to: ${articlesFile}`);

    // Backup questions table
    console.log('📦 Backing up questions table...');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .order('id', { ascending: true });

    if (questionsError) throw questionsError;

    const questionsFile = path.join(backupsDir, `questions_${timestamp}.json`);
    fs.writeFileSync(questionsFile, JSON.stringify(questions, null, 2));
    console.log(`✅ Saved ${questions.length} questions to: ${questionsFile}`);

    // Backup quiz_prompts table (configuration, but good to have)
    console.log('📦 Backing up quiz_prompts table...');
    const { data: prompts, error: promptsError } = await supabase
      .from('quiz_prompts')
      .select('*')
      .order('id', { ascending: true });

    if (promptsError) throw promptsError;

    const promptsFile = path.join(backupsDir, `quiz_prompts_${timestamp}.json`);
    fs.writeFileSync(promptsFile, JSON.stringify(prompts, null, 2));
    console.log(`✅ Saved ${prompts.length} quiz prompts to: ${promptsFile}`);

    // Create a combined backup file
    const combinedFile = path.join(backupsDir, `full_backup_${timestamp}.json`);
    fs.writeFileSync(combinedFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      articles,
      questions,
      quiz_prompts: prompts
    }, null, 2));
    console.log(`✅ Created combined backup: ${combinedFile}`);

    console.log('\n✨ Backup complete!\n');
    console.log('Summary:');
    console.log(`  - ${articles.length} articles`);
    console.log(`  - ${questions.length} questions`);
    console.log(`  - ${prompts.length} quiz prompts`);
    console.log(`\nBackup location: ${backupsDir}`);

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

backupSupabase();
