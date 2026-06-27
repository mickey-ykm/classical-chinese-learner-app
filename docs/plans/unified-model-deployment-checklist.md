# Unified Data Model Deployment Checklist

## Tickets: #024 (Anonymous user logging) + #025 (All exercise types logged)

**Status:** Code changes complete ✅ | Database migration ready ⏳ | Testing pending ⏳

---

## Phase 1: Database Schema Migration

### ⏳ Step 1: Run SQL Migration in Supabase

**File:** `docs/plans/unified-model-schema-migration.sql`

**Actions:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `unified-model-schema-migration.sql`
3. Execute the SQL
4. Review verification query results at bottom:
   - ✅ `exercise_sessions` has `metadata` column (jsonb)
   - ✅ `exercise_answers` table exists with 7 columns
   - ✅ CHECK constraint includes `'article-quiz'`
   - ✅ RLS policies allow `(auth.uid() IS NULL AND user_id IS NULL)`

**Expected outcome:** Schema extended, RLS policies updated, ready for anonymous users

---

## Phase 2: Code Deployment

### ⏳ Step 2: Deploy Backend Changes

**Files modified:**
- `admin/lib/sampling.js` - Queries both old and new tables
- `admin/migrate-to-unified-model.js` - New migration script

**Actions:**
1. Commit and push changes to main branch:
   ```bash
   git add admin/lib/sampling.js admin/migrate-to-unified-model.js
   git commit -m "feat: unified data model - backend sampling logic (#024 #025)"
   git push origin main
   ```
2. Verify Railway auto-deploy succeeds
3. Check Railway logs for any startup errors

**Expected outcome:** Backend deployed, sampling queries both systems

---

### ⏳ Step 3: Deploy Mobile App Changes

**Files modified:**
- `lib/quizHistory.ts`
- `components/quiz/QuizShell.tsx`
- `lib/revisionSession.ts`
- `app/revision.tsx`
- `lib/exerciseSession.ts` (new)
- `app/(tabs)/dse-training.tsx`

**Actions:**
1. Test locally first:
   ```bash
   npx expo start
   ```
2. Test on iOS/Android device
3. Commit and push:
   ```bash
   git add lib/ components/ app/
   git commit -m "feat: unified data model - mobile app (#024 #025)

   - Enable anonymous user quiz saves
   - All exercise types now save to exercise_sessions
   - Save per-question answers for revision and DSE training
   - Backward compatible with old quiz_attempts table"
   git push origin main
   ```

**Expected outcome:** Mobile app uses unified model, anonymous saves work

---

## Phase 3: Testing & Validation

### ⏳ Test 1: Anonymous User Article Quiz

**Steps:**
1. Open app without logging in (or log out if logged in)
2. Navigate to an article (e.g., 《師說》)
3. Complete the quiz
4. Check Supabase `exercise_sessions` table:
   ```sql
   SELECT * FROM exercise_sessions 
   WHERE user_id IS NULL 
   ORDER BY finished_at DESC 
   LIMIT 1;
   ```
5. Verify `kind = 'article-quiz'` and has correct `article_id`
6. Check `exercise_answers` table:
   ```sql
   SELECT * FROM exercise_answers 
   WHERE session_id = '<session_id_from_above>';
   ```
7. Verify 22 answer rows exist with correct `question_id`, `is_correct`, `points_earned`

**Expected outcome:** ✅ Anonymous user data saved correctly

---

### ⏳ Test 2: Logged-in User Article Quiz + Repeat Avoidance

**Steps:**
1. Log in with Google
2. Complete an article quiz (note which questions appeared)
3. Immediately start the same article quiz again
4. Verify different questions appear (repeat avoidance working)
5. Check Supabase `exercise_sessions`:
   ```sql
   SELECT * FROM exercise_sessions 
   WHERE user_id = '<your_user_id>' 
   AND kind = 'article-quiz'
   ORDER BY finished_at DESC;
   ```
6. Verify both attempts recorded

**Expected outcome:** ✅ Logged-in saves work, repeat avoidance functional

---

### ⏳ Test 3: Revision Exercise

**Steps:**
1. Complete an article quiz and get some questions wrong
2. Go to 溫故知新 (revision) from account screen
3. Complete the revision exercise
4. Check Supabase:
   ```sql
   SELECT * FROM exercise_sessions 
   WHERE user_id = '<your_user_id>' 
   AND kind = 'revision'
   ORDER BY finished_at DESC 
   LIMIT 1;
   ```
5. Check `exercise_answers` table for per-question data:
   ```sql
   SELECT * FROM exercise_answers 
   WHERE session_id = '<session_id_from_above>';
   ```

**Expected outcome:** ✅ Revision saves session + per-question answers

---

### ⏳ Test 4: DSE Training (Anonymous + Logged-in)

**Steps:**
1. **As anonymous user:**
   - Go to DSE 模擬考題
   - Complete the mock exam
   - Verify session saved with `user_id IS NULL` and `kind = 'dse-training'`
   - Verify per-question answers saved to `exercise_answers`

2. **As logged-in user:**
   - Log in with Google
   - Complete DSE mock exam
   - Verify session saved with correct `user_id`
   - Verify per-question answers saved

