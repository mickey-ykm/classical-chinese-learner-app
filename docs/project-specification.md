# Classical Chinese Learner App — Project Specification

_Last updated: 2026-06-13_

## Overview

A mobile learning app (iOS/Android) for Classical Chinese comprehension, targeting 中四–中六 students preparing for HKDSE exams. Built with Expo + React Native, Supabase backend, and an admin portal for content management.

**Current Status:** Phases 1–11 complete, including quiz sampling feature (completed 2026-06-12). Pre-Phase 12 refactor and automated testing complete. Next: Phase 12 (RevenueCat subscription integration).

---

## Current Architecture

### Mobile App Stack

- **Framework:** Expo (SDK 52+), React Native, Expo Router (file-based navigation)
- **Styling:** NativeWind v4 (Tailwind CSS for React Native)
- **Database:** Supabase (PostgreSQL) + SQLite (local cache via `expo-sqlite`)
- **Auth:** Supabase Auth with Google OAuth (PKCE flow via `expo-web-browser`)
- **Navigation:** Tab-based (5 tabs) + stack screens for read/quiz/account/revision

### Admin Portal Stack

- **Backend:** Express.js on Node.js
- **Hosting:** Railway (auto-deploy from GitHub `main` branch)
- **URL:** `https://ccladmin.mickey-calligraphy.art`
- **Auth:** Session-based (bcrypt + Supabase-backed session store)
- **Frontend:** Vanilla JS (ES modules) + HTML + CSS

### Content Delivery

```
Mobile App (runtime)
  ├─ SQLite cache (persisted, instant access)
  ├─ In-memory store (fast lookups)
  └─ Supabase sync (background fetch on launch, incremental via updated_at)

Bundled seed data (data/articles/*.json, data/quizzes/*.json)
  └─ First-launch fallback only; never used after successful sync

Admin Portal
  └─ Writes directly to Supabase (articles, questions, quiz_prompts tables)
```

**Key principle:** `quiz_json` on the `articles` table is a **derived cache** rebuilt from `questions` table. Never edit `quiz_json` directly.

---

## Feature Set (Current)

### ✅ Completed Features

#### Core Learning Experience
- **Article Reading:** Classical Chinese passages with footnotes, modern translation, segments
- **Quiz Exercises:** 22-question quizzes sampled from question pools per article
- **Question Types:** MC (single/multi), true-false, fill-blank, sentence-order
- **Scoring & History:** Per-attempt scoring, history tracking, detailed attempt reviews
- **DSE Training Mode:** Random sampling from DSE-core articles for exam practice
- **Quiz Sampling:** Intelligent sampling with repeat avoidance, part quotas (6+2+4+2+2+6), pool progress tracking

#### User Features
- **Google Sign-In:** Optional auth (guests have full read/quiz access)
- **Progress Sync:** Read progress + quiz history synced to cloud for logged-in users
- **Account Dashboard:** History, stats, profile management
- **Content Updates:** Manual sync button + automatic background fetch on launch

#### Content Management (Admin)
- **Article CRUD:** Create, edit, publish/draft articles with metadata
- **Question Pool Management:** Per-article question pools with draft/publish workflow
- **Question Generation:** LLM-powered quiz generation (OpenRouter integration)
- **Article Generation:** LLM-powered article translation and formatting
- **Bulk Operations:** Bulk publish, bulk delete for draft questions
- **Quiz Prompt Library:** Reusable LLM prompts for quiz generation
- **Session Management:** Persistent admin sessions across Railway restarts

#### Data & Validation
- **Zod Schema Validation:** Shared schemas between mobile + admin
- **Draft/Publish Workflow:** Questions start as drafts, published individually
- **Version History:** Article snapshots on every save (not yet exposed in UI)
- **Content Sync:** Incremental sync based on `updated_at` timestamps
- **Cache Management:** Clear cache + force re-sync button for users

### ✅ Also completed (since the 2026-06-13 version)

