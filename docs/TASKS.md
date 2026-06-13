# Task & Issue Tracker

_Active task list for day-to-day development work. Add new tasks to **Open**, move to **In Progress** when starting, and complete with summary in **Done** section._

---

## Open

_Add new tasks here. Format: `- [ ] #N — Type: Brief description`_

<!-- Example:
- [ ] #007 — Bug: ...
-->


<!-- Example:
- [ ] #001 — Bug: Quiz timer shows negative time on slow devices
- [ ] #002 — Feature: Add "skip question" button for Pro users
- [ ] #003 — UX: Improve contrast on answer feedback
-->

---

## In Progress

_Tasks currently being worked on. Add start date and assignee._

- [ ] **#005 — Bug: Fill-blank question answer field missing in revision exercise** (started 2026-06-13, @claude)
  - **Root cause:** `revision.tsx` hardcoded `<QuizQuestion>` for every question regardless of `question.format`. Fill-blank questions have no `options` array, so `QuizQuestion` rendered nothing interactive. Same issue for `sentence-order`.
  - **Fix applied:** Added format-dispatch in `revision.tsx` render — `fill-blank` → `FillBlankQuestion`, `sentence-order` → `SentenceOrderQuestion`, everything else → `QuizQuestion`. Matches the same pattern as `QuizShell.tsx`. Also fixed `answers` state type from `Record<number, QuizAnswer>` to `Record<string | number, QuizAnswer>`.
  - **Files changed:** `app/revision.tsx`
  - **Status:** Fix applied, needs device test with a real fill-blank question in wrong-answer pool

---

## Ready for QA

_Finished by Claude, awaiting Mickey's validation. Once validated → move to **Done**. If issues found → move back to **In Progress** with notes._

