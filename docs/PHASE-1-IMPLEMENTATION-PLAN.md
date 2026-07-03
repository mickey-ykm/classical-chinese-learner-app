# Phase 1 Implementation Plan — UX Hierarchy Changes

**Date:** 2026-07-03  
**Goal:** Restructure navigation and consolidate pages using existing styling (no Jiān visual design yet)  
**Branch:** `feature/jian-design-system` (existing)

---

## Overview

Phase 1 focuses on **structural changes only** — navigation hierarchy, page consolidation, and route reorganization. No visual design changes. All modifications use current amber/slate theme and existing components.

**Success Criteria:**
- 4-tab navigation instead of 5
- All existing features remain accessible
- No visual regressions
- All tests pass

---

## Changes Summary

### Navigation Changes
- ✅ **5 → 4 tabs** (merge DSE文章 + 其他文章)
- ✅ **Tab rename**: "DSE操練" → "操練"
- ✅ **Revision naming**: "溫故知新" → "錯題重溫"

### Page Changes
- ✅ **Chapters consolidated** with segmented control
- ✅ **Practice Hub** restructured (4-card layout)
- ✅ **Home simplified** (single "繼續篇章" section)
- ✅ **Account shortened** (history limited to 3 items)

---

## Task Breakdown

### Task 1: Consolidate Chapters Tab

**Files to change:**
- `app/(tabs)/_layout.tsx` — reduce tabs from 5 to 4
- `app/(tabs)/dse-learner.tsx` → delete
- `app/(tabs)/extra-articles.tsx` → delete
- Create new: `app/(tabs)/chapters.tsx`

**Implementation:**

```typescript
// app/(tabs)/chapters.tsx

import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArticleList } from '@/components/ArticleList';

export default function ChaptersScreen() {
  const [segment, setSegment] = useState<'dse-exam' | 'dse-non-exam' | 'other'>('dse-exam');

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-3">
        <Text className="text-2xl font-bold" style={{ fontFamily: 'Georgia' }}>
          篇章
        </Text>
        <Text className="text-xs text-slate-600 mt-1">
          26 篇 · 題庫 1,200+ 題
        </Text>
      </View>

      {/* Segmented Control */}
      <View className="px-6 pb-3">
        <View className="flex-row bg-slate-100 rounded-lg p-1">
          <Pressable
            className={`flex-1 py-2 rounded-md ${segment === 'dse-exam' ? 'bg-amber-500' : ''}`}
            onPress={() => setSegment('dse-exam')}
          >
            <Text className={`text-center text-xs ${segment === 'dse-exam' ? 'text-white font-medium' : 'text-slate-600'}`}>
              甲部指定
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 py-2 rounded-md ${segment === 'dse-non-exam' ? 'bg-amber-500' : ''}`}
            onPress={() => setSegment('dse-non-exam')}
          >
            <Text className={`text-center text-xs ${segment === 'dse-non-exam' ? 'text-white font-medium' : 'text-slate-600'}`}>
              高中課文
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 py-2 rounded-md ${segment === 'other' ? 'bg-amber-500' : ''}`}
            onPress={() => setSegment('other')}
          >
            <Text className={`text-center text-xs ${segment === 'other' ? 'text-white font-medium' : 'text-slate-600'}`}>
              其他範文
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Article List */}
      <ArticleList filter={segment} />
    </View>
  );
}
```

**Update tab layout:**

```typescript
// app/(tabs)/_layout.tsx

<Tabs.Screen
  name="chapters"
  options={{
    title: '篇章',
    tabBarIcon: ({ color }) => <BookIcon color={color} />,
  }}
/>

// Remove dse-learner and extra-articles tabs
```

**Tests to write:**
- Segment switching updates article list
- All article types accessible via segments
- Existing article cards render correctly

---

### Task 2: Restructure Practice Hub

**Files to change:**
- `app/(tabs)/dse-training.tsx` → rename to `practice.tsx`

**Implementation:**

