
/**
 * Waseem AutoCare — Shared Design System
 * Sage Grey, Warm Beige & Deep Burgundy
 * Premium Automotive Care Theme
 */

export const colors = {
  // Core Brand Palette
  primary: '#A5A79B',       // Muted Sage Grey
  secondary: '#E8D2B5',     // Warm Cream Beige
  accent: '#590907',        // Deep Burgundy

  // Backgrounds & Surfaces
  background: '#FFFFFF',    // Main page canvas
  surface: '#F5EBDD',       // Soft Cream Cards
  surfaceSecondary: '#DDD9CC',
  surfaceElevated: '#FFFFFF',

  // Typography
  textPrimary: '#242424',   // Charcoal
  textSecondary: '#625F56',
  textOnPrimary: '#242424',
  textOnAccent: '#F5EBDD',
  textOnDark: '#FFFFFF',

  // Borders & Dividers
  border: '#D1C4B0',
  borderStrong: '#A5A79B',

  // Additional Brand Variations
  sageLight: '#C4C5BB',
  sageDark: '#85877C',
  beigeDark: '#D6BFA1',
  burgundyLight: '#85332F',
  burgundyDark: '#3D0605',
  charcoal: '#242424',

  // Status Colors (Keep Independent of Brand)
  status: {
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
    neutral: '#64748B',
  },

  // Booking Status Workflow Colors
  bookingStatus: {
    requested: '#D97706',
    confirmed: '#2563EB',
    inProgress: '#2563EB',
    completed: '#16A34A',
    cancelled: '#DC2626',
  },

  // Mobile Bottom Navigation
  navigation: {
    inactive: '#77766D',
    active: '#590907',
    indicator: '#590907',
    background: '#F5EBDD',
    border: '#D1C4B0',
  },
};

// Premium Gradient Combinations
export const gradients = {
  primary: ['#A5A79B', '#85877C'],
  beige: ['#F5EBDD', '#E8D2B5'],
  premium: ['#590907', '#3D0605'],
  splash: ['#242424', '#3D0605', '#590907'],
  onboarding: ['#A5A79B', '#85877C', '#625F56'],
  burgundy: ['#85332F', '#590907'],
};

export const typography = {
  fontFamily: 'Inter',

  sizes: {
    h1: 30,
    h2: 24,
    h3: 19,
    body: 15,
    caption: 12,
  },

  weights: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },

  lineHeights: {
    h1: 36,
    h2: 30,
    h3: 24,
    body: 22,
    caption: 16,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 8,
  card: 14,
  lg: 16,
  full: 9999,
};

// Shared Component Guidelines
export const components = {
  buttons: {
    primary: {
      backgroundColor: colors.primary,
      textColor: colors.textPrimary,
    },

    cta: {
      backgroundColor: colors.accent,
      textColor: colors.textOnAccent,
    },

    secondary: {
      backgroundColor: colors.surface,
      borderColor: colors.primary,
      borderWidth: 1,
      textColor: colors.textPrimary,
    },

    destructive: {
      backgroundColor: colors.status.error,
      textColor: '#FFFFFF',
    },
  },

  cards: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.card,
  },

  forms: {
    input: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      borderWidth: 1,
      textColor: colors.textPrimary,
      placeholderColor: colors.textSecondary,
    },

    focused: {
      borderColor: colors.accent,
    },

    error: {
      borderColor: colors.status.error,
      textColor: colors.status.error,
    },
  },
};

export function applyTheme() {
  const root = document.documentElement;
  const variables = {
    '--color-primary': colors.primary,
    '--color-secondary': colors.secondary,
    '--color-accent': colors.accent,
    '--color-background': colors.background,
    '--color-surface': colors.surface,
    '--color-surface-secondary': colors.surfaceSecondary,
    '--color-surface-elevated': colors.surfaceElevated,
    '--color-text-primary': colors.textPrimary,
    '--color-text-secondary': colors.textSecondary,
    '--color-text-on-primary': colors.textOnPrimary,
    '--color-text-on-accent': colors.textOnAccent,
    '--color-border': colors.border,
    '--color-border-strong': colors.borderStrong,
    '--color-sage-light': colors.sageLight,
    '--color-sage-dark': colors.sageDark,
    '--color-beige-dark': colors.beigeDark,
    '--color-burgundy-light': colors.burgundyLight,
    '--color-burgundy-dark': colors.burgundyDark,
    '--status-success': colors.status.success,
    '--status-warning': colors.status.warning,
    '--status-error': colors.status.error,
    '--status-info': colors.status.info,
    '--status-neutral': colors.status.neutral,
    '--sidebar-width': '260px',
    '--card-radius': `${borderRadius.card}px`,
  };

  Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));
}

const theme = {
  colors,
  gradients,
  typography,
  spacing,
  borderRadius,
  components,
};

export default theme;
