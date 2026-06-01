# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start          # Start Metro bundler (Expo Go / web)
npx expo start --clear  # Start with cache cleared (required after config changes)
npx expo start --web    # Web browser preview (works without a native build)
npx expo run:ios        # Build and run on iOS Simulator (requires Xcode)
npx expo run:android    # Build and run on Android Emulator
npm test                # Run all Jest tests (mobile + admin)
npm test -- quiz.test.ts  # Run a single test file
cd admin && npm test    # Run admin API integration tests (requires admin/.env.test)
expo lint               # Lint the project
cd admin && node server.js  # Run admin portal locally (port 3001)

# Supabase data management
cd admin && node backup-supabase.js  # Backup articles, questions, quiz_prompts to admin/backups/
cd admin && node clear-supabase.js   # Clear all articles and questions (preserves quiz_prompts)
```

## Deployment

**Admin portal — Railway (auto-deploy on push to `main`)**
- Railway service linked to `mickey-ykm/classical-chinese-learner-app`, branch `main`
- **Root Directory** = `admin` in Railway service settings — Railway builds from `admin/` directly
- `railway.json` at repo root: `"buildCommand": "npm install"`, `"startCommand": "node server.js"` — no `cd admin &&` prefix (Root Directory handles that; adding it back breaks the build)
- Live at: `https://ccladmin.mickey-calligraphy.art`

**Mobile app — not yet deployed to stores**
- Development / TestFlight only at this stage
- Local testing: `npx expo run:ios` / `npx expo run:android`
- When ready for App Store / Play Store, set up EAS: `npm install -g eas-cli && eas build`

**Supabase schema changes — manual SQL in dashboard**
- All migrations run directly in the Supabase SQL editor (no CLI / migration files)
- All SQL that has been run is documented in `docs/auth-membership-llm-plan.md`
- Before running any SQL, add it to that doc first so there's a record

## Architecture

**Expo Router (file-based navigation — tabs + stack)**

The app uses a `(tabs)` group for the main 5-tab bottom navigation, with stack screens pushed on top:

```
app/
  index.tsx          # redirects to /(tabs)
  (tabs)/
    _layout.tsx      # Tabs navigator (首頁, DSE文章, 其他文章, DSE操練, 重量訓練)
    index.tsx        # 首頁 — greeting, DSE操練 banner, article previews, recent history
    dse-learner.tsx  # DSE 文章 — filtered by articleType === "dse-exam" | "dse-non-exam"
    extra-articles.tsx # 其他文章 — filtered by articleType === "other" | undefined
    dse-training.tsx # DSE 操練 — lobby + QuizShell
    weight-training.tsx # 重量訓練 — coming soon
  read.tsx           # Article reader (stack, pushed over tabs)
  quiz.tsx           # Quiz (stack, pushed over tabs)
  account.tsx        # Account / history (stack)
  attempt.tsx        # Attempt detail (stack)
  revision.tsx       # Revision chapter (stack)
```

Navigation: Tab → Read?id → Quiz?id → Score (Score rendered inside QuizShell).

**Data layer**

The mobile app reads exclusively from `lib/contentStore.ts` (never directly from Supabase or bundled JSON at runtime):

```
lib/contentStore.ts     # in-memory cache + SQLite persistence + Supabase sync
lib/contentStore.web.ts # web stub (no SQLite; in-memory + Supabase only)
lib/data.ts             # thin wrappers around contentStore
data/articles/{id}.json # bundled seed — first-launch / offline fallback only
data/quizzes/{id}.json  # bundled seed — first-launch / offline fallback only
data/index.json         # bundled article registry seed
```

`contentStore` syncs from Supabase `articles` table on app launch (`backgroundFetch`), keyed on `updated_at`. The `quiz_json` column on the `articles` row is what the mobile app reads for quiz content — it is a **derived cache**, not the source of truth.

**Admin portal (`admin/server.js`)**

Express server. Deployed on Railway at `https://ccladmin.mickey-calligraphy.art`. Reads/writes Supabase directly using the service role key. Local `assessment-config.json` is ephemeral on Railway — anything that must persist goes to Supabase.

After the Pre-Phase 12 refactor, `server.js` is ~60 lines of setup + route wiring. Logic lives in:

```
admin/
  lib/
    supabase.js          # createClient, SupabaseStore, requireSupabase
    schemas.js           # all Zod schemas (ArticleSchema, QuizSchema, QuestionUpsertSchema…)
    article-helpers.js   # articleToRow, rowToExercise, rowToIndexEntry, rebuildQuizJson, upsertQuestions…
    quiz-prompts.js      # readQuizPromptsAsync, writeQuizPromptsAsync, deleteQuizPromptAsync…
    openrouter.js        # callOpenRouter, estimateCost, normalizeOptions
    generate-runs.js     # shared generateRuns / runs maps (in-memory async job state)
  routes/
    auth.js              # POST /api/admin/login, logout, GET /api/admin/me
    exercises.js         # GET/POST/PUT/DELETE /api/exercises + PATCH dse-core
    questions.js         # GET/POST/PUT/DELETE/PATCH /api/questions + bulk-delete
    prompts.js           # GET/POST/PUT/DELETE /api/quiz-prompts
    generate-quiz.js     # POST /api/exercises/:id/generate-quiz + status
    generate-article.js  # POST /api/generate-article + status
    assessment.js        # POST /api/assessment/run + config + status + download + history
```

