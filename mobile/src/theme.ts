// MiniLedger Design System
export const Colors = {
  // Primary brand
  primary: '#4F6EF7',
  primaryDark: '#3A56D4',
  primaryLight: '#EEF1FE',

  // Accent
  accent: '#00C896',
  accentDark: '#00A87E',
  accentLight: '#E6FAF5',

  // Status
  danger: '#F7504F',
  dangerLight: '#FEF0F0',
  warning: '#F7A84F',
  warningLight: '#FEF7ED',
  success: '#00C896',
  successLight: '#E6FAF5',

  // Neutrals
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E8ECF4',
  divider: '#F0F2F8',

  // Text
  textPrimary: '#1A1D2E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Gradient stops
  gradientStart: '#4F6EF7',
  gradientEnd: '#6C8EFF',

  // Card gradients
  cardGradient1Start: '#4F6EF7',
  cardGradient1End: '#7B9BFF',
  cardGradient2Start: '#00C896',
  cardGradient2End: '#00E6AC',
  cardGradient3Start: '#F7504F',
  cardGradient3End: '#FF7B7A',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  displayLarge: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  displayMedium: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading1: { fontSize: 22, fontWeight: '700' as const },
  heading2: { fontSize: 18, fontWeight: '700' as const },
  heading3: { fontSize: 16, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const },
  bodySmall: { fontSize: 12, fontWeight: '400' as const },
  labelLarge: { fontSize: 14, fontWeight: '600' as const },
  labelMedium: { fontSize: 12, fontWeight: '600' as const },
  labelSmall: { fontSize: 11, fontWeight: '600' as const },
  caption: { fontSize: 11, fontWeight: '400' as const },
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
};
