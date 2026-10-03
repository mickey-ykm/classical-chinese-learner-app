# Tasks

Day-to-day tracker. Architecture and roadmap live in `project-specification.md`. Full specs of old tickets (#001–#042, with implementation notes and test checklists) are in `archive/TASKS-full-2026-07.md`; when starting a backlog item, copy its spec from there.

_Last reviewed: 2026-10-03 (after a ~3-month break; last coding session was 2026-07-11)._

---

## Current focus (WIP plan)

Jiān design system migration is **done and merged to `main`**. Where to resume:

1. **Wrap up the July Android polish**
   - [ ] Smoke-test on Android + iOS: exercise history, attempt detail, footnote panel / article viewer (fixed 2026-07-10/11)
   - [ ] Commit pending work: `CLAUDE.md` rewrite, docs/memory cleanup, `docs/debug-screenshots/`
2. **Close out QA items** (below)
3. **Pick the next track** (decide, then move into "In Progress"):
   - **A. Phase 12 — RevenueCat / subscriptions** (monetization path; see "Next Steps" in `project-specification.md`). Needs a real bundle ID in `app.json` (still `com.anonymous...`), App Store Connect product, RevenueCat dashboard, and a Supabase webhook function.
   - **B. #030 — First-time user onboarding** (best-specified backlog item, ~4–6 h)
   - **C. Phase 14 — Ads** (after A)

## In Progress

_Nothing yet. Format: `- [ ] #N — Type: description (started YYYY-MM-DD)`_

## Ready for QA

- [ ] **#022 — BUG: stale deleted articles stay in cache** — orphan detection added to incremental sync (`removeOrphans()` in `lib/contentStore.ts`). Verify: delete an article in the admin portal → relaunch app → it disappears.
- [ ] **#020 — BUG: odd time formatting** — `formatSeconds()` / `timeDelta()` in `app/account.tsx`, `app/attempt.tsx` now pick sec/min/hour/day. Not seen again; close if still fine.

## Backlog (not started)

Specs are in the archive file under the same number.

| # | Type | Item | Effort |
|---|------|------|--------|
| 030 | Feature | Onboarding: 3-screen welcome carousel + first-use tooltips (AsyncStorage flags) | 4–6 h |
| 041 | Feature | Weight training: re-include previously wrong questions in sampling (higher priority, not avoided) | ~2 h |
| 037 | UX | Adjustable font size (Context + AsyncStorage + settings UI) | 2–3 h |
| 033 | Feature | Study streaks + daily goals | 1 day |
| 034 | Feature | Achievement badges | 1–2 days |
| 031 | Feature | Mistake pattern analysis (by question type / part) | 2–3 days |
| 035 | Feature | Progress visualization charts | 2–3 days |
| 036 | Feature | Home screen widget (needs native Swift/Kotlin) | 3–4 days |
| 032 | Feature | Spaced-repetition vocabulary flashcards | 1–2 weeks |

Known minor issue (unticketed): `signOut()` in `AuthContext` calls `signInAnonymously()` without error handling; an offline logout can leave the app sessionless.

## Recently done

- 2026-07-11 Exercise history + attempt detail revamped in Jiān; Android footnote/article-viewer fixes
- 2026-07-04 Jiān migration of quiz, revision and training screens complete
- 2026-06-28 Revision revamp: `/performance-report`, `/revision-article`, `/revision-part` (#010, #040, #042)
- 2026-06-27 Magic link login (#029); unified `exercise_sessions` / `exercise_answers` model (#024, #025, #038); multi-type history (#039)
- 2026-06-23 Weight training (#026)
- Earlier: see archive

## Conventions

- Task IDs are sequential (`#043` is next); reference them in commits, e.g. `fix: timer (#043)`.
- Types: Bug, Feature, UX, Refactor, Doc, Test, Deploy.
- Flow: Backlog → In Progress → Ready for QA (Mickey validates) → Recently done.