```typescript
// app/(tabs)/practice.tsx

export default function PracticeScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="px-6 pt-4">
        <Text className="text-2xl font-bold" style={{ fontFamily: 'Georgia' }}>
          操練
        </Text>
        <Text className="text-xs text-slate-600 mt-1">
          重點操練，全面備試。
        </Text>
      </View>

      {/* DSE Mock Exam - Primary Card */}
      <View className="px-6 mt-5">
        <Pressable
          className="bg-slate-800 rounded-xl p-5"
          onPress={() => router.push('/(tabs)/dse-training')} // existing DSE mock logic
        >
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-lg font-bold text-white" style={{ fontFamily: 'Georgia' }}>
                DSE 模擬考題
              </Text>
              <Text className="text-xs text-slate-400 mt-1">
                隨機抽選 3 篇 · 22 題
              </Text>
            </View>
            {/* Mascot icon placeholder */}
          </View>
          <Text className="text-xs text-slate-400 leading-5 mb-4">
            每次隨機組合，模擬真實考試節奏，完成後自動記錄。
          </Text>
          <View className="bg-amber-500 rounded-md py-3">
            <Text className="text-center text-white font-semibold">開始模擬</Text>
          </View>
        </Pressable>
      </View>

      {/* Article Mistakes Review */}
      <Pressable
        className="mx-6 mt-3 bg-white rounded-xl p-4 border border-slate-200 flex-row items-center"
        onPress={() => router.push('/revision-article')}
      >
        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ fontFamily: 'Georgia' }}>
            文章錯題重溫
          </Text>
          <Text className="text-xs text-slate-600 mt-1">
            按文章分類 · 針對薄弱篇章
          </Text>
        </View>
        <Text className="text-amber-500 text-lg">›</Text>
      </Pressable>

      {/* Grammar Basics Mistakes Review */}
      <Pressable
        className="mx-6 mt-3 bg-white rounded-xl p-4 border border-slate-200 flex-row items-center"
        onPress={() => router.push('/revision-part')}
      >
        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ fontFamily: 'Georgia' }}>
            語基能力錯題重溫
          </Text>
          <Text className="text-xs text-slate-600 mt-1">
            按題型分類 · 一詞多義 · 句式等
          </Text>
        </View>
        <Text className="text-amber-500 text-lg">›</Text>
      </Pressable>

      {/* Weight Training */}
      <Pressable
        className="mx-6 mt-3 mb-6 bg-white rounded-xl p-4 border border-slate-200 flex-row items-center"
        onPress={() => router.push('/weight-training')}
      >
        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ fontFamily: 'Georgia' }}>
            針對性難題訓練
          </Text>
          <Text className="text-xs text-slate-600 mt-1">
            跨文章 Part 7 & 8 專項
          </Text>
        </View>
        <Text className="text-amber-500 text-lg">›</Text>
      </Pressable>
    </ScrollView>
  );
}
```

**Update tab layout:**

```typescript
// app/(tabs)/_layout.tsx

<Tabs.Screen
  name="practice"
  options={{
    title: '操練',  // Changed from "DSE操練"
    tabBarIcon: ({ color }) => <TargetIcon color={color} />,
  }}
/>
```

**Tests to write:**
- All 4 cards navigate to correct routes
- Weight training is active (not greyed out)

---

### Task 3: Simplify Home Screen

**Files to change:**
- `app/(tabs)/index.tsx`

**Implementation:**

```typescript
// app/(tabs)/index.tsx

export default function HomeScreen() {
  const { user } = useAuth();
  const recentArticles = useRecentArticles(3); // Hook to get last 3 practiced articles

  return (
    <ScrollView className="flex-1 bg-slate-50">
      {/* Greeting + Stats (keep existing) */}
      <GreetingSection />

      {/* REMOVE: DSE操練 banner - now in Practice tab */}

      {/* CHANGE: Single "繼續篇章" section */}
      <View className="px-6 mt-6">
        <Text className="text-xs font-semibold text-slate-500 tracking-wider mb-2">
          繼 續 篇 章
        </Text>
        
        {recentArticles.map(article => (
          <ArticleCard key={article.id} article={article} showProgress />
        ))}
      </View>

      {/* Ability Analysis (keep existing) */}
      <AbilityAnalysisCard />
    </ScrollView>
  );
}
```

**New hook to create:**

```typescript
// lib/hooks/useRecentArticles.ts

export function useRecentArticles(limit: number = 3) {
  const { user } = useAuth();
  const [articles, setArticles] = useState<ArticleEntry[]>([]);

  useEffect(() => {
    if (!user) return;

    // Query exercise_sessions for most recent article IDs
    const fetchRecent = async () => {
      const sessions = await getRecentSessions(user.id, limit);
      const articleIds = sessions
        .filter(s => s.kind === 'article-quiz')
        .map(s => s.article_id);
      
      const articleData = await getArticlesByIds(articleIds);
      setArticles(articleData);
    };

    fetchRecent();
  }, [user, limit]);

  return articles;
}
```

**Tests to write:**
- Recent articles display correctly
- Falls back gracefully if user has no history

---

### Task 4: Shorten Account Screen

**Files to change:**
- `app/account.tsx`

**Implementation:**

```typescript
// app/account.tsx

export default function AccountScreen() {
  const recentAttempts = useRecentAttempts(3); // Changed from showing all

  return (
    <ScrollView className="flex-1 bg-slate-50">
      {/* User info + stats (keep existing) */}
      
      {/* Ability analysis (keep existing) */}
      
      {/* Upgrade card (keep existing) */}

      {/* Recent Practice - LIMITED */}
      <View className="px-6 mt-6">
        <Text className="text-xs font-semibold text-slate-500 tracking-wider mb-2">
          最 近 練 習
        </Text>
        
        {recentAttempts.map(attempt => (
          <AttemptRow key={attempt.id} attempt={attempt} />
        ))}

        {/* NEW: Link to full history */}
        <Pressable
          className="mt-3"
          onPress={() => router.push('/exercise-history')}
        >
          <Text className="text-center text-amber-500 text-sm font-semibold">
            全部紀錄 →
          </Text>
        </Pressable>
      </View>

      {/* Settings (keep existing) */}
    </ScrollView>
  );
}
```

