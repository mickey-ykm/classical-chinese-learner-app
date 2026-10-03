# CLAUDE.md

Guidance for Claude Code in this repo. Current state and roadmap: `docs/project-specification.md`. Active work: `docs/TASKS.md`. Old logs and plans: `docs/archive/`.

## Collaboration rules

- Wait for approval before implementing a proposal. Ask before any git commit or push.
- Debug hypothesis-first: check app code before SQL, fix one bug at a time, stop and re-plan on the second failed loop.

## Commands

```bash
npx expo start [--clear]   # Metro (--clear required after config changes); --web for browser preview
npx expo run:ios | run:android   # native build (needed for NativeWind; Expo Go doesn't support it)
npm test                   # Jest (mobile + admin); npm test -- quiz.test.ts for one file
cd admin && npm test       # admin API integration tests (needs admin/.env.test)
cd admin && node server.js # admin portal locally (port 3001)
expo lint

# Supabase data scripts (cd admin)
node backup-supabase.js        # backup articles/questions/quiz_prompts to admin/backups/
node clear-supabase.js         # clear articles + questions (keeps quiz_prompts)
node rebuild-all-quizzes.js    # rebuild quiz_json for every article
node clean-user-records.js <userId>        # wipe a test user's quiz records
node delete-user.js <email> [--confirm]    # delete a user and all data (dry-run by default)
```

## Deployment

- **Admin portal:** Railway, auto-deploys on push to `main`; live at `https://ccladmin.mickey-calligraphy.art`. Railway Root Directory = `admin`, so `railway.json` uses `npm install` / `node server.js` with **no** `cd admin &&` (adding it breaks the build). Server-side changes only take effect after pushing; verify the live endpoint returns 200 before blaming Metro/cache.
- **Mobile app:** TestFlight/dev only. Android APK: `eas build -p android --profile preview`. Any new `EXPO_PUBLIC_*` var in `.env` must also be pushed with `eas env:create`, or it is `undefined` in EAS builds (the app crashes on launch).
- **Supabase schema changes:** run manually in the SQL editor (no migration CLI). Add the SQL to `docs/project-specification.md` (or `docs/migrations/`) first. Historical SQL: `docs/archive/auth-membership-llm-plan.md`.

## Architecture

**Navigation (Expo Router).** Four visible tabs in `app/(tabs)/`: `index` (首頁), `chapters` (篇章), `practice` (操練), `account` (帳戶). `dse-training.tsx` is a hidden tab (`href: null`) reached from the practice hub. Stack screens in `app/`: `read`, `quiz`, `attempt`, `exercise-history`, `weight-training`, `performance-report`, `revision-article`, `revision-part`, `login`, `magic-link-sent`, `oauth`, `about`/`terms`/`privacy`, `design-system` (component showcase).

Flow: tab → `read?id` → `quiz?id` → score (rendered inside `QuizShell`).

**Revision.** `/performance-report` (analysis dashboard, from account) → `/revision-article` or `/revision-part`. Backend `admin/lib/revision-helpers.js` merges `questions` (Parts 1–6) and `cross_article_questions` (Parts 7–8). A question leaves the mistake list once answered correctly after its last wrong answer.

**Mobile data layer.** The app reads only from `lib/contentStore.ts` (in-memory + SQLite + Supabase sync; `contentStore.web.ts` is the no-SQLite web stub). `lib/data.ts` is a thin wrapper. Bundled `data/articles`, `data/quizzes`, `data/index.json` (18 articles) are a first-launch/offline fallback only. Quiz questions are sampled live from the API (`lib/sampleQuiz.ts`), not read from `quiz_json`.

**Admin portal (`admin/`).** Express server; `server.js` is only setup and route wiring. Logic lives in `admin/lib/` (supabase, schemas (Zod), article-helpers, quiz-prompts, openrouter, sampling, weight-training-sampling, revision-helpers, cross-article-helpers, generate-runs) and `admin/routes/` (auth, exercises, questions, prompts, generate-quiz, generate-article, assessment, quiz, weight-training, cross-article-questions, revision). Frontend is `admin/public/` with native ES modules in `js/`. Local `assessment-config.json` is ephemeral on Railway; anything that must persist goes to Supabase.

**Quiz state machine (`components/quiz/QuizShell.tsx`).** Dispatch on `question.format`: `fill-blank` → `FillBlankQuestion`; `sentence-order` → `SentenceOrderQuestion`; `selectCount > 1` → `MCQuestion` (explicit submit); else `QuizQuestion` (instant reveal). **Every quiz-rendering screen (QuizShell, revision, etc.) must dispatch this way**, or non-MC questions render without an input. QuizShell shuffles MC options once at mount, then re-keys A/B/C/D and remaps `correctAnswer`; true/false questions (two options containing 正確/錯誤) are not shuffled. Multi-article mode (DSE mock, weight training) uses the `articles` prop plus per-question `articleId` and the shared `ArticlePopup` viewer.

**Styling.** NativeWind v4 (`className`) works on native builds and web, not Expo Go. For anything non-trivial use inline `style` with Jiān tokens (see Design system). `@/` maps to the project root.