- **Magic-link email login** alongside Google Sign-In
- **Weight Training (針對性難題訓練):** cross-article Part 7/8 questions, smart sampling, partial-credit scoring, admin page `/cross-article-questions.html`
- **DSE mock exam:** 2–3 articles, 44–66 questions, multi-article viewer
- **Revision system:** `/performance-report` → `/revision-article` / `/revision-part`, unified over `questions` and `cross_article_questions`
- **Unified exercise logging:** `exercise_sessions` + `exercise_answers` for every exercise type, including anonymous users
- **Jiān design system (Phase 13 UI/UX upgrade):** merged to `main` (2026-07). 4 tabs: 首頁, 篇章, 操練, 帳戶

### ⬜ Not Yet Started

- **RevenueCat Subscriptions:** (Phase 12) Pro membership, in-app purchases
- **Content Gating:** Phase 11 UI exists (`isArticleFree`, `UpgradeModal` placeholders); needs RevenueCat integration
- **Ads:** (Phase 14) AdMob integration for free tier monetization
- **Backlog features:** onboarding, streaks, badges, charts, SRS vocab, widget, font size. See `docs/TASKS.md`

---

## Data Model

### Supabase Tables

#### Core Content
```sql
articles
  - id (text, PK)                    -- e.g. "wang-rong-he-jiao"
  - title, source, segments, footnotes, modern_translation, title_footnote_id
  - article_type (dse-exam | dse-non-exam | other)
  - is_dse_core (boolean, derived from article_type)
  - is_challenge, is_free, expected_minutes
  - quiz_json (jsonb, derived cache from questions table)
  - status (draft | published | archived)
  - created_at, updated_at
  
  Purpose: Classical Chinese article content. Mobile app reads quiz_json directly at 
  runtime (cached via contentStore). Admin portal manages via CRUD UI.

questions
  - id (uuid, PK)
  - article_id (FK to articles)
  - type (mc-single | mc-multi | true-false | fill-blank | sentence-order)
  - format (mc | fill-blank | sentence-order)
  - part (1-6, for quiz sampling part quotas)
  - points, stem, options, correct_answer, explanation, source_excerpt
  - select_count (for mc-multi), sequence_tokens (for sentence-order)
  - question_types (array, pedagogical labels: 字詞解釋, 語句背誦, etc.)
  - status (draft | published | archived)
  - created_at, updated_at
  
  Purpose: Question pool per article (50+ questions each). Published questions compiled 
  into articles.quiz_json. Each quiz samples 22 questions with smart repeat avoidance.

quiz_prompts
  - id (text, PK)                    -- human-readable slug, not uuid
  - name, description, prompt_template, default_model
  - created_at, updated_at
  
  Purpose: Reusable LLM prompts for quiz generation. Admin selects prompt → generates 
  questions via OpenRouter → saves as drafts for review.

cross_article_questions
  - id (uuid, PK)
  - question_text, format, part (7 or 8), options, correct_answer, explanation
  - select_count, points (auto-calculated from correct_answer count)
  - status (draft | published)
  - created_at, updated_at
  
  Purpose: Weight Training questions that can relate to multiple articles. Part 7/8 only.
  Supports multi-select with partial credit scoring.

cross_article_question_articles
  - question_id (FK to cross_article_questions), article_id (FK to articles)
  
  Purpose: Many-to-many junction table linking cross-article questions to related articles.
  Shown as "Related Articles" buttons in Weight Training quiz UI.
```

#### User Data
```sql
profiles
  - id (uuid, FK to auth.users)
  - email, display_name, avatar_url
  - revenuecat_id, is_pro
  - updated_at
  
  Purpose: User profile data. Auto-created on signup via trigger. is_pro synced via 
  RevenueCat webhook (Phase 12). Anonymous users have no profile row.

read_progress
  - user_id, article_id
  - read_at
  
  Purpose: Tracks which articles user has read. Synced from mobile AsyncStorage on first 
  login. Used for "continue reading" and completion badges.

exercise_sessions
  - id, user_id, article_id
  - kind (article-quiz | weight-training | dse-training)
  - question_type (for weight-training)
  - question_ids (uuid array)
  - started_at, finished_at, total_seconds, expected_seconds
  - score, total_points
  
  Purpose: Unified exercise session tracking for ALL quiz types. Supports anonymous users 
  (user_id can be NULL). Replaces legacy quiz_attempts table (dropped 2026-06-27).

exercise_answers
  - id, session_id, question_id (uuid)
  - user_answer, is_correct, points_earned
  
  Purpose: Individual answers within an exercise session. Supports cross-article questions 
  and partial credit scoring. Used by all exercise types.
```

