// Chawp Delivery Theme Configuration - Dark Blue with Delivery Accents
export const colors = {
  // Background colors - Dark blue theme
  background: "#070B16",
  surface: "#0F1524",
  card: "#161D33",
  cardSecondary: "#1A2238",
  overlay: "rgba(10, 15, 27, 0.6)",

  // Brand colors
  primary: "#2E6BFF",
  primaryDark: "#1F4FCC",
  primaryLight: "#4A80FF",
  primaryMuted: "#1F4FCC",

  secondary: "#001A4D",
  secondaryDark: "#001238",
  secondaryLight: "#002A6B",

  // Delivery-specific accent (earnings, success)
  accent: "#FFB547",
  accentMuted: "#FF9833",
  accentDark: "#E89B2E",

  // Functional colors
  success: "#3DD598",
  successDark: "#2DBE82",
  successLight: "#3DD59820",
  warning: "#FFB547",
  error: "#FF5C5C",
  errorDark: "#E54545",
  info: "#2E6BFF",
  danger: "#FF5C5C",

  // Neutrals
  white: "#FFFFFF",
  black: "#000000",
  gray50: "#F5F7FF",
  gray100: "#E8ECF7",
  gray200: "#D1D8E8",
  gray300: "#B8C2D9",
  gray400: "#9AA3C0",
  gray500: "#6C7796",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",

  // Text colors
  textPrimary: "#F5F7FF",
  textSecondary: "#9AA3C0",
  textMuted: "#6C7796",
  textTertiary: "#6C7796",
  textInverse: "#070B16",
  text: "#F5F7FF",

  // Borders
  border: "#1F2944",
  borderLight: "#2A3550",
  highlight: "#1F2A55",

  // Status colors
  statusPending: "#FFB547",
  statusConfirmed: "#2E6BFF",
  statusPreparing: "#8B5CF6",
  statusReady: "#3DD598",
  statusDelivering: "#06B6D4",
  statusDelivered: "#3DD598",
  statusCancelled: "#FF5C5C",

  // Legacy status colors for backward compatibility
  pending: "#FFB547",
  preparing: "#8B5CF6",
  ready: "#3DD598",
  picked: "#06B6D4",
  delivering: "#3DD598",
  delivered: "#3DD598",
  cancelled: "#FF5C5C",
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

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  display: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 40,
  },
  headline: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  h1: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  caption: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};
