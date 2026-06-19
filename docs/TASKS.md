# Task & Issue Tracker

_Active task list for day-to-day development work. Add new tasks to **Open**, move to **In Progress** when starting, and complete with summary in **Done** section._

---

## Open

_Add new tasks here. Format: `- [ ] #N — Type: Brief description`_

- [ ] **#010 — UX: Aritcle reading page UX Issue**
  - **Summary: Currently, there are `1. raw article`, `2. footnote`, `3. translation` and `4. the start exercise button`. Firstly, clicking the footnote button to active the bottom footnote is not user friendly. secondly, I think user eyeball cannot read 3 context at the same time. we should create a UX that encouraging them try to read raw article with footnote. But if it is too difficult, then open the translation to read. Propose UX suggestions for this page. Consider the UX in Quiz page > open article reading pop up as well.**

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

<!-- Example:
- [ ] #004 — Bug: Admin portal shows wrong question count (started 2026-06-13, @claude)
-->

---

## Ready for QA

_Finished by Claude, awaiting Mickey's validation. Once validated → move to **Done**. If issues found → move back to **In Progress** with notes._

- [ ] **#020 — BUG: Strange time counting**
  - **Summary:** Fixed time formatting bug where large durations displayed incorrectly (e.g., "46780 分" for 32+ days). Updated `formatSeconds()` and `timeDelta()` in `account.tsx` and `attempt.tsx` to use appropriate units based on duration: < 1 min shows seconds; 1-59 min shows minutes (and seconds); 1-23 hours shows hours and minutes; 24+ hours shows days and hours. The 46,780-minute duration now correctly displays as "32 天 11 小時".
  - **Files changed:** `app/account.tsx`, `app/attempt.tsx`
  - **Testing needed:** Verify time formatting displays correctly in account history and attempt detail screens

- [ ] **#015 — BUG: Quiz sentence sequence type question issue**
  - **Summary:** Fixed validation bug in `SentenceOrderQuestion` where correct answers were marked wrong. Two fixes applied: (1) Added `.trim()` when splitting delimiters to handle spaces around `>` characters, and (2) Added support for comma-separated `correctAnswer` format (some questions use `,` instead of `>`). The component now handles both formats correctly.
  - **Files changed:** `components/quiz/SentenceOrderQuestion.tsx`
  - **Testing needed:** Test sentence-order questions with both comma and > delimited correct answers

- [ ] **#014 — UX: 2 similar buttons on account page**
  - **Summary:** Reviewed both sync buttons — they serve **different purposes** and both should be kept. "更新內容" (`refresh()`) performs incremental sync (only fetches changed articles since last sync), while "清除快取並重新同步" (`clearCacheAndResync()`) performs a full reset (clears cache + re-fetches everything). Per CLAUDE.md, incremental sync doesn't detect deletions, so the full resync is needed after Supabase data purges. Improved UX by clarifying their purposes: renamed "更新內容" to "檢查更新 (增量同步)" and added subtitle "完整重新下載 (修復用)" to the clear cache button. Grouped both under "內容同步" section header.
  - **Files changed:** `app/account.tsx`
  - **Testing needed:** Verify button labels are clear and both sync operations work correctly

- [ ] **#019 — UX: Homepage, `DSE操練` card should have 3 buttons**
  - **Summary:** Consolidated DSE操練 section into a single unified card with description "重點操練，準備應試" and 3 buttons inside: (1) 📝 DSE 模擬考題, (2) 🔁 溫故知新, (3) 🎯 針對性難題訓練 (coming soon). All buttons are contained within one slate-800 rounded card, creating a focused training hub on the homepage. The demon mascot remains in the header. Tapping "DSE 模擬考題" navigates directly to mock exam mode via URL params.
  - **Files changed:** `app/(tabs)/index.tsx`, `app/(tabs)/dse-training.tsx`
  - **Testing needed:** Verify single card displays with 3 buttons and navigation works

