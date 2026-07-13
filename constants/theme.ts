export const Colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F3F7',
  text: '#0B1220',
  textMuted: '#697386',
  primary: '#0868F7',
  primaryPressed: '#0054D6',
  primarySoft: '#EAF2FF',
  border: '#E1E5EA',
  danger: '#D92D20',
  dangerSoft: '#FFF1F0',
  before: '#0868F7',
  progress: '#F57C00',
  after: '#2E9B42',
  shadow: '#15233D',
  light: {
    text: '#0B1220',
    background: '#F7F8FA',
    tint: '#0868F7',
    icon: '#697386',
    tabIconDefault: '#697386',
    tabIconSelected: '#0868F7',
  },
  dark: {
    text: '#F7F8FA',
    background: '#0B1220',
    tint: '#FFFFFF',
    icon: '#AAB2C0',
    tabIconDefault: '#AAB2C0',
    tabIconSelected: '#FFFFFF',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;
