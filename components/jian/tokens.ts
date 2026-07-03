/**
 * Jiān Design System — Design Tokens
 *
 * Color palette, typography, spacing, and other design primitives
 * for the Classical Chinese Learner app redesign.
 *
 * Based on: docs/design/ui-revamp-html-mock-up/00-design-language.html
 */

export const JianColors = {
  // Base colors
  paper: '#f4f0e6',      // Background
  surface: '#fdfbf6',    // Card background
  surface2: '#faf5ea',   // Segmented control bg

  // Text colors
  ink: '#2c2722',        // Primary text
  ink2: '#6f665a',       // Secondary text
  ink3: '#a59b8b',       // Tertiary text / labels

  // Border colors
  line: '#e7ddc9',       // Primary borders
  line2: '#ded2ba',      // Secondary borders

  // Accent colors
  vermilion: '#b0392c',  // Primary CTA, error
  jade: '#3f6b54',       // Success, progress
  amber: '#bb8a2e',      // Warning, high progress

  // Tints (13-17% opacity mix with paper)
  vermilionTint: '#f9ebe9',
  jadeTint: '#ecf1ee',
  amberTint: '#f7f1e8',

  // Borders (34-42% opacity mix with paper)
  vermilionBorder: '#e5c5c0',
  jadeBorder: '#d1ddd5',
  amberBorder: '#e8dcc8',
} as const

export const JianTypography = {
  // Font families - loaded via expo-google-fonts
  serif: 'NotoSerifTC_400Regular',  // Chinese text with proper serif support
  sans: 'System',                    // Labels, captions, UI text
  number: 'NotoSerifTC_400Regular',  // Numbers, timers, scores

  // Font sizes
  display: 31,
  title: 21,
  heading: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
  label: 11,
  tiny: 10,

  // Line heights (for classical Chinese text)
  classicalLineHeight: 2.3,

  // Font weights - use appropriate font variants instead
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
} as const

export const JianSpacing = {
  // Base unit: 4px
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,

  // Semantic spacing
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 12,
} as const

export const JianRadius = {
  // Border radius values
  chip: 3,
  badge: 4,
  button: 6,
  input: 8,
  card: 11,
  modal: 20,
  full: 9999,
} as const

export const JianShadows = {
  card: {
    shadowColor: '#2c2722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLarge: {
    shadowColor: '#2c2722',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
} as const

export const JianMascotColors = {
  // Mascot-specific colors (not used in UI)
  robe: '#46586a',        // 袍 (robe)
  ink: '#2f2a25',         // 墨 (ink stick)
  bamboo: '#cba24e',      // 竹金 (bamboo/gold)
  skin: '#f2ddb0',        // 膚 (skin)
  jade: '#dce8d6',        // 玉鏡 (jade mirror)
} as const

/**
 * Utility function to get font family string
 */
export function getJianFont(type: 'serif' | 'sans' | 'number'): string {
  switch (type) {
    case 'serif':
      return JianTypography.serif
    case 'sans':
      return JianTypography.sans
    case 'number':
      return JianTypography.number
  }
}
