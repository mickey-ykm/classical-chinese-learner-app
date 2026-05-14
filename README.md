# Classical Chinese Learner

A mobile-first app for reading and mastering Classical Chinese texts. Students read annotated passages, answer structured quizzes, and track their progress — with a revision chapter that replays their own mistakes.

## Product vision

Classical Chinese (文言文) is taught in Hong Kong secondary schools but is notoriously difficult to self-study. Existing tools treat it as a dictionary lookup problem. This app treats it as a reading comprehension problem: every article is a curated passage from a canonical text, paired with footnotes, a modern-Chinese translation, and a quiz that tests vocabulary, grammar, and comprehension in the same way the HKDSE exam does.

**Core loop:** Read → Quiz → Revision chapter (replay wrong answers) → track improvement over time.

**Content is managed through a separate admin portal** (`admin/`) hosted on Railway, where editors can draft, publish, and gate articles without a code deploy.

---

文言文在香港中學課程中列為必修科目，但自學難度向來極高。現有的學習工具多以查字典為主要功能，未能切中要害。本應用程式以閱讀理解為核心：每篇文章均為經典文本的精選段落，配備注釋、現代中文翻譯，以及仿照香港文憑試（HKDSE）形式設計的測驗，全面考核詞彙、語法及理解能力。

**學習循環：** 閱讀 → 測驗 → 複習章節（重溫錯誤答案）→ 追蹤進步

**內容管理透過獨立的後台管理系統**（`admin/`）進行，部署於 Railway，編輯人員可在不需要重新部署程式碼的情況下草擬、發佈及管控文章。

## Product features

1. **Batch LLM assessment** — bulk-generates modern Chinese translations and quiz exercises from raw Classical Chinese passages using an LLM pipeline, reducing content production time from hours to minutes.
2. **Teacher-friendly CMS** — a prompt management interface in the admin portal lets educators tune LLM prompts, review generated content, and publish articles without writing code.
3. **Student performance analysis** — tracks per-article and per-question accuracy over time, surfacing each student's weakest comprehension areas in Classical Chinese.
4. **Exam timing training** — a live countdown timer benchmarked against HKDSE expected completion times trains students to pace themselves under exam conditions.

---

1. **批量 LLM 評估工具** — 透過大型語言模型流程，對文言文段落批量生成現代文翻譯及練習題，將內容製作時間由數小時縮短至數分鐘。
2. **教師友好的內容管理系統** — 後台管理系統內建提示詞管理介面，讓教育工作者無需編寫程式碼，即可調整 LLM 提示詞、審閱生成內容並發布文章。
3. **學生表現分析** — 追蹤每篇文章及每道題目的長期答題準確率，清晰呈現學生在文言文理解上的薄弱環節。
4. **考試限時訓練** — 即時倒數計時器以文憑試（HKDSE）預期完成時間為基準，訓練學生在考試情境下掌握答題節奏。

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo (React Native) + Expo Router |
| Styling | NativeWind v4 (Tailwind classes on RN primitives) |
| Backend | Supabase (Postgres, Auth, RLS) |
| Local cache | SQLite via `expo-sqlite`; bundled JSON seed for offline/first launch |
| Admin portal | Express + `express-session` + `bcryptjs`, deployed on Railway |
| Payments (planned) | RevenueCat |
| Language | TypeScript throughout |

## Project setup

### Prerequisites

- Node.js 18+
- Xcode (for iOS Simulator) or Android Studio (for Android Emulator)
- A Supabase project with the schema applied (see `docs/auth-membership-llm-plan.md`)

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Create a `.env.local` file at the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Run the app

```bash
npx expo start --web        # Quickest — opens in a browser (NativeWind works here)
npx expo run:ios            # iOS Simulator (requires Xcode)
npx expo run:android        # Android Emulator
npx expo start              # Expo Go / general Metro (NativeWind does not work in Expo Go)
npx expo start --clear      # Clear Metro cache (required after config changes)
```

> **Note:** NativeWind v4 does not work in Expo Go. Use `--web` or a native build for styling to render correctly.

### 4. Run tests and lint

```bash
npm test                        # All Jest tests
npm test -- quiz.test.ts        # Single test file
expo lint                       # ESLint
```

## Admin portal

The admin portal lives in `admin/` and is a standalone Express app. It is deployed separately on Railway.

```bash
cd admin
npm install
npm run dev         # Local development server (port 3001)
```

To create an admin user:

```bash
npm run create-admin -- email@example.com password
```

Required environment variables for the admin portal:

```env
EXPO_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_SESSION_SECRET=...
```

## Project structure

```
app/                    # Expo Router screens
  index.tsx             # Article list / journey map (home)
  read.tsx              # Article reader with footnotes + translation toggle
  quiz.tsx              # Multi-part quiz
  revision.tsx          # Revision chapter (replay wrong answers)
  account.tsx           # User account + quiz history
  attempt.tsx           # Quiz attempt detail
admin/                  # Express admin portal (separate deployment)
components/             # Shared UI components
  quiz/QuizShell.tsx    # Quiz state machine (all quiz state lives here)
  UpgradeModal.tsx      # Pro upgrade prompt
contexts/               # React contexts (AuthContext)
data/                   # Bundled JSON seed (offline fallback)
  index.json            # Article registry
  articles/{id}.json    # Article content
  quizzes/{id}.json     # Quiz content
docs/                   # Project planning docs
lib/                    # Core logic
  contentStore.ts       # SQLite cache + Supabase sync
  data.ts               # Data access (thin wrappers over contentStore)
  quiz.ts               # Pure scoring logic
  readProgress.ts       # Read-progress sync (local + cloud)
  revisionSession.ts    # Revision chapter question sampling
  types.ts              # Shared TypeScript interfaces
shared/
  schema.ts             # Zod schemas (used by both admin portal and mobile)
```

## Key conventions

- Path alias `@/` maps to the project root (e.g. `import { getArticle } from "@/lib/data"`).
- Classical Chinese text uses `style={{ fontFamily: "Georgia" }}`.
- Amber is the primary accent colour (`amber-500` / `amber-600`); slate-50 is the background.
- `hitSlop={12}` on small touch targets.
- Adding a new article requires JSON files in `data/articles/` and `data/quizzes/`, an entry in `data/index.json`, and registration in the static maps in `lib/data.ts` — or use the admin portal to publish directly to Supabase.
