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
  vermilionTint: '#f3e9e8',
  jadeTint: '#e9ede9',
  amberTint: '#f4f0e6',

  // Border variants (30-34% opacity mix with paper)
  vermilionBorder: '#dac6c3',
  jadeBorder: '#d2dcd2',
  amberBorder: '#e5dcca',

  // Special colors
  white: '#ffffff',      // Pure white for button text on dark backgrounds
} as const

export const JianTypography = {
  // Font families - loaded via expo-google-fonts
  // Use getFontFamily() helper for proper weight handling
  serif: 'NotoSerifTC_400Regular',  // Chinese text with proper serif support
  serifMedium: 'NotoSerifTC_500Medium',
  serifSemiBold: 'NotoSerifTC_600SemiBold',
  serifBold: 'NotoSerifTC_700Bold',
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

  // Font weights - use for reference only
  // For Noto Serif TC, use the appropriate font variant instead
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
} as const

/**
 * Get the correct font family name based on weight for Noto Serif TC
 * System font supports fontWeight, but custom fonts need specific variants
 */
export function getSerifFont(weight?: '400' | '500' | '600' | '700'): string {
  switch (weight) {
    case '500': return JianTypography.serifMedium
    case '600': return JianTypography.serifSemiBold
    case '700': return JianTypography.serifBold
    default: return JianTypography.serif
  }
}

export const JianSpacing = {
  // Base unit: 4px
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const JianRadius = {
  button: 11,
  card: 11,
  input: 11,
  badge: 5,
  full: 9999,
} as const

export const JianShadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
} as const