- [ ] **#011 — BUG: `Android device only` Article reading page cannot show full article content**
  - **Summary:** Fixed Android-specific rendering issue where article content appeared truncated. Root cause was text overlapping (#012) making content appear cut off.
  - **Files changed:** `components/reading/ArticleText.tsx`
  - **Testing needed:** Test on Android device - verify full article content displays

- [ ] **#012 — BUG: `Android device only` Article reading page text overlapping**
  - **Summary:** Fixed text overlapping issue on Android devices where classical Chinese text lines were rendering on top of each other. Changed from NativeWind `leading-9` class to explicit `lineHeight: 42` style property for more reliable cross-platform rendering with the Georgia font. The `text-lg` (18px) with `lineHeight: 42` gives ~2.3x line spacing, which provides better vertical clearance for classical Chinese characters on Android.
  - **Files changed:** `components/reading/ArticleText.tsx`
  - **Testing needed:** Test on Android device - verify text lines don't overlap

- [ ] **#013 — BUG: `Android device only` Quiz page > open article reading pop up cannot scroll.**
  - **Summary:** Already fixed in task #018 on 2026-06-19. The ArticlePopup scroll issue was resolved by removing nested Pressable structure that was blocking scroll gestures. Changed to absolute-positioned backdrop Pressable + plain View wrapper with ScrollView for content.
  - **Files changed:** `components/quiz/ArticlePopup.tsx` (fixed in commit 07f3d47)
  - **Testing needed:** Test on Android device - verify article popup scrolls properly

---

## Done (Recent)

_Completed tasks with summaries and lessons learned. Ordered by completion date (newest first)._

### 2026-06-19

- [x] **#018 — FEATURE: DSE mock exam questions show article labels**
  - **Summary:** DSE mock exam questions now display an article label badge above each question stem. The badge shows "📄 {article title} · 點擊查看" and is tappable to open the article popup for reference while answering. QuizShell now supports multi-article mode via the `articles` prop — when provided, it dynamically loads the correct article for each question based on `question.articleId` and displays the badge. Single-article quizzes show the "📖 文章" button instead. Fixed multiple UI issues: ArticlePopup scroll (removed nested Pressable), footnote marker width (min-w-[32px]), and QuizShell scrollability (wrapped in ScrollView).
  - **Files changed:** `lib/types.ts` (added `articleId?: string`), `app/(tabs)/dse-training.tsx` (map `article_id`, pass `articles` prop), `components/quiz/QuizShell.tsx` (multi-article support, made scrollable, hide "文章" button in multi-article mode), `components/quiz/ArticlePopup.tsx` (fixed scroll + footnote width)
  - **Validated:** ✅ Badge displays correctly, popup scrolls, footnote markers fit, question screen scrolls to Next button
  - **Lesson:** Adding new UI elements can push content off-screen. Always wrap quiz/form content in ScrollView to ensure all interactive elements remain accessible. Nested Pressables can block scroll gestures — use absolute positioned backdrop instead.

- [x] **#016 — FEATURE: DSE mock exam sampling logic (22 questions per article)**
  - **Summary:** DSE mock exam now uses backend sampling logic instead of loading all questions. New endpoint `GET /api/quiz/dse-mock/sample?userId=<uuid>` randomly picks 2-3 DSE core articles and samples 22 questions per article (6+2+4+2+2+6 across parts 1-6). Implements cross-article repeat avoidance for logged-in users. Total: 44 questions for 2 articles, 66 for 3 articles. Route order matters: specific `/dse-mock/sample` must come before parameterized `/:articleId/sample` to avoid Express matching "dse-mock" as an articleId.
  - **Files changed:** `admin/routes/quiz.js` (new endpoint, route reordering), `app/(tabs)/dse-training.tsx` (API call, fixed fallback URL to production)
  - **Validated:** ✅ Loads 2-3 articles with 44-66 questions, proper part distribution
  - **Lesson:** Express route order matters — specific paths must be defined before parameterized ones. Production fallback URLs must use production domains, not localhost. Test backend endpoints with `curl` after Railway deploy to verify they're live.

- [x] **#017 — BUG: DSE mock exam article accordion shows wrong content**
  - **Summary:** Article accordion in DSE mock lobby now displays both raw article text with footnote markers AND footnote explanations below (matching `ArticlePopup` pattern). Previously only showed segments without footnotes. Fixed line break issue where each segment created a new line — now all segments render inside a single parent `<Text>` so footnote markers appear inline. Also widened footnote marker from `w-6` to `min-w-[32px]` to prevent wrapping.
  - **Files changed:** `app/(tabs)/dse-training.tsx`
  - **Validated:** ✅ Text flows continuously with inline footnote markers, footnote explanations display properly below
  - **Lesson:** When rendering article text, all segments must be nested inside a single parent `<Text>` component (not separate `<Text>` per segment) to avoid unwanted line breaks. Match the pattern from `ArticleText.tsx` for consistency.

### 2026-06-13

- [x] **#009 — Bug: Android app icon showing default Expo icon instead of custom icon**
  - **Summary:** Android builds were using outdated Expo default icon files (`android-icon-*.png` dated October 1985) instead of the actual app icon (`icon.png`, 880KB). Updated `app.json` to point to the correct icon file and simplified the adaptive icon configuration to use only the foreground image with a white background.
  - **Files changed:** `app.json`
  - **Validated:** ✅ Correct icon now displays on Android home screen and app drawer

- [x] **#008 — Bug: Google OAuth not working on Android devices**
  - **Summary:** Google sign-in failed on Android with "invalid flow state" PKCE error. Root cause was missing Android OAuth client configuration in Google Console + malformed redirect URI (`classicalchineselearnerapp:?code=...` missing `//`). Created Android OAuth client with package name + SHA-1, added it to Supabase, and fixed redirect URI to `classicalchineselearnerapp://oauth`. Added `/oauth.tsx` route to handle callback gracefully.
  - **Files changed:** `contexts/AuthContext.tsx`, `lib/supabase.ts`, `app/oauth.tsx` (new), `app/login.tsx`
  - **External config:** Google Cloud Console (Android OAuth client), Supabase Dashboard (Site URL, Redirect URLs, Authorized Client IDs)
  - **Validated:** ✅ iOS simulator and Android device both working
  - **Lesson:** Mobile OAuth requires platform-specific configuration. Android needs its own OAuth client with package name + SHA-1 fingerprint. The redirect URI must be well-formed (`scheme://path`, not `scheme:?query`). PKCE "invalid flow state" errors often indicate redirect URI mismatch or missing client ID in the auth provider's authorized list.

- [x] **#007 — Feature: Delete user account script for testing**
  - **Summary:** Created `admin/delete-user.js` — wipes all data for a given email (quiz_answers → quiz_attempts → exercise_sessions → read_progress → profiles → auth.users). Uses `--confirm` flag instead of interactive prompts to avoid readline/dotenvx conflicts.
  - **Files changed:** `admin/delete-user.js` (new)
  - **Usage:** `node admin/delete-user.js <email>` (dry run) / `node admin/delete-user.js <email> --confirm` (actually delete)
  - **Validated:** Successfully deleted test account rkmyip3@gmail.com.

- [x] **#004 — UI: Question pool progress and DSE section info**
  - **Summary:** Homepage and DSE文章 tab now show per-article progress ("已完成 X / Y 題"), attempt count, and correct rate for logged-in users. New batch endpoint `GET /api/quiz/progress?userId=<uuid>` avoids N+1 queries. New `lib/articleProgress.ts` caches the result in-memory and is invalidated after quiz completion. DSE文章 tab gained an info banner explaining 12+8 articles, 22 questions per session, ~10 min.
  - **Files changed:** `admin/routes/quiz.js`, `lib/articleProgress.ts` (new), `app/quiz.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/dse-learner.tsx`
  - **Validated:** Progress, attempt count, correct rate, and info banner all display correctly after Railway deploy.
  - **Lesson:** The progress data comes from a **new live endpoint**, not the app bundle — the feature was invisible because `admin/routes/quiz.js` was committed but never pushed, so Railway still served the old code (endpoint returned 401). Rebuilding the iOS app can never surface a server-side feature. When a UI change depends on a new backend route, verify the live endpoint returns 200 (`curl`) before assuming a Metro/cache issue.

- [x] **#005 — Bug: Fill-blank question answer field missing in revision exercise**
  - **Summary:** `revision.tsx` hardcoded `<QuizQuestion>` for every question regardless of `question.format`. Fill-blank questions have no `options` array, so `QuizQuestion` rendered nothing interactive (same issue for `sentence-order`). Added format-dispatch in the render — `fill-blank` → `FillBlankQuestion`, `sentence-order` → `SentenceOrderQuestion`, everything else → `QuizQuestion` — matching the pattern in `QuizShell.tsx`. Also fixed `answers` state type from `Record<number, QuizAnswer>` to `Record<string | number, QuizAnswer>` and added `key={currentQuestion.id}` to reset component state per question.
  - **Files changed:** `app/revision.tsx`
  - **Validated:** Fill-blank input field now appears in revision; can advance through all question formats.
  - **Lesson:** Any screen that renders quiz questions must dispatch on `question.format` — there is no single universal question component. Reuse the dispatch pattern from `QuizShell.tsx` rather than hardcoding one renderer.

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