**Expected outcome:** ✅ DSE training works for both anonymous and logged-in users

---

### ⏳ Test 5: Weight Training (Should Still Work)

**Steps:**
1. Go to 針對性難題訓練
2. Complete a session
3. Verify session saved with `kind = 'weight-training'`
4. Verify answers saved to `exercise_answers`

**Expected outcome:** ✅ Weight training unchanged, still works

---

### ⏳ Test 6: Sampling Logic (Dual Query)

**Steps:**
1. Complete 3-4 article quizzes for the same article
2. Check `admin/lib/sampling.js` is querying both tables:
   - Check Railway logs for SQL queries
   - Verify queries hit both `exercise_sessions` and `quiz_attempts`
3. Start a new quiz and verify repeat avoidance works

**Expected outcome:** ✅ Sampling considers both old and new data

---

## Phase 4: Historical Data Migration

### ⏳ Step 7: Backup Database

**Actions:**
```bash
cd admin
node backup-supabase.js
```

**Expected outcome:** Backup created in `admin/backups/`

---

### ⏳ Step 8: Dry Run Migration

**Actions:**
```bash
cd admin
node migrate-to-unified-model.js --dry-run
```

**Review output:**
- How many attempts will be migrated?
- Are there any errors/warnings?
- Does the count match expected historical data?

**Expected outcome:** Dry run shows reasonable migration plan

---

### ⏳ Step 9: Execute Migration

**Actions:**
```bash
cd admin
node migrate-to-unified-model.js
```

**Monitor output:**
- Migrated count should increase
- Skipped count = already migrated or no answers
- Check for any error messages

**Expected outcome:** Historical data migrated to `exercise_sessions` + `exercise_answers`

---

### ⏳ Step 10: Verify Migration

**Actions:**
```sql
-- Count old system records
SELECT COUNT(*) FROM quiz_attempts;
SELECT COUNT(*) FROM quiz_answers;

-- Count new system records (article-quiz only)
SELECT COUNT(*) FROM exercise_sessions WHERE kind = 'article-quiz';
SELECT COUNT(*) FROM exercise_answers 
WHERE session_id IN (
  SELECT id FROM exercise_sessions WHERE kind = 'article-quiz'
);

-- Spot check: compare a specific attempt
SELECT * FROM quiz_attempts WHERE id = '<some_attempt_id>';
SELECT * FROM exercise_sessions 
WHERE kind = 'article-quiz' 
AND article_id = '<article_id_from_above>'
AND finished_at = '<completed_at_from_above>';
```

**Expected outcome:** Counts match (within reason), spot checks look correct

---

## Phase 5: Monitoring (1-2 weeks)

### ⏳ Step 11: Monitor Production

**Check daily:**
1. Supabase logs for any errors related to `exercise_sessions` or `exercise_answers`
2. Railway logs for sampling errors
3. User feedback - any issues with quiz saving or repeat avoidance?

**Metrics to watch:**
- Anonymous user session count increasing
- All `kind` values appearing in `exercise_sessions`:
  ```sql
  SELECT kind, COUNT(*) FROM exercise_sessions GROUP BY kind;
  ```
- No errors in mobile app Sentry (if configured)

**Expected outcome:** System stable, no user-facing issues

---

## Phase 6: Cleanup (After 1-2 weeks)

### ⏳ Step 12: Stop Querying Old Tables

**Actions:**
1. Update `admin/lib/sampling.js` to ONLY query `exercise_sessions`
2. Remove old `quiz_attempts` queries
3. Deploy backend changes

**Expected outcome:** Sampling uses only unified model

---

### ⏳ Step 13: Deprecate Old Code Paths

**Actions:**
1. Remove old `saveQuizAttempt()` function from `lib/quizHistory.ts`
2. Update any remaining references
3. Add deprecation comment to `quiz_attempts` table in Supabase

**Expected outcome:** Code simplified, old paths removed

---

## Rollback Plan

If critical issues arise during testing:

1. **Immediate rollback (before migration):**
   - Revert git commits
   - Redeploy previous version
   - RLS policies are backward compatible, no schema rollback needed

2. **Rollback after migration:**
   - Old code still queries `quiz_attempts` as fallback
   - New saves go to `exercise_sessions` (leave them there)
   - Just redeploy old code - data in both tables is fine

3. **Schema rollback (if necessary):**
   ```sql
   -- Restore old RLS policy
   DROP POLICY IF EXISTS "own exercise sessions" ON exercise_sessions;
   CREATE POLICY "own exercise sessions" ON exercise_sessions 
     FOR ALL USING (auth.uid() = user_id);
   ```

---

## Success Criteria

✅ All tests pass (Tests 1-6)  
✅ Anonymous users can save quiz data  
✅ All exercise types save session + per-question answers  
✅ Repeat avoidance works with unified model  
✅ Historical data migrated successfully  
✅ No user-facing errors for 1 week  
✅ Old tables can be deprecated  

---

## Current Status: Ready for Phase 1 (Database Migration)

**Next action:** Run `docs/plans/unified-model-schema-migration.sql` in Supabase SQL Editor
