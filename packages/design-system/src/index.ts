/**
 * @thinkora/design-system — Design tokens and shared component primitives.
 *
 * The canonical design tokens live in apps/web/app/globals.css as CSS custom properties.
 * This module re-exports them as TypeScript constants for use in components
 * that need programmatic access (e.g., charts, dynamic styles).
 */

// ─── Color Tokens ───────────────────────────────────────────────────────

export const colors = {
  bgLayout: '#080808',
  bgContainer: '#101010',
  bgElevated: '#181818',
  bgCard: '#141414',
  bgCardHover: '#1a1a1a',
  bgSidebar: '#0c0c0c',

  text: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.36)',
  textQuaternary: 'rgba(255,255,255,0.20)',
  textPlaceholder: 'rgba(255,255,255,0.22)',

  border: 'rgba(255,255,255,0.07)',
  borderCard: 'rgba(255,255,255,0.055)',
  fill: 'rgba(255,255,255,0.09)',
  fillSecondary: 'rgba(255,255,255,0.055)',
  fillTertiary: 'rgba(255,255,255,0.03)',

  primary: '#ec8435',
  primaryBg: 'rgba(236,132,53,0.10)',
  primaryBorder: 'rgba(236,132,53,0.28)',
  primaryGlow: 'rgba(236,132,53,0.15)',

  // Gradient pairs
  gradientPrimary: ['#f59e0b', '#ea580c'] as const,
  gradientUser: ['#f97316', '#ef4444'] as const,
  gradientAssistant: ['#ec8435', '#c2631a'] as const,

  // Status
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

// ─── Radius Tokens ──────────────────────────────────────────────────────

export const radii = {
  sm: '4px',
  default: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  pill: '999px',
} as const;

// ─── Spacing ────────────────────────────────────────────────────────────

export const spacing = {
  sidebarWidth: 280,
  sidebarCollapsedWidth: 60,
  topicPanelWidth: 260,
  chatMaxWidth: 800,
  homeInputMaxWidth: 740,
  headerHeight: 56,
} as const;

// ─── Transitions ────────────────────────────────────────────────────────

export const transitions = {
  easeOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  fast: '0.15s',
  normal: '0.25s',
  slow: '0.35s',
} as const;

// ─── Typography ─────────────────────────────────────────────────────────

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  monoFamily: "'SF Mono', 'Fira Code', monospace",
  sizes: {
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '15px',
    xl: '24px',
    '2xl': '28px',
    '3xl': '36px',
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

// ─── Chart Colors ───────────────────────────────────────────────────────

export const chartColors = [
  '#ec8435', // primary orange
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ec4899', // pink
] as const;

// ─── Status Config ──────────────────────────────────────────────────────

export const statusConfig = {
  healthy: { color: '#22c55e', label: 'Healthy' },
  degraded: { color: '#f59e0b', label: 'Degraded' },
  error: { color: '#ef4444', label: 'Error' },
  unknown: { color: 'rgba(255,255,255,0.2)', label: 'Unknown' },
  connected: { color: '#22c55e', label: 'Connected' },
  disconnected: { color: 'rgba(255,255,255,0.2)', label: 'Disconnected' },
} as const;
