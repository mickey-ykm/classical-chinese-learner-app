# Plan: Auth + Membership + LLM Features

## Context

The app is currently 100% local — no backend, no auth, no payments. The goal is to add:
- Google SSO via Supabase Auth (login optional; guests keep full read/quiz access)
- Pro membership via RevenueCat (App Store-compliant StoreKit wrapper; Stripe is banned for in-app digital subscriptions on iOS App Store)
- Content gating: articles 1–3 free, 4–6 + challenge exercises = Pro
- Cloud progress sync (replaces AsyncStorage for logged-in Pro users)
- LLM features gated to Pro (mistake analysis + AI-generated revision quizzes) via OpenRouter through Supabase Edge Functions

## Key decisions

- **RevenueCat over Stripe** — App Store rules ban Stripe for in-app digital subscription purchases; RevenueCat wraps StoreKit cleanly and has a Supabase webhook integration
- **Google Sign-In native SDK** (`@react-native-google-signin/google-signin`) — more reliable on iOS native builds than `expo-auth-session`; passes ID token to Supabase `signInWithIdToken`
- **Guest-first model** — auth is optional; Pro features show an UpgradeModal when tapped by unauthenticated or free users
- **`is_pro` denormalized on `profiles`** — fast boolean check without calling RevenueCat SDK on every render; kept in sync via RevenueCat webhook → Supabase Edge Function

---

## External setup (done outside the codebase, before code changes)

1. **Supabase project** — create project, get `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
2. **Google Cloud Console** — create OAuth 2.0 client IDs for iOS (bundle ID) + web (for Supabase dashboard); enable Google Sign-In
3. **Supabase dashboard** — enable Google provider under Authentication → Providers; paste web client ID + secret
4. **RevenueCat dashboard** — create app, add "Pro Monthly" product + "pro" entitlement, configure App Store Connect shared secret
5. **App Store Connect** — create subscription product (used by RevenueCat in sandbox/production)
6. **`app.json`** — update `ios.bundleIdentifier` from `com.anonymous.classical-chinese-learner-app` to a real reverse-domain ID

---

## Supabase schema

```sql
-- Run in Supabase SQL editor

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  avatar_url    text,
  revenuecat_id text,
  is_pro        boolean default false,
  updated_at    timestamptz default now()
);

-- Auto-create profile on signup
create function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, display_name, avatar_url)
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

-- Row-level security: users can only read/write their own data
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

---

## Packages to install

```bash
npx expo install @supabase/supabase-js expo-secure-store
npx expo install @react-native-google-signin/google-signin
npx expo install react-native-purchases react-native-purchases-ui
```

(After install: `npx pod-install ios` then rebuild)

---

## Phase 1 — Foundation (Supabase client + Auth context)

### New: `lib/supabase.ts`
- Create Supabase client using `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Use `expo-secure-store` adapter for session persistence (replaces localStorage, required for React Native)

### New: `contexts/AuthContext.tsx`
```
AuthProvider wraps the whole app and exposes:
  - user: User | null
  - profile: { is_pro, display_name, avatar_url } | null
  - signInWithGoogle(): Promise<void>
  - signOut(): Promise<void>
  - loading: boolean
```
- On mount: restore existing Supabase session; listen to `onAuthStateChange`
- On sign-in: call `GoogleSignin.signIn()` → get `idToken` → `supabase.auth.signInWithIdToken({ provider: 'google', token })`
- On auth change: fetch `profiles` row for `is_pro` and display info

### New: `hooks/useAuth.ts`
- Thin wrapper: `export const useAuth = () => useContext(AuthContext)`

### Modify: `app/_layout.tsx`
- Import `AuthProvider` from contexts/AuthContext
- Import `Purchases` from react-native-purchases
- Init RevenueCat with `EXPO_PUBLIC_REVENUECAT_IOS_KEY` on mount
- Wrap Stack navigator with `<AuthProvider>`
- When user changes in AuthContext, call `Purchases.logIn(user.id)` / `Purchases.logOut()`

### New: `.env` (gitignored)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
GOOGLE_IOS_CLIENT_ID=
GOOGLE_WEB_CLIENT_ID=
```

---

## Phase 2 — Auth UI

### New: `app/login.tsx`
- Full-screen with logo + tagline
- "Continue with Google" button → calls `signInWithGoogle()` from AuthContext
- "Continue as Guest" text link → `router.back()` or `router.push('/')`
- No email/password (Google SSO only for now)

### New: `app/account.tsx`
- Shows avatar, display name, email
- Pro status badge (or "Upgrade to Pro" CTA)
- "Manage Subscription" button → `Purchases.showManageSubscriptions()` (opens App Store subscription management)
- "Restore Purchases" button → `Purchases.restorePurchases()`
- "Sign Out" button → `signOut()` then `router.replace('/')`

### Modify: `app/index.tsx`
- Add a small avatar/profile icon in the top-right header area
  - If logged in: shows avatar thumbnail → taps to `app/account.tsx`
  - If guest: shows a person icon → taps to `app/login.tsx`

---

## Phase 3 — Content gating

### Modify: `lib/data.ts`
```typescript
export const FREE_ARTICLE_IDS = new Set([
  "mai-you-weng",
  "zeng-zi-sha-zhu",
  "wang-rong-he-jiao",
]);
```

### New: `components/UpgradeModal.tsx`
- Bottom sheet modal (use `react-native` Modal)
- Headline: "Unlock Pro"
- Bullet list of Pro features
- "Start Free Trial" button → calls RevenueCat purchase flow
- "Restore Purchases" link
- Dismiss X button

