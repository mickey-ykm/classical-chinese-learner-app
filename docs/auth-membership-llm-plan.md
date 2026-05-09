# Plan: Auth + Membership + Admin GO LIVE + Content Platform + LLM

_Last revised 2026-05-08 to incorporate the team review (`docs/comments-20260508.md`)._

## Context

The app started 100% local (no backend, no auth, no payments). Two waves of scope have been added since:

**Original goals (pre-2026-05-08):**
- Google SSO via Supabase Auth (login optional; guests keep full read/quiz access) — ✅ shipped (Phases 1–2)
- Pro membership via RevenueCat (App Store-compliant StoreKit wrapper; Stripe is banned for in-app digital subscriptions on iOS App Store)
- Content gating: free vs Pro split
- Cloud progress sync (replaces AsyncStorage for logged-in users)
- LLM features gated to Pro (mistake analysis + AI-generated revision quizzes) via OpenRouter through Supabase Edge Functions

**Added by 2026-05-08 product review:**
- **Admin GO LIVE** — admin portal deployed publicly with basic login auth; non-developer admins create exercises directly into a live database
- **Mobile content from Supabase** — articles + question pool fetched from server; bundled JSON becomes a frozen seed; "Update" button on dashboard pulls latest
- **Question pool per article** — large pool; each exercise samples N at random
- **6–8 question types** (currently 4) — final list TBD by team
- **Multiple question formats** — MC + short answer + long answer + fill-in-the-blank — final list TBD by team
- **Drop F1–F3 levels from MVP** — app targets 中四–中六 + 高中DSE
- **Expected finishing time + live timer** — admin sets per article; mobile shows running timer; dashboard tracks total time + per-type breakdown
- **Revision chapter** — exercise mode that surfaces the user's actual past mistakes (15–20 per chapter)
- **Weight training chapter** — exercise mode where user picks a question type and gets 15–20 questions of that type
- **Ads** — free tier shows banner / video ads via an ad network
- **Validation & safety** — non-developer admins must not be able to crash the app via bad edits

## Key decisions (locked)

- **RevenueCat over Stripe** — App Store rules ban Stripe for in-app digital subscription purchases; RevenueCat wraps StoreKit cleanly and has a Supabase webhook integration
- **Web-based Google OAuth** (`supabase.auth.signInWithOAuth` + `expo-web-browser`) — `@react-native-google-signin/google-signin` v7 auto-generates its own nonce on iOS, breaking Supabase nonce verification. Switched to PKCE browser flow with regex code extraction (iOS drops `//` from custom-scheme URLs, breaking `new URL()` parsing).
- **Guest-first model** — auth is optional; gated features prompt sign-in / upgrade
- **`is_pro` denormalised on `profiles`** — fast boolean check; synced via RevenueCat webhook
- **Admin GO LIVE prioritised before remaining monetisation work** — admins need to scale content production first; gating, RevenueCat, ads come after the content pipeline is healthy
- **Content delivery: Supabase + bundled seed** — bundle ships a frozen JSON snapshot for first-launch / offline. On launch the app reads from local cache (instant), then background-fetches a diff (`updated_at > last_sync_at`) once per session. Manual "更新內容" button on the dashboard surfaces the same fetch with a result toast.
- **Defense-in-depth validation** — non-developer admins can break things, so we engineer for it. Layers:
  1. Shared Zod schema (`shared/schema.ts`) used by admin portal AND mobile
  2. Admin portal rejects malformed saves with specific errors before anything reaches DB
  3. DB CHECK constraints + NOT NULLs as backstop
  4. `status: draft | published | archived` on articles + questions; mobile fetches `published` only
  5. `article_versions` audit table — every save snapshots; admin can revert in one click
  6. Mobile validates every fetched row; on failure, skips that article and keeps the previous cached version. App never crashes on bad data.

## Decisions resolved 2026-05-08