- [ ] **#004 — UI: Question pool progress and DSE section info**
  - **Summary:** Homepage and DSE文章 tab now show per-article progress ("已完成 X / Y 題"), attempt count, and correct rate. Added info banner to DSE文章 tab.
  - **Files changed:** `admin/routes/quiz.js`, `lib/articleProgress.ts` (new), `app/quiz.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/dse-learner.tsx`
  - **Note on visibility (Issue #004):** If changes are not visible after `npx expo run:ios`, run `npx expo start --clear` to flush the Metro bundle cache, then re-run. NativeWind className changes especially need a fresh bundle. If still not visible after cache clear, try deleting the app from the simulator and re-running `npx expo run:ios`.
  - **What to test:**
    1. As logged-in user, check homepage shows "已完成 X / Y 題" for articles
    2. Check DSE文章 tab shows info banner about 12+8 articles, 22 questions, 10 minutes
    3. Verify article cards show: taken/total questions, attempt count, correct rate
    4. Complete a quiz, verify progress updates on homepage
    5. As guest user, verify simpler display (no progress stats)

<!-- Example:
- [ ] #005 — Bug: Fixed X (code verified + typecheck passed; needs device testing)
  - **What to test:** Step-by-step validation instructions for Mickey
-->

---

## Done (Recent)

_Completed tasks with summaries and lessons learned. Ordered by completion date (newest first)._

### 2026-06-13

- [x] **#006 — Feature: User record cleaning script**
  - **Summary:** Created `admin/clean-user-records.js` — Node.js script that takes a userId as CLI argument and deletes all `quiz_answers` and `quiz_attempts` for that user.
  - **Files changed:** `admin/clean-user-records.js` (new)
  - **Usage:** `node admin/clean-user-records.js <userId>`
  - **Validated:** Works correctly, cleans user records as expected

- [x] **#003 — UX: Multi-select question option restriction**
  - **Summary:** When a user has selected the maximum number of options (`selectCount`), all unselected options are disabled — they appear faded and cannot be tapped. Prevents over-selection without relying solely on the submit button guard.
  - **Files changed:** `components/quiz/MCQuestion.tsx`
  - **Validated:** Options correctly disabled and faded after selecting required count

- [x] **#002 — Feature: Multi-select partial-credit scoring**
  - **Summary:** Changed `mc-multi` scoring from all-or-nothing to 1 mark per correctly selected option. `onAnswer` now passes `pointsEarned` as a third argument. `calculateScore` and `getPartScore` in `lib/quiz.ts` use `pointsEarned` when present. Quiz history persistence updated in `lib/quizHistory.ts`. Score totals are now dynamic (not always 22).
  - **Files changed:** `components/quiz/MCQuestion.tsx`, `components/quiz/QuizShell.tsx`, `lib/quiz.ts`, `lib/quizHistory.ts`
  - **Validated:** Partial credit awarded correctly, dynamic totals display properly

- [x] **#001 — Bug: Login/logout flow not reflecting auth state correctly**
  - **Summary:** Two separate bugs. (1) After logout, no anonymous session was created, leaving the app in a `user = null` / `isAnonymous = false` limbo — the account screen appeared to stay logged in because `loading` was already `false`. (2) After Google login, `router.replace("/account")` ran inside the Alert callback before `onAuthStateChange` had updated the React context, so the account screen rendered with the old anonymous user.
  - **Files changed:** `contexts/AuthContext.tsx`, `app/login.tsx`
  - **Fix 1 (`AuthContext.signOut`):** After `supabase.auth.signOut()`, immediately call `signInAnonymously()` so `onAuthStateChange` fires with a fresh anonymous user and state is always consistent.
  - **Fix 2 (`app/login.tsx`):** Removed `router.replace("/account")` from the Alert callback. Added a `useEffect` that watches `user` and `isAnonymous` — navigation to `/account` happens only after `onAuthStateChange` has updated the context to a real (non-anonymous) user.
  - **Lesson:** Never navigate immediately after an auth call — `onAuthStateChange` is the single source of truth for session state. Always restore a clean anonymous session on logout so the app is never in a `user = null` state.

- [x] **Project Documentation Reorganization**
  - **Summary:** Archived `auth-membership-llm-plan.md` (outdated, 1010 lines); created `project-specification.md` (480 lines, current-state focused)
  - **Changes:** Removed Phase 13 (LLM Mistake Analysis), added Phase 13 (UI/UX Upgrade), re-sequenced Phase 14 (Ads)
  - **Lesson:** Keep specs focused on current state and next steps; archive historical planning docs when they become outdated

- [x] **Created TASKS.md for Operational Tracking**
  - **Summary:** Established single living document for task tracking to avoid creating many small MD files that end up archived
  - **Structure:** Open → In Progress → Done (Recent) → Archive (quarterly)
  - **Lesson:** Single-file approach reduces overhead and keeps history searchable; archive only when needed (50+ items or 3+ months)

### 2026-06-12

- [x] **Quiz Sampling Feature Complete**
  - **Summary:** Implemented intelligent quiz sampling with repeat avoidance, part quotas (6+2+4+2+2+6 = 22 questions), pool progress tracking
  - **Files changed:** `admin/routes/quiz.js`, `admin/lib/sampling.js`, `app/quiz.tsx`, `lib/sampleQuiz.ts`
  - **Lesson:** Public API endpoint (no admin auth) needed for mobile direct access; pool progress display only for logged-in users

---

## Archive Policy

**When to archive:**
- "Done (Recent)" section exceeds 50 completed items, OR
- Completed tasks span more than 3 months

**How to archive:**
1. Create `docs/tasks-archive-YYYY-QN.md` (e.g., `tasks-archive-2026-Q2.md`)
2. Move older completed tasks from "Done (Recent)" to the archive file
3. Keep most recent month in "Done (Recent)" for easy reference

**Archive filename pattern:** `tasks-archive-YYYY-QN.md` (year + quarter, sortable)

---

## Task ID Guidelines (Optional)

- Sequential numbering: `#001`, `#002`, etc.
- Useful for referencing in commit messages: `fix: quiz timer issue (#042)`
- Not required — use freeform descriptions if preferred

## Task Type Labels

- **Bug:** Something broken that needs fixing
- **Feature:** New functionality to implement
- **UX:** User experience improvement
- **Refactor:** Code restructuring (no behavior change)
- **Doc:** Documentation update
- **Test:** Add or fix tests
- **Deploy:** Deployment or infrastructure task