The admin frontend (`admin/public/`) is also split — `index.html` is HTML-only; all JS lives in `admin/public/js/` as native ES modules (`type=module`).

**Quiz state machine (`components/quiz/QuizShell.tsx`)**

All quiz state lives here. Routing by question format:
- `fill-blank` → `FillBlankQuestion`
- `sentence-order` → `SentenceOrderQuestion`
- `selectCount > 1` (mc-multi) → `MCQuestion` (multi-select with explicit submit button)
- everything else → `QuizQuestion` (single-choice, immediate reveal on tap)

**Styling: NativeWind v4**

Uses `className` props on React Native primitives (imported directly from `react-native` — no special wrapper needed). Styles are compiled at bundle time via `metro.config.js` + `withNativeWind`. The JSX transform is handled by `babel.config.js`:

```js
presets: [
  ["babel-preset-expo", { jsxImportSource: "nativewind" }],
  "nativewind/babel",
]
```

**NativeWind does not work in Expo Go** — use `--web` for quick checks or `expo run:ios` / `expo run:android` for native testing.

## Key conventions

- Path alias `@/` maps to the project root (e.g. `import { getArticle } from "@/lib/data"`).
- Georgia font (`style={{ fontFamily: "Georgia" }}`) is applied to classical Chinese text throughout.
- Amber is the primary accent colour (`amber-500` / `amber-600`); slate-50 is the background.
- `hitSlop={12}` is used on small touch targets like back buttons.

## Data flow invariants

These must never be violated. Violating them causes silent data loss that only surfaces at runtime.

**Mobile app sync behavior**
- `contentStore.ts` syncs from Supabase on app launch via `backgroundFetch()` (once per session)
- Incremental sync uses `updated_at > last_sync_at` — only detects changed articles, not deleted ones
- After a Supabase data purge, use "清除快取並重新同步" button in Account screen to force a full re-sync
- `clearCacheAndResync()` clears SQLite + in-memory cache, then fetches all published articles from Supabase
- Bundled seed data (18 articles in `data/articles/` and `data/quizzes/`) is only used as fallback if Supabase returns nothing

**questions table is the source of truth for quiz content**
- `questions` table in Supabase holds all question data (both draft and published)
- `quiz_json` on the `articles` row is a **derived cache** rebuilt from published questions
- Never treat `quiz_json` as the source of truth for editing or counting questions
- The listing "QUIZZES" column count and `hasQuizzes` flag both derive from `quiz_json`

**rebuildQuizJson must be called after any question state change**
- Call `rebuildQuizJson(articleId)` after every: question publish, question edit (if published), question delete, bulk delete, bulk publish
- This rewrites `quiz_json` + bumps `updated_at` on the articles row
- Bumping `updated_at` triggers the mobile app's incremental sync on next launch
- Failure to call it = listing count stays wrong + mobile app never sees the new questions
- Both POST and PUT question routes check `status === "published"` and call `rebuildQuizJson` accordingly
- Bulk operations (bulk-delete, bulk-publish) group by article_id and call `rebuildQuizJson` once per article (not once per question)

**articleToRow must never include quiz_json unless a quiz payload is present**
- `articleToRow(article, meta)` builds the Supabase UPDATE payload
- Only include `quiz_json` when `hasQuizPayload` is true: `...(hasQuizPayload ? { quizJson: finalQuiz } : {})`
- Unconditionally including `quiz_json: null` wipes the existing quiz on every article metadata save

**PUT /api/exercises/:id must not call upsertQuestions without a real quiz payload**
- Guard with `if (hasQuizPayload) await upsertQuestions(id, finalQuiz)`
- `upsertQuestions` starts with `DELETE WHERE article_id = X` — calling it with null wipes all questions

**saveArticleDetail() frontend must include all fields in the PUT body**
- Fields present in the UI but missing from the PUT body silently default to wrong values server-side
- Required fields: `article`, `articleType`, `isChallenge`, `isFree`, `status`, `expectedMinutes`
- Missing `articleType` → `article_type` written as `"other"` and `is_dse_core` set to false

**article_type drives is_dse_core — never set them independently**
- `is_dse_core` is derived: `is_dse_core = (articleType === 'dse-exam')` in `articleToRow`
- The DSE Training screen queries `is_dse_core = true` — wrong `article_type` = article invisible to DSE training

**quiz_prompts.id is text, not uuid**
- The `quiz_prompts` table uses human-readable slug IDs (e.g. `"phase7-multi-type"`)
- The Supabase schema was altered: `ALTER TABLE quiz_prompts ALTER COLUMN id TYPE text`
- Do not revert this or create new uuid-keyed prompt tables

**quiz-prompts routes must use async Supabase-backed functions**
- Use `readQuizPromptsAsync` / `writeQuizPromptsAsync` / `deleteQuizPromptAsync`
- Never use `readQuizPrompts()` / `writeQuizPrompts()` in route handlers — these write local file only, which is ephemeral on Railway

