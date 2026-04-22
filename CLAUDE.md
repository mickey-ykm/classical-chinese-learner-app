# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start          # Start Metro bundler (Expo Go / web)
npx expo start --clear  # Start with cache cleared (required after config changes)
npx expo start --web    # Web browser preview (works without a native build)
npx expo run:ios        # Build and run on iOS Simulator (requires Xcode)
npx expo run:android    # Build and run on Android Emulator
npm test                # Run all Jest tests
npm test -- quiz.test.ts  # Run a single test file
expo lint               # Lint the project
```

## Architecture

**Expo Router (file-based stack navigation)**

Three screens under `app/`:
- `index.tsx` — Article list (home), links to Read and Quiz per article
- `read.tsx` — Article reader with footnotes and translation toggle; receives `id` route param
- `quiz.tsx` — Multi-part quiz; receives `id` route param

Navigation: Home → Read?id → Quiz?id → Score (Score is rendered inside `QuizShell`, not a separate route).

**Data layer (`lib/` + `data/`)**

```
data/
├── index.json                          # Article registry (title, source, totalPoints, totalQuestions)
├── articles/{id}.json                  # Article content (segments, footnotes, modernTranslation)
└── quizzes/{id}.json                   # Quiz content (parts → questions)
```

`lib/data.ts` exposes `getArticleIndex()`, `getArticle(id)`, `getAllQuestions(id)`, `getPartTitles(id)`. Adding a new article requires: adding JSON files in both `data/articles/` and `data/quizzes/`, registering them in the static `ARTICLES`/`QUIZZES` maps in `lib/data.ts`, and adding an entry to `data/index.json`.

`lib/quiz.ts` contains pure scoring logic (`checkAnswer`, `calculateScore`, `getPartScore`). `lib/types.ts` defines all shared interfaces.

**Quiz state machine (`components/quiz/QuizShell.tsx`)**

All quiz state lives here: current question index, answers map, reveal state, and finished flag. Answer selection triggers a 1.2 s reveal delay before auto-advancing to the next question. `partTitles` (a `Record<number, string>` derived from the quiz's parts array) is passed down to `QuizQuestion` and `ScoreScreen` so part headers and score breakdown are driven by data, not hardcoded strings.

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
