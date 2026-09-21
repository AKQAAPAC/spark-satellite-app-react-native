/**
 * Tokens from Spark Generative Commerce design system
 * (Figma BAEZNkIwx845LdB2Msfhat — Primitives / Color / Spacing / Radius / Typography).
 */

export type SparkAppearance = 'light' | 'dark';

export const SPARK_APPEARANCE_STORAGE_KEY = 'sparkColorScheme';

export interface SparkColors {
  bgCanvas: string;
  bgBrand: string;
  bgPlan: string;
  bgPrimarySubtle: string;
  textInverse: string;
  textOnDark: string;
  ctaCyan: string;
  ctaSubmit: string;
  selectedFill: string;
}

export const SparkColorsLight: SparkColors = {
  bgCanvas: '#FFFFFF',
  bgBrand: '#400E7D',
  bgPlan: '#EEEDF0',
  bgPrimarySubtle: '#E6DDFD',
  textInverse: '#24242E',
  textOnDark: '#400E7D',
  ctaCyan: '#2DF4E4',
  ctaSubmit: '#8950DA',
  selectedFill: 'rgba(45, 244, 228, 0.28)',
};

export const SparkColorsDark: SparkColors = {
  bgCanvas: '#1A0831',
  bgBrand: '#400E7D',
  bgPlan: '#350570',
  bgPrimarySubtle: '#E6DDFD',
  textInverse: '#FFFFFF',
  textOnDark: '#E6DDFD',
  ctaCyan: '#2DF4E4',
  ctaSubmit: '#8950DA',
  selectedFill: 'rgba(45, 244, 228, 0.28)',
};

export function sparkColorsForAppearance(appearance: SparkAppearance): SparkColors {
  return appearance === 'light' ? SparkColorsLight : SparkColorsDark;
}

export const SparkTheme = {
  Spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    card: 18,
  },
  Radius: {
    sm: 16,
    card: 21,
    md: 24,
    full: 999,
  },
  Typography: {
    display: { fontSize: 32, fontWeight: '600' as const },
    productName: { fontSize: 16, fontWeight: '600' as const },
    planLabel: { fontSize: 14, fontWeight: '600' as const },
    body: { fontSize: 14, fontWeight: '500' as const },
    sectionDesc: { fontSize: 13, fontWeight: '500' as const },
    caption: { fontSize: 12, fontWeight: '500' as const },
    micro: { fontSize: 10, fontWeight: '700' as const },
  },
};

export function planCardStyle(colors: SparkColors) {
  return {
    padding: SparkTheme.Spacing.card,
    backgroundColor: colors.bgPlan,
    borderRadius: SparkTheme.Radius.md,
  };
}