## Data flow invariants (violations cause silent data loss)

**Content / sync**
- `questions` is the source of truth. `articles.quiz_json` is a derived cache; never edit or count from it (the listing "QUIZZES" count and `hasQuizzes` do derive from it).
- Call `rebuildQuizJson(articleId)` after every question state change: publish, edit of a published question, delete, bulk delete, bulk publish. It rewrites `quiz_json` and bumps `updated_at`, which is what triggers the mobile incremental sync. Bulk operations group by article and call it once per article.
- `rebuildQuizJson` must write **camelCase** (`sequenceTokens`, `selectCount`, `correctAnswer`, `questionTypes`): `contentStore.ts` casts `quiz_json` to the TS `Quiz` type with no mapping, so snake_case silently becomes `undefined`.
- Mobile sync runs once per session via `backgroundFetch()` using `updated_at > last_sync_at`, and removes orphans (cached articles no longer published in Supabase) each sync. "完整重新下載" in Account (`clearCacheAndResync()`) forces a full re-sync. Seed data is used only if Supabase returns nothing.
- `articleType` must be in the Supabase select and `ArticleMeta`; it drives the 篇章 tab filtering. After adding a field to the select, devices need a full re-sync (incremental sync only fetches changed rows).

**Admin routes**
- `articleToRow(article, meta)`: include `quiz_json` only when a quiz payload exists (`...(hasQuizPayload ? { quizJson: finalQuiz } : {})`); otherwise every metadata save wipes the quiz.
- `PUT /api/exercises/:id`: only call `upsertQuestions` when `hasQuizPayload` (it starts with `DELETE WHERE article_id = X`).
- `is_dse_core` is derived from `article_type` (`articleType === 'dse-exam'`) in `articleToRow`; never set independently. DSE training queries `is_dse_core = true`.
- Frontend `saveArticleDetail()` must send all of `article`, `articleType`, `isChallenge`, `isFree`, `status`, `expectedMinutes`; a missing `articleType` is written as `"other"`.
- Before adding a field or route in `admin/server.js` or its routes, check: `articleToRow()`, `rowToExercise()` / `rowToIndexEntry()`, the PUT destructuring, the `saveArticleDetail()` body, and any other writer to the same table.
- Express routes match top-to-bottom: define specific paths (`/dse-mock/sample`, `/weight-training/*`) before parameterized ones (`/:articleId/sample`).
- Quiz-prompt routes use the async Supabase-backed `readQuizPromptsAsync` / `writeQuizPromptsAsync` / `deleteQuizPromptAsync` (the sync versions write an ephemeral local file). `quiz_prompts.id` is `text` (slug), not uuid.
- Never swallow Supabase errors (no try/catch that only `console.warn`s): throw or return an error response so the UI surfaces it.

**IDs**
- `Question.id` / `QuizAnswer.questionId` are `string | number` (Supabase = UUID string, legacy bundled = number). `quiz_answers.question_id` is `text`.

## Quizzes and sampling

- **Article quiz** (`app/quiz.tsx` → `GET /api/quiz/:articleId/sample?userId=`): public (mounted before the admin auth guard). Quotas in `admin/lib/sampling.js`: parts 1–6 = 6+2+4+2+2+6 = 22 questions. Repeat avoidance: unseen first, then least-recently-seen. Response includes `poolProgress`, shown as "已見過 X / Y 題" for logged-in users only. Test page: `/test-sampling.html` on the admin site.
- **DSE mock** (`GET /api/quiz/dse-mock/sample`): picks 2–3 `is_dse_core` articles, 22 questions each (44 or 66 total), with cross-article repeat avoidance.
- **Weight training 針對性難題訓練** (`admin/routes/weight-training.js`, `admin/lib/weight-training-sampling.js`, `app/weight-training.tsx`): 5 Part 7 + 5 Part 8 questions from `cross_article_questions` (linked to articles via `cross_article_question_articles`), repeat avoidance over the last 100 sessions, graceful fallback to anonymous sampling. Endpoints: `GET /api/quiz/weight-training/{progress,sample}`, `POST .../session`. Authored in the admin page `/cross-article-questions.html`; a question must be `published` to be sampled.
- **Scoring:** single-select = 1 point. Multi-select awards 1 mark per correct selection with no penalty for wrong ones; `points` = number of correct answers (auto-calculated on save), so totals can exceed 10 or 22.
- **Logging:** all exercise types (article quiz, DSE training, weight training, revision) write to `exercise_sessions` (`kind`, nullable `user_id` for anonymous) and `exercise_answers` (`points_earned`). Weight/DSE sessions have `article_id = NULL`. `user_answer` serialization: MC `"A"`, multi-select `"A,C"`, fill-blank = the typed text, sentence-order `"t1>t2>t3"`. The old `quiz_attempts` / `quiz_answers` tables are legacy (history was migrated); `admin/lib/sampling.js` may still query both.

## Admin frontend conventions

