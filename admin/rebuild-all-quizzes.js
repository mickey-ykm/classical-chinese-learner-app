#!/usr/bin/env node
/**
 * Rebuild quiz_json for all articles that have published questions.
 * Run this after updating the rebuildQuizJson logic to apply changes.
 */

require('dotenv').config()
const { supabase } = require('./lib/supabase')
const { rebuildQuizJson } = require('./lib/article-helpers')

async function main() {
  if (!supabase) {
    console.error('Supabase not configured. Check your .env file.')
    process.exit(1)
  }

  // Get all article IDs that have published questions
  const { data, error } = await supabase
    .from('questions')
    .select('article_id')
    .eq('status', 'published')

  if (error) {
    console.error('Failed to fetch articles:', error.message)
    process.exit(1)
  }

  const articleIds = [...new Set(data.map(q => q.article_id))]
  console.log(`Found ${articleIds.length} articles with published questions`)

  for (const articleId of articleIds) {
    try {
      console.log(`Rebuilding quiz_json for ${articleId}...`)
      await rebuildQuizJson(articleId)
      console.log(`✓ ${articleId}`)
    } catch (err) {
      console.error(`✗ ${articleId}: ${err.message}`)
    }
  }

  console.log('\nDone!')
}

main()