#### Admin
```sql
admin_users
  - id, email, password_hash, display_name
  - created_at
  
  Purpose: Admin portal users. Separate from end-user auth. Password hashed with bcrypt.
  Bootstrap via scripts/create-admin.ts.

admin_sessions
  - sid (text, PK), sess (jsonb), expires_at
  
  Purpose: Supabase-backed session store for admin portal. Survives Railway restarts 
  (replaces in-memory express-session). Auto-cleanup on expiry via index.

article_versions
  - id, article_id, snapshot (jsonb)
  - edited_by, edited_at
  
  Purpose: Audit log. Every article save creates a version snapshot for revert capability. 
  Full article + metadata stored as jsonb.
```

### Mobile Data Flow

```
App Launch
  ↓
Load from SQLite cache (instant)
  ↓
Background fetch from Supabase (once per session)
  ├─ SELECT * FROM articles WHERE updated_at > last_sync_at AND status = 'published'
  └─ Upsert to SQLite + in-memory cache
```

**Critical invariants:**
- `quiz_json` is rebuilt via `rebuildQuizJson()` after any question state change
- Mobile app reads `quiz_json` directly (no JOIN to questions table at runtime)
- Incremental sync detects changed articles, not deleted ones (use "清除快取並重新同步" after data purge)

---

## Quiz Sampling System

**Implemented:** 2026-06-12  
**API Endpoint:** `GET /api/quiz/:articleId/sample?userId=<uuid>`

### How It Works

1. **Part Quotas:** Each quiz samples 22 questions: 6 (Part 1) + 2 (Part 2) + 4 (Part 3) + 2 (Part 4) + 2 (Part 5) + 6 (Part 6)
2. **Repeat Avoidance:** Prioritizes unseen questions; when a part runs short, fills from least-recently-seen (by `quiz_attempts.completed_at`)
3. **Pool Progress:** Tracks `totalInPool`, `seenCount`, `attemptNumber`, `estimatedAttemptsToComplete` per article per user
4. **Anonymous Users:** Get random sampling without repeat avoidance; no pool progress display

### Mobile Integration

- `app/quiz.tsx` calls `sampleQuiz(articleId, user?.id)` instead of loading `quiz_json` directly
- Pool progress ("已見過 X / Y 題") displayed for logged-in users only
- Progress re-fetched when returning to quiz entry screen after completing a quiz (`useFocusEffect`)

### Testing

Test at: `https://ccladmin.mickey-calligraphy.art/test-sampling.html`

### Cross-Article Question Batch Import

Admin page `/cross-article-questions.html` → **Import JSON**; backend `POST /api/cross-article-questions/import` (`{ questions, dryRun?, allowDuplicates? }`; logic in `admin/lib/cross-article-helpers.js`). No schema change.

- Input: a JSON array, or `{ "questions": [...] }` (max 200 per batch).
- Always imported as `draft` (any `status` in the JSON is ignored); publish afterwards via "Publish Imported" or the list's bulk publish.
- **All-or-nothing:** any invalid question or unknown article ID rejects the whole batch (HTTP 400, errors listed per question index). If linking articles fails after insert, inserted rows are deleted.
- **Duplicates** (same `part` + `questionText`, in the DB or earlier in the batch): `dryRun` reports them; a real import returns 409 unless `allowDuplicates: true`. The UI asks the admin to confirm.

```json
[
  {
    "part": 7,
    "format": "mc",
    "questionText": "下列哪一項「之」字的用法與其他不同？",
    "options": ["…", "…", "…", "…"],
    "correctAnswer": "B",
    "explanation": "…",
    "questionTypes": ["字詞解釋"],
    "relatedArticleIds": ["article-id-1", "article-id-2"]
  },
  {
    "part": 8,
    "format": "sentence-order",
    "questionText": "將下列詞語排成正確的句子。",
    "sequenceTokens": ["天", "地", "人"],
    "correctAnswer": "天>地>人",
    "relatedArticleIds": ["article-id-1"]
  }
]
```

