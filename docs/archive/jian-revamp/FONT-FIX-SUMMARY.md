# Font Fix Summary — 2026-07-03

## Issues Found
1. ✅ Typography using wrong font (Georgia instead of Noto Serif TC)
2. ✅ Tab bar using emoji instead of SVG icons

## Fixes Applied

### 1. Font Loading (3 commits)

**Commit 16f8172:** Initial attempt - used Georgia system font
- Problem: Georgia doesn't have Chinese character serif support
- Result: Chinese text displayed in sans-serif fallback

**Commit a95a5cd:** Load Noto Serif TC via expo-google-fonts
- Added useFonts hook to app/_layout.tsx
- Imported NotoSerifTC font variants
- Updated tokens to use 'NotoSerifTC_400Regular'

**Commit 15d48b6:** Use correct font variants for weights
- Created getSerifFont() helper function
- Added all font weight variants to tokens:
  - NotoSerifTC_400Regular (regular)
  - NotoSerifTC_500Medium (medium)
  - NotoSerifTC_600SemiBold (semibold)
  - NotoSerifTC_700Bold (bold)
- Updated home screen to use getSerifFont('700') for bold text

### 2. Tab Bar Icons (1 commit)

**Commit 70f34a1:** Replace emoji with SVG icons
- Created SVG icon components from UI design
- Home: House icon
- Chapters: Book icon
- Practice: Target/circle icon
- Account: User profile icon
- Use vermilion (#b0392c) for active state
- Use ink3 (#a59b8b) for inactive state

## Technical Details

### Why fontWeight doesn't work with custom fonts
React Native custom fonts require specific font family names for each weight:
- ❌ Wrong: `fontFamily: 'NotoSerifTC', fontWeight: '700'`
- ✅ Right: `fontFamily: 'NotoSerifTC_700Bold'`

### getSerifFont() Helper
```typescript
export function getSerifFont(weight?: '400' | '500' | '600' | '700'): string {
  switch (weight) {
    case '500': return JianTypography.serifMedium
    case '600': return JianTypography.serifSemiBold
    case '700': return JianTypography.serifBold
    default: return JianTypography.serif
  }
}
```

### Usage Pattern
```typescript
// Regular text
<Text style={{ fontFamily: JianTypography.serif }}>Text</Text>

// Bold text
<Text style={{ fontFamily: getSerifFont('700') }}>Bold Text</Text>

// Semibold text
<Text style={{ fontFamily: getSerifFont('600') }}>Semibold Text</Text>
```

## Remaining Work

Other pages still need font weight fixes:
- [ ] Chapters tab
- [ ] Practice hub
- [ ] Login screen
- [ ] Account screen
- [ ] Article reader
- [ ] Quiz interface

Each needs:
1. Import `getSerifFont` from '@/components/jian'
2. Replace `fontWeight: JianTypography.bold` with `getSerifFont('700')`
3. Replace `fontWeight: JianTypography.semibold` with `getSerifFont('600')`
4. Remove `fontWeight` prop when using custom fonts

## Files Modified

1. `app/_layout.tsx` - Added font loading
2. `components/jian/tokens.ts` - Font variants + helper function
3. `app/(tabs)/index.tsx` - Fixed font weights
4. `app/(tabs)/_layout.tsx` - SVG tab icons

## Testing Checklist

- [x] Fonts load without errors
- [ ] Chinese text displays with serifs (Noto Serif TC)
- [ ] Bold text is actually bold (using 700 variant)
- [ ] Tab icons display correctly
- [ ] Active/inactive states work

---

**Total commits:** 25 on feature/jian-design-system branch

**Status:** Home screen fonts fixed. Other pages need similar updates.
