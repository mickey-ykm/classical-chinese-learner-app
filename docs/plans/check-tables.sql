-- Check if tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('cross_article_questions', 'cross_article_question_articles', 'exercise_answers', 'exercise_sessions')
ORDER BY table_name;

-- If exercise_answers doesn't show up, run this:
-- CREATE TABLE exercise_answers (see full schema in weight-training-schema-revised.sql)