| Field | Rules |
|-------|-------|
| `part` | required; `7` or `8` |
| `format` | `mc` (default) \| `fill-blank` \| `sentence-order` |
| `questionText` | required |
| `options` | `mc` only; ≥ 2 non-empty. Array of strings, `[{key,text}]` (keys A, B, C… in order) or `{A:…}`. Keys are assigned by position |
| `correctAnswer` | required. `mc`: `"B"` or `"A,C"` (keys must exist). `fill-blank`: answer text. `sentence-order`: the tokens in order joined by `>` or `,`; must be a permutation of `sequenceTokens` |
| `selectCount` | optional; derived from the number of correct answers; rejected if it disagrees |
| `sequenceTokens` | `sentence-order` only; ≥ 2 strings |
| `questionTypes` | optional; subset of 字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點 (unknown labels are rejected) |
| `explanation` | optional |
| `relatedArticleIds` | required; ≥ 1 existing `articles.id` |

`points` is auto-calculated (number of correct answers for `mc`).

### Student Performance (admin)

Read-only analytics page `/student-performance.html` (nav link "學習表現 ↗"); backend `admin/routes/performance.js` + `admin/lib/performance-helpers.js`, mounted under `/api/performance` **behind the admin auth guard**. No schema change. Data comes from `exercise_sessions` / `exercise_answers` (all kinds), joined to `profiles` and to `questions` **or** `cross_article_questions` (an answer's `question_id` can live in either).

All endpoints take `days` (default 30, max 365) and `includeAnonymous` (default true). "Registered" = profile has an email; anonymous = null `user_id` or a profile without email.

| Endpoint | Returns |
|----------|---------|
| `GET /overview` | totals (sessions, completion rate, abandoned, avg score, time vs expected, sessions/day, by kind), accuracy by part and by question type, top articles |
| `GET /questions?kind=&part=&articleId=&minAttempts=` | per-question attempts/accuracy, sorted hardest first; flag `hard` (< 30%) / `easy` (> 95%) |
| `GET /students?search=&sort=lastActive\|sessions\|score` | registered students with sessions, avg score, weakest part |
| `GET /students/:userId` | profile, session list, accuracy by part/type, unresolved mistakes (via `getRevisionSummary`) |
| `GET /sessions/:id` | answer-by-answer review |

Caveats:
- `QuizShell` shuffles MC options and re-keys A/B/C/D, so a stored MC `user_answer` letter can't be matched to the stored question's options. Session review therefore shows only correct/incorrect (plus the correct option text) for MC; fill-blank and sentence-order show the student's actual answer.
- Aggregation runs in JS over a date-bounded range (paginated at 1000 rows). If volume grows, move to SQL views/RPCs.
- `profiles` has no `created_at` column in the live DB (the DBML still lists one).

---

## Admin Portal Structure (Post-Refactor)

### Backend (`admin/`)

```
server.js                  # ~60 lines: Express setup, session, auth guard, route wiring
lib/
  supabase.js              # Supabase client, SupabaseStore, requireSupabase
  schemas.js               # All Zod schemas (ArticleSchema, QuizSchema, etc.)
  article-helpers.js       # articleToRow, rowToExercise, rebuildQuizJson, upsertQuestions
  quiz-prompts.js          # Async Supabase-backed prompt CRUD
  openrouter.js            # callOpenRouter, estimateCost, normalizeOptions
  generate-runs.js         # In-memory async job state for quiz/article generation
  sampling.js              # Quiz sampling logic (part quotas, repeat avoidance)
routes/
  auth.js                  # POST /login, /logout, GET /me
  exercises.js             # GET/POST/PUT/DELETE /api/exercises
  questions.js             # GET/POST/PUT/DELETE/PATCH /api/questions + bulk ops
  prompts.js               # GET/POST/PUT/DELETE /api/quiz-prompts
  generate-quiz.js         # POST /api/exercises/:id/generate-quiz + status
  generate-article.js      # POST /api/generate-article + status
  assessment.js            # POST /api/assessment/run + config + status
  quiz.js                  # GET /api/quiz/:articleId/sample (public, no auth)
```

### Frontend (`admin/public/`)

```
index.html               # HTML structure only; loads main.js as ES module
js/
  main.js                # Imports all modules, initializes on DOMContentLoaded
  api.js                 # All fetch() wrappers (centralized API contracts)
  exercises.js           # Article library list, renderExerciseRow, deleteExercise
  article-detail.js      # Article detail modal, saveArticleDetail, generateQuiz
  questions.js           # Question CRUD, bulk operations, renderQuestionCard
  prompts.js             # Quiz prompt management UI
  assessment.js          # LLM assessment UI (batch quiz generation)
  generate-article.js    # Generate new article UI
  ui.js                  # showToast, escHtml, fmtDate, shared utilities
```

**Key Improvement:** All API calls centralized in `api.js` — makes missing fields immediately visible.

---

## Automated Testing

**Status:** Implemented 2026-05-27 (after Pre-Phase 12 refactor)

### Admin API Integration Tests (`admin/tests/`)

Uses Jest + supertest against real Supabase test project (credentials in `admin/.env.test`).

**Coverage:**
- Article CRUD + `articleType`/`is_dse_core`/`quiz_json` invariants
- Question CRUD + `rebuildQuizJson` trigger verification
- Quiz prompt CRUD + Supabase persistence
- Bulk operations (bulk-publish, bulk-delete)

**Run:** `cd admin && npm test`

### Mobile Data Layer Tests

Uses Jest (existing setup).

**Coverage:**
- `contentStore.ts`: backgroundFetch, draft eviction, quiz_json → Quiz mapping
- `quiz.ts`: Scoring for all question types (mc-single, mc-multi, fill-blank, sentence-order, true-false)

**Run:** `npm test` (from project root)

### Key Test Cases (Regression Prevention)

```js
// Catches the 2026-05-25 bugs that shipped
test("PUT /api/exercises/:id does not wipe quiz_json when no quiz payload sent")
test("PUT /api/exercises/:id saves article_type correctly")
test("PATCH /api/questions/:id/publish rebuilds quiz_json")
test("POST /api/questions/bulk-delete rebuilds quiz_json after deletion")
test("POST /api/quiz-prompts saves to Supabase with text slug id")
```

---

## Deployment

### Admin Portal (Railway)

- **Service:** `classical-chinese-learner-app` (Mickey's Railway account)
- **Branch:** `main` (auto-deploy on push)
- **Root Directory:** `admin` (set in Railway service settings)
- **Build Command:** `npm install` (from `railway.json`)
- **Start Command:** `node server.js` (from `railway.json`)
- **URL:** `https://ccladmin.mickey-calligraphy.art`

**Environment Variables (Railway):**
```
EXPO_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_SESSION_SECRET
PORT (auto-injected by Railway)
```

**Important:** `railway.json` build/start commands do NOT include `cd admin &&` prefix — Root Directory handles that; adding it back breaks the build.

### Mobile App

- **Current:** Development only (`npx expo run:ios` / `npx expo run:android`)
- **Next:** TestFlight / App Store via EAS Build (Phase 12+)

### Supabase

- **Schema Changes:** Manual SQL in dashboard (no CLI / migration files)
- **Migration Log:** All SQL documented in `docs/archive/auth-membership-llm-plan.md`

---

## Next Steps (Phase 12: RevenueCat)

### External Setup Required

1. **RevenueCat Dashboard:** Create app, add "Pro Monthly" product, configure "pro" entitlement
2. **App Store Connect:** Create subscription product, get shared secret
3. **`app.json`:** Change bundle ID from `com.anonymous.classical-chinese-learner-app` to real reverse-domain ID
4. **Supabase Edge Function:** Deploy `revenuecat-webhook` to handle purchase events
5. **EAS CLI:** Install and configure (`npm install -g eas-cli && eas build`)

### Implementation Tasks

#### Mobile App
- [ ] Install `react-native-purchases` + `react-native-purchases-ui`
- [ ] Initialize RevenueCat SDK in `app/_layout.tsx`
- [ ] Add "Start Pro" / "Manage Subscription" / "Restore Purchases" buttons in `app/account.tsx`
- [ ] Implement purchase flow (`Purchases.getOfferings()` → `purchasePackage()`)
- [ ] Poll `profiles.is_pro` after purchase or listen via Supabase Realtime

#### Backend
- [ ] Deploy `supabase/functions/revenuecat-webhook/index.ts`
  - Verify webhook secret header
  - On `INITIAL_PURCHASE` / `RENEWAL`: `UPDATE profiles SET is_pro = true`
  - On `CANCELLATION` / `EXPIRATION`: `UPDATE profiles SET is_pro = false`
- [ ] Configure webhook URL in RevenueCat dashboard

#### Content Gating (Phase 11 UI already built)
- [ ] Enforce `is_pro` check in `app/read.tsx` and `app/quiz.tsx`
- [ ] Show `UpgradeModal` for Pro content when `user.is_pro = false`

### Testing Checklist

1. Purchase in Xcode StoreKit sandbox → `is_pro` flips to `true` in Supabase
2. Free user sees lock + "Pro" badge on non-free articles
3. Restore purchases works after reinstall
4. Subscription cancellation → webhook sets `is_pro = false`

---

## Future Phases (Post-RevenueCat)

### Phase 13: UI/UX Upgrade: DONE

Delivered as the Jiān design system (see `CLAUDE.md` and `docs/archive/jian-revamp/`). Remaining UX items (onboarding #030, font size #037) are in `docs/TASKS.md`.

### Phase 14: Ads (Free Tier Monetization)

**Goal:** AdMob integration for free users.

**Dependencies:**
- Phase 12 (RevenueCat) must complete first; ad placements to be finalized with the Jiān UI

**Placements (to be finalized):**
- Banner at bottom of `app/read.tsx`
- Interstitial between quiz completion and score screen (max 1 per session)

**Requirements:**
- Register AdMob app, get unit IDs
- Privacy policy update (data collection disclosure)
- iOS App Tracking Transparency prompt

**Ad-Free:** All ad components short-circuit when `is_pro = true`

---

## Known Issues & Limitations

### Current Limitations

1. **NativeWind requires a native build:** styling doesn't work in Expo Go; use `npx expo run:ios` / `run:android` or `expo start --web`
2. **Mobile data-layer tests are thin:** admin API tests are solid; only `contentStore` filter tests exist on the mobile side
3. **Legacy tables:** `quiz_attempts` / `quiz_answers` are superseded by `exercise_*`; `admin/lib/sampling.js` may still query both

### Data Integrity Invariants (Critical)

These must **never** be violated. See `CLAUDE.md` for full list.

**Top 3:**
1. **`rebuildQuizJson()` must be called after any question state change** (publish, edit, delete, bulk ops)
2. **`articleToRow()` must not include `quiz_json` unless a real quiz payload is present**
3. **Mobile reads `quiz_json` as source of truth; always use camelCase field names** (`selectCount` not `select_count`)

---

## Development Commands

```bash
# Mobile Development
npx expo start              # Start Metro bundler (Expo Go / web)
npx expo start --clear      # Clear cache (required after config changes)
npx expo start --web        # Web browser preview
npx expo run:ios            # Build and run on iOS Simulator
npx expo run:android        # Build and run on Android Emulator

# Testing
npm test                    # Run mobile Jest tests
npm test -- quiz.test.ts    # Run specific test file
cd admin && npm test        # Run admin API integration tests

# Linting
expo lint                   # Lint the project

# Admin Portal (Local)
cd admin && node server.js  # Run on localhost:3001

# Supabase Data Management
cd admin && node backup-supabase.js  # Backup to admin/backups/
cd admin && node clear-supabase.js   # Clear all articles and questions
```

---

## Contact & Access

- **GitHub Repo:** `mickey-ykm/classical-chinese-learner-app`
- **Admin Portal:** `https://ccladmin.mickey-calligraphy.art`
- **Supabase Dashboard:** [Link in team docs]
- **Railway Dashboard:** [Link in team docs]

---

## Document History

- **2026-06-13:** Initial version (replaces `auth-membership-llm-plan.md` archived)
  - Removed Phase 13 (LLM Mistake Analysis) — no longer planned
  - Added Phase 13 (UI/UX Upgrade) — affects conversion funnel and ad strategy
  - Re-sequenced: Phase 12 (RevenueCat) → Phase 13 (UI/UX) → Phase 14 (Ads)
- Previous plan covered Phases 1–11 with historical context; this doc focuses on current state and next steps
- **2026-10-03:** Updated after a 3-month break. Phase 13 marked done (Jiān), weight training and revision marked complete, limitations refreshed. Day-to-day status lives in `docs/TASKS.md`.