- Question modal (`admin/public/js/questions.js`): IDs come from HTML as strings and from Supabase as numbers, so compare with `String(x.id) === String(id)`. Select option inputs with `input[id^="qm-opt-"]` (the wrapper div also matches the bare selector and has no `.value`). `q.type` can hold AI values like `"comprehension"`; fall back to `q.format` when it isn't a valid dropdown value.
- Two save buttons: "Save Question" (keeps status) and "Save and Publish" (temporarily forces status = published, then saves). Draft questions have checkboxes for bulk publish / delete (`POST /api/questions/bulk-publish`, `bulk-delete`; non-draft rows are skipped).
- Five question-type labels (字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點) stored as `questions.question_types text[]`.
- Add New Article: all four metadata fields (`na-article-type`, `na-expected-minutes`, `na-is-challenge`, `na-is-free`) live in the Article Details form; `saveGeneratedArticle()` reads them from there.
- New articles go in through the admin portal (generate or paste JSON), not by editing bundled JSON. Files a user supplies are often flat-format; normalize to the app schema first.

## Supabase schema notes

- `articles.article_type` CHECK: `('dse-exam','dse-non-exam','other')`; `questions.format` CHECK: `('mc','fill-blank','sentence-order')`. The old unnamed constraint `('mc','fill-blank','short','long')` may still exist and would block `'sentence-order'` inserts.
- `questions.select_count`, `sequence_tokens`, `question_types` were added via ALTER TABLE.
- Full table list: `docs/project-specification.md` and `docs/database-schema.dbml`.

## Auth

- Supabase Auth with Google OAuth (PKCE via `expo-web-browser`, not the native Google SDK) and magic-link email OTP (`signInWithEmail()` → `signInWithOtp`). Both use redirect `classicalchineselearnerapp://oauth` (must be a well-formed URI with a path, or PKCE fails with "invalid flow state"), handled by `app/oauth.tsx`.
- `flowType: pkce`, a WebCrypto polyfill, and regex extraction of the auth code are all required. Google client IDs (iOS + Android) must be listed under Supabase → Providers → Google → Authorized Client IDs. Android needs its own OAuth client (package `com.mickey_ykm.classicalchineselearnerapp` + EAS keystore SHA-1).
- `onAuthStateChange` is the single source of truth: never navigate right after an auth call; navigate from an effect watching `user`. `signOut()` re-signs in anonymously so the app is never user-less.
- Magic link: Supabase limits OTP to roughly 1 email/min per address; the free default sender allows only ~2/hour, so Gmail SMTP is configured. Anonymous users are detected with `!user?.email`.
- The `handle_new_user` trigger function needs `set search_path = ''` or new-user creation fails with "Database error saving new user".
- Debug OAuth on the iOS simulator first (fast logs) before spending EAS Android builds.

## Design system: Jiān (箋)

Tokens and components in `components/jian/` (`@/components/jian`): `JianColors` (paper `#f4f0e6`, ink levels, vermilion/jade/amber accents), `JianTypography` (Noto Serif TC / Noto Sans TC / Newsreader numerals), `JianRadius` (card 11, button 6, badge 20), `JianSpacing`, `getSerifFont(weight)`, plus `Button`, `Badge`, `Card`, `ProgressBar`, `SegmentedControl`. `Logo` and `Mascot` are in `components/`. Component showcase: `app/design-system.tsx`. Mockups: `docs/design/ui-revamp-html-mock-up/` (HTML), `docs/design/svgs/` (mascots).

Patterns:
- **Seal icon:** 34×34 box, radius 5, 1.4px vermilion border and tint, bold serif character (篇 / 基 / 重).
- **Section header:** sans 10–11px, `letterSpacing: 2`, `ink3`, spaced characters ("整 體 統 計").
- **Card:** `surface`/`surface2`, 1px `line` border, radius `JianRadius.card`, padding 14–16.
- **Multi-article viewer** (`ArticlePopup`): drag handle, numbered article tabs, 原文 tab (translation tab not yet active), scrollable text plus footnotes, "返回作答" button.
- Use `react-native-svg` for icons and mascots, not emoji. Use `Pressable` with `hitSlop={8}` for small targets.

## Cross-platform UI gotchas (Android vs iOS)

- Always set an explicit numeric `lineHeight` in `style` (not NativeWind `leading-*`); Android lays out custom fonts differently. Avoid `gap` with conditional children.
- Tappable inline text (footnote markers): `<Pressable hitSlop={8}>`, not nested `<Text onPress>`.
- Wrap quiz, form and modal content in `ScrollView`; don't wrap a `ScrollView` in a `Pressable` (it blocks scrolling). For modal backdrops use an absolutely positioned sibling `Pressable`.
- Fonts: load with `useFonts` in the root layout using relative `require("../assets/fonts/X.otf")` (the `@/` alias doesn't work there); verify downloads with `file assets/fonts/*.otf` (GitHub can return HTML error pages); log `fontError` and render without fonts rather than blocking on a blank screen.
- Use `FlatList` for swipeable lists.

## CJK pitfalls

- Match both half-width `()` and full-width `（）` in regexes (`[(（]`, `[)）]`); this once left 3 articles unfixed after a regex fixed 8.
- Serif for classical text uses Noto Serif TC via `getSerifFont`; older screens may still use Georgia.