**Never swallow Supabase errors silently**
- Do not wrap Supabase calls in try/catch that only `console.warn` — the route will return success while data was not saved
- Always throw or return an error response so the UI can surface the failure

**rebuildQuizJson must write camelCase fields to match the mobile Quiz type**
- `contentStore.ts` casts `quiz_json` directly to the TypeScript `Quiz` type with no field mapping
- Fields in `quiz_json` must match the TypeScript names exactly: `sequenceTokens` not `sequence_tokens`, `selectCount` not `select_count`, `correctAnswer` not `correct_answer`
- Using snake_case silently produces `undefined` on the mobile side (no runtime error, just missing data)

## Admin frontend conventions

**Question modal (`admin/public/js/questions.js`)**
- `editingQuestionId` is set by `openQuestionModal(id)` where `id` comes from HTML as a string
- Always compare with `String(x.id) === String(id)` — Supabase returns numeric IDs but HTML onclick passes strings
- Option input selector must be `input[id^="qm-opt-"]` (not `[id^="qm-opt-"]`) — the wrapper div also has `id="qm-opt-row-X"` and has no `.value`, causing TypeError
- `q.type` from Supabase may not match dropdown values (e.g. AI-generated `"comprehension"`) — resolve to a valid dropdown value using `q.format` as fallback
- Two save buttons: "Save Question" (saves as draft/keeps current status) and "Save and Publish" (saves + sets status to published)
- `saveAndPublishQuestion()` temporarily overrides status dropdown to "published" before calling `saveQuestion()`
- Question type labels: 5 checkboxes for pedagogical categorization (字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點)
- `openQuestionModal()` sets checkboxes based on `q.question_types` array; `saveQuestion()` collects checked values into `question_types` array

**Question listing and bulk operations**
- Draft questions have checkboxes for bulk selection
- "Publish Selected" button bulk-publishes selected draft questions via `POST /api/questions/bulk-publish`
- "Delete Selected" button bulk-deletes selected draft questions via `POST /api/questions/bulk-delete`
- Both bulk operations validate non-empty selection and show confirmation dialog
- Backend filters to only draft questions (bulk-publish skips already published ones)
- Backend groups by article_id and calls `rebuildQuizJson()` once per article (not once per question)

**Add New Article panel (`admin/public/index.html`)**
- Article Details form (top-left) contains all 4 metadata fields: `na-article-type`, `na-expected-minutes`, `na-is-challenge`, `na-is-free`
- The Review Generated Article section (bottom) has only the Article JSON textarea + Save button — no duplicate metadata fields
- `saveGeneratedArticle()` reads all 4 IDs from the Article Details form

**articleType must be fetched from Supabase and stored in ArticleMeta**
- `ArticleEntry.articleType` drives tab filtering (DSE文章 vs 其他文章)
- `contentStore.ts` must include `article_type` in the Supabase select query and map it to `meta.articleType`
- Seed articles have no `articleType` in SQLite cache — after adding `article_type` to the query, users must delete + reinstall the app to force a full re-sync (incremental sync only fetches rows where `updated_at` changed)
- Tab filters: `dse-learner` = strict (`articleType === "dse-exam" | "dse-non-exam"`); `extra-articles` = fallback (`articleType === "other" || !articleType`)

**MC option shuffling in QuizShell**
- `QuizShell` shuffles `options` array (Fisher-Yates) once per quiz session at mount via `useState(() => rawQuestions.map(...))`
- `correctAnswer` stores option **keys** (e.g. `"A"`, `"A,C"`), not text — keys travel with shuffled objects so answer-checking is unaffected
- `SentenceOrderQuestion` already shuffles `sequenceTokens` internally — no change needed

**react-native-svg is available for inline vector illustrations**
- `react-native-svg@15.12.1` is installed
- Use `Svg`, `Circle`, `Ellipse`, `Path`, `Polygon`, `Line` etc. for custom icon/mascot components
- Do not use emojis for UI visuals when an SVG component is more appropriate



Before adding any new field or route to `admin/server.js`, read:
1. `articleToRow()` — does the new field need to be added here?
2. `rowToExercise()` and `rowToIndexEntry()` — does the new field need to be returned to the frontend?
3. The PUT route destructuring — is the new field destructured from `req.body`?
4. The frontend `saveArticleDetail()` body — is the new field included in the PUT payload?
5. Any function that writes to the same Supabase table — could the new change conflict?

## Supabase schema notes

All SQL migrations that have been run are documented in `docs/auth-membership-llm-plan.md`. Key non-obvious schema facts:
- `quiz_prompts.id` is `text` (altered from `uuid`)
- `questions.select_count` and `questions.sequence_tokens` were added via ALTER TABLE
- `articles.article_type` CHECK constraint: `('dse-exam', 'dse-non-exam', 'other')`
- `questions.format` CHECK constraint was replaced: now `('mc', 'fill-blank', 'sentence-order')`
- The original unnamed `format` constraint `('mc','fill-blank','short','long')` may still exist alongside the named one — inserting `'sentence-order'` will fail if the old constraint was not dropped
