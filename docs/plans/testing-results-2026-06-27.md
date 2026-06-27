# Testing Results & Bug Fixes - Unified Data Model

## Test Date: 2026-06-27

---

## ✅ Working Features

### 1. Anonymous User Article Quiz
**Status:** ✅ PASS
- Anonymous users can complete article quizzes
- Data saves to `exercise_sessions` with `user_id = NULL`
- Verified in Supabase

### 2. DSE Training (Anonymous)
**Status:** ✅ PASS
- Anonymous users can complete DSE mock exam
- Session saves to `exercise_sessions` correctly
- ⚠️ **BUT**: `exercise_answers` not saving (see Bug #1)

### 3. Logged-in User Article Quiz
**Status:** ⚠️ PARTIAL
- Quiz completion works
- ⚠️ Historical data visibility issue (see Bug #3)

---

## ❌ Bugs Found

### Bug #1: Revision and DSE training not saving to `exercise_answers`
**Task:** #4 (created)

**Symptoms:**
- `exercise_sessions` row created successfully
- `exercise_answers` rows NOT created
- No visible error to user (silent failure)

**Root Cause:**
- RLS policy on `exercise_answers` may be too complex for INSERT
- Errors silently caught by `.catch(() => {})` wrappers

**Impact:** HIGH
- Revision exercise and DSE training lose per-question answer data
- Cannot analyze mistakes or build user insights
- Partial credit scoring data lost

**Fix Applied:**
1. Added error logging to reveal actual errors:
   - `app/revision.tsx` line 58
   - `app/(tabs)/dse-training.tsx` line 165
2. Created simplified RLS policies in `docs/plans/fix-exercise-answers-rls.sql`

**Next Steps:**
1. Run `fix-exercise-answers-rls.sql` in Supabase
2. Test revision and DSE training again
3. Check Metro console for error messages
4. Verify `exercise_answers` rows appear in Supabase

---

### Bug #2: Weight training insufficient questions error
**Task:** #5 (created)

**Symptoms:**
Error message: "Insufficient questions for weight training. Need 5+ from part 7 (have 7) and 5+ from part 8 (have 4)"

**Root Cause:**
- Only 4 published Part 8 questions in `cross_article_questions` table
- Weight training requires 5+ per part

**Impact:** MEDIUM
- Weight training unusable until more Part 8 questions added
- Affects all users (logged-in and anonymous)

**Fix Options:**
1. **Preferred:** Add more Part 8 questions via admin portal at `/cross-article-questions.html`
2. **Temporary:** Reduce Part 8 quota from 5 to 4 in `admin/lib/weight-training-sampling.js`

**Query to check:**
```sql
SELECT part, COUNT(*) 
FROM cross_article_questions 
WHERE status = 'published' 
GROUP BY part 
ORDER BY part;
```

---

### Bug #3: Logged-in user historical quiz data disappeared
**Task:** #6 (created)

**Symptoms:**
- User logged into existing account
- Original attempt data appears to be missing

**Root Cause:** UNKNOWN - needs investigation

**Possible Causes:**
1. Sampling logic not merging old and new data correctly
2. UI display issue (data exists but not shown)
3. User ID mismatch (new auth session created new user_id)
4. RLS policy preventing access to old `quiz_attempts`

**Impact:** HIGH (if data actually lost) / LOW (if just display issue)

**Investigation Needed:**
1. Check Supabase directly for user's `quiz_attempts` and `exercise_sessions`:
   ```sql
   SELECT COUNT(*) FROM quiz_attempts WHERE user_id = '<user_id>';
   SELECT COUNT(*) FROM exercise_sessions WHERE user_id = '<user_id>';
   ```
2. Check if user_id changed between auth sessions
3. Test sampling logic with known user who has historical data
4. Check account screen history display

---

## 🔧 Fixes Applied

### 1. Error Logging Added
**Files modified:**
- `app/revision.tsx` - Added `console.error('Revision save error:', err)`
- `app/(tabs)/dse-training.tsx` - Added `console.error('DSE training save error:', err)`

**Purpose:** Reveal actual RLS or database errors that were being silently caught

### 2. RLS Policy Fix SQL Created
**File:** `docs/plans/fix-exercise-answers-rls.sql`

**Changes:**
- Drop complex "own exercise answers" policy
- Create separate policies for INSERT, SELECT, UPDATE, DELETE
- Simpler WITH CHECK clause for INSERT
- Same anonymous user support: `(auth.uid() IS NULL AND user_id IS NULL)`

---

## 📋 Action Items

### Priority 1: Fix exercise_answers RLS (Bug #1)
1. ✅ Create error logging
2. ⏳ Run `docs/plans/fix-exercise-answers-rls.sql` in Supabase
3. ⏳ Test revision exercise - check Metro console for errors
4. ⏳ Test DSE training - check Metro console for errors
5. ⏳ Verify `exercise_answers` rows appear in database
6. ⏳ Commit fix once working

### Priority 2: Add more Part 8 questions (Bug #2)
1. ⏳ Check current question count by part
2. ⏳ Add at least 2 more Part 8 questions via admin portal
3. ⏳ Test weight training again

### Priority 3: Investigate historical data visibility (Bug #3)
1. ⏳ Get user_id from test account
2. ⏳ Query Supabase for historical attempts
3. ⏳ Determine if data is missing or just not displayed
4. ⏳ Fix based on root cause

---

## 🎯 Success Criteria (Updated)

- ✅ Anonymous users can save article quiz data
- ⏳ Revision exercise saves to `exercise_answers`
- ⏳ DSE training saves to `exercise_answers`
- ⏳ Weight training works for all users
- ⏳ Historical data remains accessible for logged-in users
- ⏳ No silent failures (all errors logged)

---

## Next Testing Session

After applying fixes:
1. Test revision exercise completion → check `exercise_answers` table
2. Test DSE training completion → check `exercise_answers` table
3. Test weight training (after adding questions)
4. Test historical data visibility with existing user account
5. Run migration script: `node admin/migrate-to-unified-model.js --dry-run`