### New: `components/ProGate.tsx`
```typescript
// Renders children if user is Pro; otherwise renders a locked overlay
// Props: children, articleId? (for context-aware message)
```

### Modify: `app/index.tsx`
- Pass `is_pro` from `useAuth()` to article cards
- For articles not in `FREE_ARTICLE_IDS` and `!is_pro`: show a lock icon + "Pro" badge on the journey node
- Tapping a locked node shows `UpgradeModal` instead of navigating

### Modify: `app/read.tsx`
- On mount: check if `articleId` is in `FREE_ARTICLE_IDS` or user `is_pro`
- If neither: show `UpgradeModal`; don't render article content

### Modify: `app/quiz.tsx`
- Same Pro check as read.tsx (so users can't quiz on locked articles by direct URL)

---

## Phase 4 — RevenueCat + subscriptions

### New: `supabase/functions/revenuecat-webhook/index.ts`
- Receives RevenueCat webhook events (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, etc.)
- Verifies webhook secret header
- On purchase/renewal: `UPDATE profiles SET is_pro = true WHERE revenuecat_id = $1`
- On cancellation/expiration: `UPDATE profiles SET is_pro = false WHERE revenuecat_id = $1`

### Modify: `app/account.tsx`
- "Start Pro" button: calls `Purchases.getOfferings()` then `Purchases.purchasePackage(package)`
- On successful purchase: `Purchases.logIn(user.id)` already done; RevenueCat webhook updates DB
- Poll `profiles.is_pro` after 3s or listen via Supabase Realtime on the profiles row

### RevenueCat dashboard
- Configure webhook URL: `https://<project>.supabase.co/functions/v1/revenuecat-webhook`
- Set webhook secret; store in Supabase Edge Function secrets

---

## Phase 5 — Cloud progress sync

### Modify: `lib/readProgress.ts`
Current: reads/writes to AsyncStorage only.
New behaviour:
- `markAsRead(id)`: always write AsyncStorage (offline fallback); if `is_pro` + signed in, also upsert `read_progress` in Supabase
- `getReadArticles()`: if `is_pro` + signed in, fetch from Supabase; merge with AsyncStorage
- On first login (migration): read existing AsyncStorage set → bulk-upsert to Supabase

### New: `lib/quizHistory.ts`
- `saveQuizAttempt(articleId, answers, score, totalPoints)`: inserts into `quiz_attempts` + `quiz_answers` (Pro users only)
- `fetchMistakeAnalysis(articleId, articleTitle)`: calls `analyze-mistakes` edge function

### Modify: `components/quiz/QuizShell.tsx`
- On quiz completion: if Pro, call `saveQuizAttempt(...)` from quizHistory.ts

---

## Phase 6 — LLM features (OpenRouter via Supabase Edge Functions)

### New: `supabase/functions/analyze-mistakes/index.ts`
- Add Pro check: verify `profiles.is_pro = true` for the calling user (via Supabase JWT)
- Aggregates wrong answers per question across last 5 attempts
- Model: `deepseek/deepseek-chat` via OpenRouter (~$0.07/1M tokens)
- Returns: `{ summary: string | null, tips: string[] }`

### New: `supabase/functions/generate-revision-quiz/index.ts`
- Input: `article_id`, JWT (Supabase auth)
- Fetches user's wrong answers for that article from `quiz_answers`
- Builds a prompt to generate 3–5 targeted multiple-choice questions
- Returns structured JSON quiz; client renders in a simplified `QuizShell`
- Model: `deepseek/deepseek-chat`

### Modify: `components/quiz/ScoreScreen.tsx`
- After quiz save completes (Pro only): show "Analyse My Mistakes" button
- Calls `fetchMistakeAnalysis()` → displays summary + tips in a card
- "Generate Revision Quiz" button → calls generate-revision-quiz edge function → navigates to revision quiz flow

### New: `app/revision-quiz.tsx`
- Similar to `quiz.tsx` but renders LLM-generated questions
- No scoring persistence; goal is practice not grading

---

## Critical files to modify

| File | Change |
|---|---|
| `app/_layout.tsx` | Add AuthProvider, RevenueCat init |
| `app/index.tsx` | Profile icon, journey node locking |
| `app/read.tsx` | Pro gate |
| `app/quiz.tsx` | Pro gate |
| `components/quiz/QuizShell.tsx` | Save quiz attempt on finish |
| `components/quiz/ScoreScreen.tsx` | LLM analysis card |
| `lib/data.ts` | Add FREE_ARTICLE_IDS |
| `lib/readProgress.ts` | Cloud sync |
| `app.json` | Real bundle ID |

## New files summary

```
lib/supabase.ts
lib/quizHistory.ts
contexts/AuthContext.tsx
hooks/useAuth.ts
components/ProGate.tsx
components/UpgradeModal.tsx
app/login.tsx
app/account.tsx
app/revision-quiz.tsx
supabase/functions/revenuecat-webhook/index.ts
supabase/functions/analyze-mistakes/index.ts
supabase/functions/generate-revision-quiz/index.ts
```

---

## Verification checklist

1. **Auth**: fresh install → use app as guest → tap Pro article → UpgradeModal appears; tap login → Google consent → returns to app logged in
2. **Content gate**: free user sees lock on articles 4–6 and challenge nodes; Pro user sees all unlocked
3. **RevenueCat sandbox**: use Xcode StoreKit sandbox to purchase → `is_pro` flips to true in Supabase profiles table (verify via Supabase dashboard)
4. **Cloud sync**: mark article as read on device, sign in on another device → progress synced
5. **LLM analysis**: complete a quiz as Pro user → "Analyse My Mistakes" → response appears within 5s
6. **Sign out**: progress falls back to AsyncStorage; Pro content locked again