1. **Revision chapter is verbatim replay; no LLM-generated revision quiz.**
   - The new Revision Chapter pulls real wrong-answered questions from the user's `quiz_answers` and replays them verbatim. No LLM rewriting; no LLM generation.
   - The originally-planned `generate-revision-quiz` edge function is **dropped**.
   - `analyze-mistakes` (LLM summary + tips of the user's mistake patterns) is **kept** as a Pro feature on the score screen — that's the place where LLM adds value the deterministic replay can't.

2. **Tier model: limited articles + ads on free; Pro = all articles + no ads + premium features.**
   - Free tier: first N free articles (driven by `FREE_ARTICLE_IDS` constant), banner + interstitial ads, no premium features (no revision chapter, no weight training, no LLM analysis).
   - Pro tier: all articles unlocked, no ads, all premium features.
   - `FREE_ARTICLE_IDS` initial set: `mai-you-weng`, `zeng-zi-sha-zhu`, `wang-rong-he-jiao` (carried over from original plan; revisit count after beta usage data).

---

## External setup

| # | Setup | Owner | Status |
|---|---|---|---|
| 1 | Supabase project + URL/anon/service-role keys | Mickey | ✅ done (Phase 1) |
| 2 | Google Cloud OAuth client IDs (iOS bundle + web) | Mickey | ✅ done (Phase 1) |
| 3 | Supabase dashboard → Google provider enabled | Mickey | ✅ done (Phase 1) |
| 4 | RevenueCat dashboard: app + "Pro Monthly" + "pro" entitlement + App Store shared secret | Mickey | ⬜ Phase 12 |
| 5 | App Store Connect subscription product | Mickey | ⬜ Phase 12 |
| 6 | `app.json` real reverse-domain bundle ID (currently `com.anonymous.classical-chinese-learner-app`) | Mickey | ⬜ before Phase 12 |
| 7 | **Admin hosting** — Railway; custom domain `ccladmin.mickey-calligraphy.art` | Mickey | ✅ Phase 5 |
| 8 | **Ad network** — register AdMob app, get unit IDs, privacy policy update | Mickey | ⬜ Phase 14 |

---

## Supabase schema

### Existing (Phase 1, shipped)

```sql
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  avatar_url    text,
  revenuecat_id text,
  is_pro        boolean default false,
  updated_at    timestamptz default now()
);

-- Auto-create profile on signup. `set search_path = ''` is REQUIRED on newer
-- Supabase; omitting it causes "Database error saving new user" on OAuth sign-up.
create or replace function handle_new_user()
returns trigger
set search_path = ''
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure handle_new_user();

create table read_progress (
  user_id    uuid references auth.users(id) on delete cascade,
  article_id text not null,
  read_at    timestamptz default now(),
  primary key (user_id, article_id)
);

create table quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  article_id   text not null,
  completed_at timestamptz default now(),
  score        integer not null,
  total_points integer not null
);

create table quiz_answers (
  id             uuid primary key default gen_random_uuid(),
  attempt_id     uuid references quiz_attempts(id) on delete cascade,
  question_id    text not null,
  part_number    integer not null,
  user_choice    integer,
  correct_choice integer,
  is_correct     boolean not null,
  points_earned  integer not null
);

alter table profiles enable row level security;
alter table read_progress enable row level security;
alter table quiz_attempts enable row level security;
alter table quiz_answers enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own read_progress" on read_progress for all using (auth.uid() = user_id);
create policy "own quiz_attempts" on quiz_attempts for all using (auth.uid() = user_id);
create policy "own quiz_answers" on quiz_answers for all
  using (attempt_id in (select id from quiz_attempts where user_id = auth.uid()));
```

### Phase 4 — content tables (NEW)

```sql
create table articles (
  id                 text primary key,                              -- e.g. 'wang-rong-he-jiao'
  title              text not null,
  source             text,
  level              int check (level between 4 and 7),             -- F4–F6 + DSE only (F1–F3 dropped from MVP)
  is_challenge       boolean default false,
  segments           jsonb not null,
  footnotes          jsonb not null,
  modern_translation text,
  title_footnote_id  text,
  expected_minutes   int,                                           -- admin's expected exercise finishing time
  exercise_template  jsonb,                                         -- e.g. [{type:'word-meaning',count:10},{type:'sentence-meaning',count:8}]
  status             text not null default 'draft' check (status in ('draft','published','archived')),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table questions (
  id              uuid primary key default gen_random_uuid(),
  article_id      text references articles(id) on delete cascade,
  type            text not null,                                    -- one of QUESTION_TYPES (registry in shared/schema.ts)
  format          text not null check (format in ('mc','fill-blank','short','long')),
  part            int,                                              -- legacy ordering; nullable for pool-based draws
  points          int not null default 1,
  stem            text not null,
  options         jsonb,                                            -- mc only
  correct_answer  text not null,                                    -- key for mc; expected text for fill-blank; rubric/key points for short/long
  rubric          jsonb,                                            -- short/long: scoring criteria
  explanation     text,
  source_excerpt  text,                                             -- raw passage from article (used by Revision / Weight Training)
  status          text not null default 'draft' check (status in ('draft','published','archived')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index on questions (article_id, type, status);

create table quiz_prompts (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  description     text,
  prompt_template text not null,
  default_model   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table article_versions (
  id         uuid primary key default gen_random_uuid(),
  article_id text references articles(id) on delete cascade,
  snapshot   jsonb not null,                                        -- full article + questions snapshot
  edited_by  text,
  edited_at  timestamptz default now()
);

create table admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,                                      -- bcrypt
  display_name  text,
  created_at    timestamptz default now()
);
```

### Phase 8 — exercise sessions (NEW)

```sql
create table exercise_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  article_id       text references articles(id),
  kind             text not null check (kind in ('regular','revision','weight-training')),
  question_type    text,                                            -- weight-training only
  question_ids     uuid[],                                          -- the pool sample for this session
  started_at       timestamptz default now(),
  finished_at      timestamptz,
  total_seconds    int,
  expected_seconds int,                                             -- snapshot of articles.expected_minutes * 60 at start
  score            int,
  total_points     int
);

create table exercise_answer_times (
  session_id    uuid references exercise_sessions(id) on delete cascade,
  question_id   uuid references questions(id),
  question_type text not null,
  seconds       int not null,
  primary key (session_id, question_id)
);
```

### RLS additions

```sql
alter table articles            enable row level security;
alter table questions           enable row level security;
alter table quiz_prompts        enable row level security;
alter table article_versions    enable row level security;
alter table admin_users         enable row level security;
alter table exercise_sessions   enable row level security;
alter table exercise_answer_times enable row level security;

-- Mobile reads only published content via anon key
create policy "public read published articles"  on articles  for select using (status = 'published');
create policy "public read published questions" on questions for select using (status = 'published');

-- Writes go via admin server using service-role key (bypasses RLS); no public write policies.

-- Per-user policies
create policy "own exercise sessions" on exercise_sessions for all using (auth.uid() = user_id);
create policy "own answer times"      on exercise_answer_times for all
  using (session_id in (select id from exercise_sessions where user_id = auth.uid()));
```

---

## Packages

Already installed (Phase 1–2):
```
@supabase/supabase-js expo-secure-store expo-crypto expo-web-browser
```

To install in later phases:
```bash
# Phase 6
npx expo install expo-sqlite

# Phase 7 — Sentry-style validation logging (pick one)
npx expo install sentry-expo

# Phase 12
npx expo install react-native-purchases react-native-purchases-ui

# Phase 14
npx expo install react-native-google-mobile-ads
```

`@react-native-google-signin/google-signin` is installed but **not used for auth** (nonce incompatibility on iOS SDK v7). `expo-crypto` provides the WebCrypto polyfill for Hermes. `expo-web-browser` drives the OAuth browser session.

---

## Phase 1 — Foundation (Supabase client + Auth context) ✅ COMPLETE

### `lib/supabase.ts`
- Supabase client using `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `LargeSecureStore` adapter: chunked SecureStore (1800-byte chunks) to handle JWTs > 2 KB iOS limit
- `flowType: "pkce"` — required; default `"implicit"` stores no code verifier and breaks `exchangeCodeForSession`
- WebCrypto polyfill at module top: Hermes lacks `crypto.subtle`; polyfilled via `expo-crypto` so PKCE uses S256 challenge (Supabase rejects "plain")

### `contexts/AuthContext.tsx`
```
AuthProvider wraps the whole app and exposes:
  - user: User | null
  - profile: { is_pro, display_name, avatar_url } | null
  - signInWithGoogle(): Promise<void>
  - signOut(): Promise<void>
  - loading: boolean
```
- On mount: restore existing Supabase session; listen to `onAuthStateChange`
- On sign-in: `supabase.auth.signInWithOAuth` → `WebBrowser.openAuthSessionAsync` → extract code with regex (`/[?&]code=([^&#]+)/`) → `supabase.auth.exchangeCodeForSession(code)`
  - Regex extraction is required: iOS returns `classicalchineselearnerapp:?code=XXX` (drops `//`), which `new URL()` and gotrue-js cannot parse
- On auth change: fetch `profiles` row for `is_pro` and display info

### `hooks/useAuth.ts`
- Thin wrapper: `export { useAuth } from "@/contexts/AuthContext"`

### `app/_layout.tsx`
- Wrapped Stack navigator with `<AuthProvider>`

---

## Phase 2 — Auth UI ✅ COMPLETE

### `app/login.tsx` ✅
- Logo + tagline, "以 Google 帳號登入" button, "以訪客身份繼續" guest link, back button
- `signingIn` spinner state; success alert navigates to `/account`

### `app/account.tsx` ✅ (partial — Pro/RevenueCat buttons deferred to Phase 12)
- Avatar, display name, email
- Completed exercises list with score progress bars and dates
- Sign-out button
- Pro status badge, "Manage Subscription", "Restore Purchases" — **not yet added** (Phase 12)

### `app/index.tsx` ✅
- Avatar/profile icon top-right: Google avatar if signed in (→ `/account`), person icon if guest (→ `/login`)

---

## Phase 3 — Admin Portal Restructure (local) ✅ COMPLETE

Goal: split article creation from quiz creation; introduce Quiz Prompt MGT; lay groundwork for Supabase migration. Still runs locally on port 3001 writing to `data/` JSON files in this phase — no deploy yet.

### Article Library — Listing
- Columns: title, generated time (`created_at`), has quizzes (✓/✗ — i.e. has any questions), level, status, [Detail] button
- Pure list view; no inline editing
- Replaces current single-page Article Library

### Article Library — Detail (per-article view)
- Three editors stacked or tabbed:
  - **Article JSON** editor (existing functionality)
  - **Quiz Prompt selector** (new) — dropdown populated from Quiz Prompt MGT
  - **Quiz JSON** editor + [Generate Quiz] button (runs selected prompt against the article)
- "Has quizzes" indicator reflects whether quiz JSON is non-empty
- Add/edit `expected_minutes` and `exercise_template` (Phase 7+ uses this; field added now)

### Add a New Article — separated from quiz generation
- Form posts → translation prompt only → article saved to library with empty questions
- Quiz generation deferred: admin opens Detail view later, picks a prompt, generates

### Quiz Prompt MGT (new tab)
- List existing prompts (currently hardcoded in `assessment-config.json`)
- Add / edit / delete; each prompt has name, description, template, default model
- Migrate current default prompt into this list as the seed entry

### Drop F1–F3 from level selector
- Selector only offers 中四–中六 + 高中DSE (`level: 4–7`)
- Existing F1–F3 articles (if any are tagged) are not deleted — they remain `level` unchanged but can no longer be assigned that value via UI

### Implementation notes
- Article Library Listing: `ad-*` element IDs; table driven by `GET /api/exercises` (Supabase in Phase 4)
- Article Library Detail: Article JSON editor + Quiz Prompt selector + Quiz JSON editor + Generate Quiz button
- Add a New Article: translation-only (`skipQuiz: true`); saves as draft with `hasQuizzes: false`
- Quiz Prompt MGT: backed by `admin/assessment-config.json` (`quizPrompts[]` array); seeded from legacy `quizPrompt` on first boot
- Level selectors: all three entry points (Detail, Add Article, Raw Article modal) restrict to 中四–高中DSE (4–7)

---

## Phase 4 — Content Schema Migration to Supabase ✅ COMPLETE

Goal: move articles + questions + prompts from JSON files into Supabase tables. Establish validation pipeline.

### Schema
- Run the SQL from "Phase 4 — content tables" above
- RLS policies for public read (`status = 'published'`) on `articles` + `questions`

### Shared validation
- `shared/schema.ts` — Zod schemas for `article`, `question`, `quizPrompt`, `exerciseTemplate`
- Importable by both admin portal (`require('../shared/schema')`) and mobile (`import` via metro alias)
- DB CHECK constraints mirror schema where feasible (level range, status enum, format enum)

### Migration
- `scripts/migrate-content.ts`:
  - Read `data/articles/*.json` + `data/quizzes/*.json` + `data/index.json`
  - Validate each via Zod; abort with detailed error if any file fails
  - Insert all as `status: 'published'`
  - Idempotent: re-running upserts by `id`

### Admin portal switch-over
- Replace `lib/data.ts` patching with `articles` / `questions` upserts via Supabase service-role key
- **Every save validates via Zod first**; rejected saves never hit DB; admin sees specific error inline
- **Every save also inserts into `article_versions`** (audit log + revert capability)
- Add `status` toggle in Detail view: Draft ↔ Published

### Mobile in this phase
- Still reads bundled JSON. Phase 6 cuts over.

### Implementation notes
- `shared/schema.ts` — Zod v4 schemas: `ArticleSchema`, `QuizSchema`, `QuizPromptSchema`, `ExerciseTemplateSchema`, `QUESTION_TYPES`
- `scripts/migrate-content.ts` — idempotent; run with `npm run migrate`; migrated 18 articles + 458 questions + 1 quiz prompt
- `admin/server.js` — rewired to Supabase service-role key; removed `readIndex`/`writeIndex`/`updateDataTs`/`removeFromDataTs`/`backfillIndex`; kept quiz prompt routes (still `assessment-config.json`); kept all assessment/LLM routes
- SQL deviations from plan: `modern_translation jsonb` (not `text`); `quiz_json jsonb` added to `articles`; `level check (level between 1 and 7)` (not 4–7, to preserve legacy F1–F3 articles)
- `npm run migrate` must be run once after creating the Phase 4 tables in Supabase

---

## Phase 5 — Admin Portal GO LIVE ✅ COMPLETE

Goal: public deployment with basic auth. Admins can create content from anywhere.

### Hosting
- **Railway** — deployed from GitHub; root directory `admin`; build command `cd admin && npm install`; start command `cd admin && node server.js`
- Live at `https://ccladmin.mickey-calligraphy.art` (CNAME → Railway; TXT record for SSL)
- HTTPS enforced via Railway-provisioned cert

### Auth
- Session-based login backed by `admin_users` table (bcrypt password)
- `POST /api/admin/login` → sets HTTP-only signed cookie (`express-session` + `bcryptjs`)
- `app.set('trust proxy', 1)` + `cookie.secure: 'auto'` required for Railway reverse proxy
- All `/api/*` routes (except login/logout) require valid session
- Bootstrap: `scripts/create-admin.ts` — run `npm run create-admin -- email password`

### Env vars (set on Railway)
- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (admin writes)
- `ADMIN_SESSION_SECRET` (cookie signing)
- `PORT` injected automatically by Railway

### Public reads stay direct
- Mobile reads Supabase directly with anon key + RLS — does NOT go through admin server
- Admin server is for admin writes only; keeps the public read path simple and cheap

---

## Phase 6 — Mobile Content Delivery (server-backed + bundled seed) ✅ COMPLETE

Goal: app fetches from Supabase; bundled JSON becomes offline fallback; "Update" button surfaces refresh.

### Bundled seed
- Keep `data/articles/*.json` + `data/quizzes/*.json` as a frozen snapshot
- Refreshed only with each app store release (cold-installer parity)
- Once cache is populated from a successful fetch, seed stops being read

### `lib/contentStore.ts` (new)
- Local cache backed by SQLite (`expo-sqlite`)
- On first launch: hydrate from bundled seed
- On every launch (throttled to once per session) + on manual refresh: background fetch
  ```
  articles  WHERE updated_at > last_sync_at
  questions WHERE updated_at > last_sync_at
  ```
- **Validate every fetched row via Zod** (same `shared/schema.ts` as admin)
  - Invalid row → skip + log to Sentry; previous cached version retained
  - App never crashes on bad remote data
- Public API: `getArticles()`, `getArticle(id)`, `getQuestions(articleId, opts)`, `refresh(): Promise<{updated: number, errors: number}>`

### `lib/data.ts`
- Static `ARTICLES` / `QUIZZES` maps removed
- Existing exports become thin wrappers around `contentStore`

### `app/account.tsx`
- Add **更新內容** button calling `contentStore.refresh()`
- Toast result: "已更新 N 篇" / "已是最新" / "X 篇有問題，已使用上次內容"

### Sentry / error surfacing
- Add `sentry-expo` (or similar) so production validation failures are visible to maintainers

---

## Phase 7 — Question Pool, Types, Formats

Goal: per-article question pools with diverse types and formats; exercises sample N from the pool.

### Question types registry (6–8, final list TBD by team)
- Defined in `shared/schema.ts` as a const array — single source of truth
- Working draft (replace once team confirms): `word-meaning`, `sentence-meaning`, `comprehension`, `theme`, `character-analysis`, `rhetorical-device`, `citation`, `application`
- Each type can host multiple formats

### Question formats (MVP set)
- `mc` — multiple choice (existing)
- `fill-blank` — fill in the blank (regex / exact match grading; rubric stores accepted answers)
- `short` — short answer (auto-grade by keyword match against rubric `key_points`; otherwise stored ungraded)
- `long` — long answer (ungraded in MVP; LLM-graded deferred)

### Admin portal
- Question editor in Article Library Detail: add / edit / delete individual questions; tag with `type` + `format`
- Bulk import via existing LLM quiz prompts (now generates many questions across types — prompt updated to produce the new typology)
- `exercise_template` editor: list of `{ type, count }` defining the standard exercise mix for that article

### Mobile
- New `QuizQuestion` variants:
  - `MCQuestion` (existing — extracted)
  - `FillBlankQuestion`
  - `ShortAnswerQuestion`
  - `LongAnswerQuestion`
- `QuizShell` reads `exercise_sessions.question_ids` (the sample drawn from the pool) instead of a hardcoded list
- **Sampling logic** (`lib/quiz.ts`):
  ```
  for each {type, count} in article.exercise_template:
    sample `count` random rows from questions WHERE article_id = $1 AND type = $type AND status = 'published'
  ```
- Scoring (`lib/quiz.ts`) extended per format: MC unchanged; fill-blank exact/regex match; short answer keyword match; long answer ungraded with manual review flag

---

## Phase 8 — Expected Finishing Time + Live Timer

- **Admin**: `expected_minutes` field per article (set in Article Library Detail)
- **Mobile**:
  - Live timer in `QuizShell` header (mm:ss); colour shifts amber → red as user passes expected time
  - Persist `exercise_sessions.total_seconds` and per-question `exercise_answer_times`
- **Account dashboard**:
  - Each completed exercise shows `time_spent` vs `expected_seconds` (delta as +N min / −N min)
  - Per-question-type time breakdown for each session (e.g. "Word meaning: 4m 12s / 8 questions")

---

## Phase 9 — Revision Chapter & Weight Training

Goal: two new exercise modes that draw from real user data.

### Revision chapter
- Entry point on dashboard: "Revision Chapter (X mistakes available)"
- Pulls user's wrong-answered questions from `quiz_answers` (joined to `questions` via question_id once Phase 4 migration uses uuid IDs)
- Samples 15–20 from the most recent / most-frequently-wrong
- Each question shows the original `source_excerpt` (raw sentence/passage from article) so the user has context without re-reading the whole article
- Saved as `exercise_sessions.kind = 'revision'`

### Weight training
- Entry point on dashboard: list of question types with available counts (e.g. "Word meaning: 47 questions")
- User picks a type → 15–20 questions of that type sampled across all articles the user has access to
- Saved as `exercise_sessions.kind = 'weight-training'`, `question_type = X`

### Pro/Free split
- Both modes are **Pro-only** (per Decision 2). Free users see them on the dashboard with a lock icon → `UpgradeModal` on tap.

### No LLM involvement (per Decision 1)
- Revision chapter pulls real wrong answers from `quiz_answers`; questions are replayed verbatim.
- Weight training samples published questions of the chosen type; no generation.

---

## Phase 10 — Cloud Progress Sync

[Substantively unchanged from the original plan's Phase 5; renumbered.]

### `lib/readProgress.ts` ⬜ pending
- `markAsRead(id)`: always write AsyncStorage (offline fallback); if signed in, also upsert `read_progress` in Supabase
- `getReadArticles()`: if signed in, fetch from Supabase; merge with AsyncStorage
- On first login (migration): read existing AsyncStorage set → bulk-upsert to Supabase

### `lib/quizHistory.ts` ✅ DONE
- `saveQuizAttempt(...)` already inserts into `quiz_attempts` + `quiz_answers` for any signed-in user

### `components/quiz/QuizShell.tsx` ✅ DONE
- Already saves attempt on completion if signed in (no Pro gate yet)

---

## Phase 11 — Content Gating + Free/Pro Model

Locked model (per Decision 2): **Limited articles + ads on free; Pro = all articles + no ads + premium features.**

### Article-level gating
- `FREE_ARTICLE_IDS` constant in `lib/data.ts` lists the free article slugs (initial: `mai-you-weng`, `zeng-zi-sha-zhu`, `wang-rong-he-jiao`)
- `app/index.tsx`: article cards on the journey map show a lock icon + "Pro" badge for non-free articles when user is not Pro
- `app/read.tsx`: when free user opens a Pro article (e.g. via deep link), show `UpgradeModal` instead of rendering content
- `app/quiz.tsx`: same gate (so Pro quizzes can't be reached by direct URL)

### Feature-level gating (Pro only)
- Revision Chapter (Phase 9) — locked entry point for free users
- Weight Training (Phase 9) — locked entry point for free users
- Analyse My Mistakes button (Phase 13) — hidden / locked for free users
- Ad-free experience (Phase 14) — Pro short-circuits ad components

### Components
- `components/UpgradeModal.tsx` — bottom-sheet modal with Pro pitch, "Start Free Trial" button, "Restore Purchases" link
- `components/ProGate.tsx` — wraps children; renders a locked overlay if user not Pro

---

## Phase 12 — RevenueCat + Subscriptions

[Substantively unchanged from the original plan's Phase 4; renumbered.]

### `supabase/functions/revenuecat-webhook/index.ts`
- Receives RevenueCat webhook events (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, etc.)
- Verifies webhook secret header
- On purchase/renewal: `UPDATE profiles SET is_pro = true WHERE revenuecat_id = $1`
- On cancellation/expiration: `UPDATE profiles SET is_pro = false WHERE revenuecat_id = $1`

### `app/account.tsx`
- "Start Pro" button: calls `Purchases.getOfferings()` then `Purchases.purchasePackage(package)`
- On successful purchase: `Purchases.logIn(user.id)` already done; webhook updates DB
- Poll `profiles.is_pro` after 3s, or listen via Supabase Realtime on the profiles row

### RevenueCat dashboard
- Webhook URL: `https://<project>.supabase.co/functions/v1/revenuecat-webhook`
- Webhook secret stored in Supabase Edge Function secrets

---

## Phase 13 — LLM Features (OpenRouter via Supabase Edge Functions)

Per Decision 1: scope is reduced to **mistake analysis only**. LLM-generated revision quiz is dropped — Phase 9 Revision Chapter handles that need with deterministic real-mistake replay.

### `supabase/functions/analyze-mistakes/index.ts`
- Pro check via Supabase JWT (returns 403 if `profiles.is_pro = false`)
- Aggregates wrong answers per question across the user's last 5 attempts for the article
- Model: `deepseek/deepseek-chat` via OpenRouter (~$0.07/1M tokens)
- Returns: `{ summary: string | null, tips: string[] }`

### `components/quiz/ScoreScreen.tsx`
- After quiz save: show **"Analyse My Mistakes"** button (Pro only; free users see it locked → `UpgradeModal`)
- Tap → `fetchMistakeAnalysis()` → display summary + tips card

---

## Phase 14 — Ads

Goal: free-tier monetisation via ad network.

### Network
- **AdMob** (recommended) via `react-native-google-mobile-ads` — best fill rate; standard iOS/Android support

### Placements (proposed; refine with team)
- Banner at bottom of `app/read.tsx` (free only)
- Interstitial between exercise completion and `ScoreScreen` (free only; capped at 1 per session)
- Rewarded video: "Watch ad to unlock 1 more revision question" — optional, defer

### Ad-free for Pro
- All ad components short-circuit on `is_pro = true`

### Compliance
- iOS App Tracking Transparency: prompt at appropriate moment; AdMob falls back to non-personalised ads if denied
- Privacy policy update (data collection disclosure)
- Terms of service update

---

## Critical files to modify

| File | Phase | Change |
|---|---|---|
| `app/_layout.tsx` | 1 ✅ | AuthProvider |
| `app/_layout.tsx` | 6 | Hydrate `contentStore` on mount |
| `app/_layout.tsx` | 12 | RevenueCat init |
| `app/index.tsx` | 1 ✅ | Profile icon |
| `app/index.tsx` | 11 | Article-level locking on journey map |
| `app/account.tsx` | 6 | "更新內容" button + result toast |
| `app/account.tsx` | 8 | Time + per-type breakdown |
| `app/account.tsx` | 9 | Revision + Weight Training entry points (Pro-locked) |
| `app/account.tsx` | 12 | Pro status, subscribe, restore |
| `app/read.tsx` | 11 | Article-level Pro gate |
| `app/read.tsx` | 14 | Banner ad slot for free users |
| `app/quiz.tsx` | 7 | Pool sampling + multi-format support |
| `components/quiz/QuizShell.tsx` | 8 | Live timer; per-question time tracking |
| `components/quiz/ScoreScreen.tsx` | 13 | LLM analysis card |
| `components/quiz/ScoreScreen.tsx` | 14 | Interstitial ad pre-render (free only) |
| `lib/data.ts` | 6 | Replace static maps with `contentStore` wrappers |
| `lib/quiz.ts` | 7 | Sampling + scoring across formats |
| `lib/readProgress.ts` | 10 | Cloud sync |
| `app.json` | 12 | Real reverse-domain bundle ID |
| `admin/server.js` | 3 | Article/quiz split routes; Quiz Prompt MGT routes |
| `admin/server.js` | 4 | Switch from JSON file writes to Supabase upserts; Zod validation; version snapshots |
| `admin/server.js` | 5 | Session auth middleware |
| `admin/public/*` | 3 | Article Library Listing/Detail UI; Quiz Prompt MGT tab |
| `admin/public/*` | 5 | Login screen |

## New files

```
shared/schema.ts                                    (Phase 4)
scripts/migrate-content.ts                          (Phase 4)
scripts/create-admin.ts                             (Phase 5)
lib/contentStore.ts                                 (Phase 6)
components/quiz/MCQuestion.tsx                      (Phase 7 — extracted from existing QuizQuestion)
components/quiz/FillBlankQuestion.tsx               (Phase 7)
components/quiz/ShortAnswerQuestion.tsx             (Phase 7)
components/quiz/LongAnswerQuestion.tsx              (Phase 7)
app/revision.tsx                                    (Phase 9)
app/weight-training.tsx                             (Phase 9)
components/UpgradeModal.tsx                         (Phase 11)
components/ProGate.tsx                              (Phase 11)
supabase/functions/revenuecat-webhook/index.ts      (Phase 12)
supabase/functions/analyze-mistakes/index.ts        (Phase 13)
components/AdBanner.tsx                             (Phase 14)
components/AdInterstitial.tsx                       (Phase 14)
```

---

## Verification checklist

### Validation safety net (must pass before relying on admin GO LIVE)
1. **Admin save validation**: edit a published article in admin, paste malformed JSON, save → admin sees specific Zod error pointing to the bad field; DB unchanged; mobile users unaffected
2. **Mobile validation skip**: manually corrupt one row in Supabase via SQL → mobile fetch logs the error to Sentry, keeps previous cached article, other articles work normally
3. **DB constraint backstop**: attempt to insert a question with `correctAnswer = "Z"` while options are `A/B/C/D` → DB CHECK rejects (this catches schema bugs, not just user mistakes)

### Content delivery
4. **Bundled seed**: fresh install offline → app launches with bundled articles; no crash; no blank screen
5. **Diff sync**: publish a new article in admin → tap "更新內容" on mobile → new article appears within seconds
6. **Throttle**: launch app, then launch again 5 minutes later → no second background fetch (once-per-session policy)
7. **Draft/Publish**: save article as draft → mobile does NOT see it; flip to published → next refresh, mobile sees it
8. **Version revert**: edit an article 3 times in admin → revert to v1 → mobile sees v1 content after refresh

### Question pool + types/formats
9. **Pool sampling**: regenerate exercise on the same article twice → different question subsets sampled
10. **Multi-format**: complete an exercise mixing MC + fill-blank + short answer → scoring works for each

### Timer + dashboard
11. **Timer**: start an exercise → timer ticks; finish → dashboard shows total time + delta vs expected; per-type breakdown matches sum

### Revision + Weight training
12. **Revision chapter**: get 25 questions wrong across 3 articles → revision chapter offers 15–20, all from your wrong list; `source_excerpt` shown
13. **Weight training**: pick "word-meaning" → 15–20 word-meaning questions, drawn across articles user has access to

### Auth + Pro + monetisation
14. **Auth** ✅: existing checks still pass (Phases 1–2)
15. **Content gate** (Phase 11): free user sees lock + "Pro" badge on non-`FREE_ARTICLE_IDS` articles; tap → UpgradeModal. Pro user sees all unlocked.
16. **RevenueCat sandbox** (Phase 12): use Xcode StoreKit sandbox to purchase → `is_pro` flips to true in Supabase profiles table
17. **LLM analysis** (Phase 13): Pro user, post-quiz → "Analyse My Mistakes" → response within 5s
18. **Ads** (Phase 14): free user sees banner + 1 interstitial post-quiz; Pro user sees neither
19. **Sign out**: progress falls back to AsyncStorage; Pro content locked again
