import { Platform } from 'react-native';

// 4pt spacing scale — every layout gap/padding value should come from here.
const SPACING_UNIT = 4;

export const spacing = {
  none: 0,
  xxs: SPACING_UNIT, // 4
  xs: SPACING_UNIT * 2, // 8
  sm: SPACING_UNIT * 3, // 12
  md: SPACING_UNIT * 4, // 16
  lg: SPACING_UNIT * 6, // 24
  xl: SPACING_UNIT * 8, // 32
  xxl: SPACING_UNIT * 12, // 48
  xxxl: SPACING_UNIT * 16, // 64
} as const;

export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

// The app's fixed dark palette — warm near-black background, bone text, muted gold accent.
export const palette = {
  background: '#14110F',
  backgroundElevated: '#1C1815',
  border: '#2A241F',
  text: '#EDE6D6',
  textMuted: '#A69C8C',
  accent: '#B9975B',
  accentMuted: '#8A754A',
  danger: '#C1554A',
} as const;

export const fonts = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
} as const;

// iOS Human Interface Guidelines text styles (size/lineHeight/weight).
export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' },
} as const;

export const theme = {
  colors: palette,
  spacing,
  radii,
  fonts,
  typography,
} as const;

export type Theme = typeof theme;