**Tests to write:**
- Only 3 recent attempts show
- "全部紀錄" link navigates correctly

---

### Task 5: Update Revision Page Titles

**Files to change:**
- `app/revision-article.tsx`
- `app/revision-part.tsx`

**Implementation:**

```typescript
// app/revision-article.tsx

export default function RevisionArticleScreen() {
  return (
    <View>
      {/* Change title from "文章錯題複習" to "文章錯題重溫" */}
      <Text className="text-2xl font-bold">文章錯題重溫</Text>
      <Text className="text-xs text-slate-600 mt-1">
        按文章分類，針對性重溫各篇章的錯題。
      </Text>
      
      {/* Rest of existing logic */}
    </View>
  );
}

// app/revision-part.tsx

export default function RevisionPartScreen() {
  return (
    <View>
      {/* Change title */}
      <Text className="text-2xl font-bold">語基能力錯題重溫</Text>
      <Text className="text-xs text-slate-600 mt-1">
        按題型分類，針對性重溫語基能力的錯題。
      </Text>
      
      {/* Rest of existing logic */}
    </View>
  );
}
```

---

## Testing Checklist

### Navigation Tests
- [ ] Bottom nav shows 4 tabs: 首頁, 篇章, 操練, 帳戶
- [ ] All tabs render without errors
- [ ] Tab icons display correctly

### Chapters Tab Tests
- [ ] Segmented control switches between 3 segments
- [ ] Articles filter correctly by segment
- [ ] Article cards render with existing styling
- [ ] Tapping article navigates to reader

### Practice Hub Tests
- [ ] All 4 cards render correctly
- [ ] DSE mock exam card navigates to existing DSE training flow
- [ ] Article mistakes card navigates to `/revision-article`
- [ ] Grammar mistakes card navigates to `/revision-part`
- [ ] Weight training card navigates to `/weight-training` (active, not greyed)

### Home Screen Tests
- [ ] Greeting and stats render
- [ ] "繼續篇章" shows 3 recent articles
- [ ] Falls back gracefully if no history
- [ ] Ability analysis card renders

### Account Screen Tests
- [ ] Only 3 recent attempts show
- [ ] "全部紀錄 →" link works
- [ ] Settings section unchanged

### Revision Tests
- [ ] Titles updated to use "錯題重溫"
- [ ] Existing logic unchanged
- [ ] Navigation from Practice Hub works

---

## Rollout Plan

### Step 1: Create Feature Branch (if needed)
```bash
git checkout feature/jian-design-system
# OR if starting fresh:
git checkout -b feature/phase1-ux-hierarchy
```

### Step 2: Implement Tasks in Order
1. Task 1: Chapters consolidation
2. Task 2: Practice Hub restructure
3. Task 3: Home simplification
4. Task 4: Account shortening
5. Task 5: Revision titles

### Step 3: Test Locally
```bash
npx expo start --clear
# Test on iOS simulator
# Test on web
```

### Step 4: Run Test Suite
```bash
npm test
```

### Step 5: User Testing
- Test all navigation flows
- Verify no features are missing
- Check performance

### Step 6: Commit and Push
```bash
git add .
git commit -m "feat: Phase 1 UX hierarchy changes

- Consolidate chapters tab (5→4 tabs)
- Restructure practice hub with 4-card layout
- Simplify home screen with single continue section
- Shorten account history to 3 items
- Update revision titles to '錯題重溫'

All changes use existing styling (no Jiān visual design yet)"

git push origin feature/jian-design-system
```

---

## Risk Mitigation

### Risk 1: Breaking Existing Navigation
**Mitigation:** Keep old files until new ones are tested. Use feature flags if needed.

### Risk 2: User Confusion
**Mitigation:** Phase 1 makes minimal changes to visual appearance, only structure.

### Risk 3: Data Migration Issues
**Mitigation:** No data changes in Phase 1. All existing queries work unchanged.

---

## Success Metrics

After Phase 1 deployment:
- [ ] No increase in error rates
- [ ] All existing user flows work
- [ ] Navigation comprehension improves (via user feedback)
- [ ] Performance metrics maintained or improved

---

## Next Phase Preview

**Phase 2** will build the Jiān component library (`/components/jian/`) with new design tokens, colors, and typography. Phase 1 structure will remain, but visual styling will be updated to match design mockups.

---

## Estimated Timeline

- **Task 1 (Chapters):** 3-4 hours
- **Task 2 (Practice):** 2-3 hours
- **Task 3 (Home):** 2-3 hours
- **Task 4 (Account):** 1 hour
- **Task 5 (Revision):** 30 min
- **Testing:** 2-3 hours
- **Total:** ~12-15 hours (2 work days)

---

## Questions / Blockers

*Document any questions or blockers here as they arise during implementation.*

---

## Completion Checklist

- [ ] All 5 tasks implemented
- [ ] All tests pass
- [ ] Manual testing complete
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Code reviewed
- [ ] Committed to git
- [ ] Ready for Phase 2

---

**End of Phase 1 Plan**
