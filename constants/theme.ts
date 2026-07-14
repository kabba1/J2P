export const Colors = {
  background: '#0F141B',
  surface: '#151B23',
  surfaceRaised: '#1B2430',
  surfaceMuted: '#202A36',
  text: '#F7F9FC',
  textMuted: '#A5AFBD',
  textTertiary: '#737E8C',
  primary: '#0868F7',
  primaryPressed: '#005AD6',
  primarySoft: '#10294A',
  border: '#2A323C',
  danger: '#F04438',
  dangerSoft: '#35191D',
  before: '#0868F7',
  progress: '#FF941A',
  after: '#42B963',
  shadow: '#000000',
  onPrimary: '#FFFFFF',
  light: {
    text: '#F7F9FC',
    background: '#0F141B',
    tint: '#0868F7',
    icon: '#A5AFBD',
    tabIconDefault: '#A5AFBD',
    tabIconSelected: '#0868F7',
  },
  dark: {
    text: '#F7F9FC',
    background: '#0F141B',
    tint: '#0868F7',
    icon: '#A5AFBD',
    tabIconDefault: '#A5AFBD',
    tabIconSelected: '#0868F7',
  },
} as const;

export const ExportColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F3F7',
  text: '#0B1220',
  border: '#E1E5EA',
  primary: '#0868F7',
  onPrimary: '#FFFFFF',
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
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const TouchTarget = {
  minimum: 44,
} as const;
