/**
 * HiBank Design Tokens: Premium Minimalist Fintech
 * Reference: mobile/docs/UI/premium_minimalist_fintech/DESIGN.md
 */

export const COLORS = {
  // Canvas & Structure
  canvas: '#F7F8FA',
  background: '#FAFAFA',
  surface: '#F9F9FF',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F0F2F6',
  surfaceContainer: '#E9EDFF',
  surfaceHigh: '#E1E8FF',
  surfaceContainerHigh: '#E1E8FF',
  surfaceHighest: '#D9E2FC',
  surfaceContainerHighest: '#D9E2FC',

  // Outlines & Dividers
  outline: '#75777F',
  outlineVariant: '#E2E6ED',

  // Brand & Action Tiers
  primary: '#001637',
  primaryContainer: '#172B4D', // Midnight Navy for Hero & Cards
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#8093BB',

  // Interactive Accent
  secondary: '#384CD3', // Electric Indigo
  secondaryContainer: '#5366ED',
  secondaryFixed: '#DFE0FF',
  onSecondary: '#FFFFFF',

  // Distinctive Micro-Accent
  tertiaryFixed: '#D7F36A', // Citrus Lime
  tertiaryFixedDim: '#B7D24D',
  onTertiaryFixed: '#181E00', // Dark Navy / Olive text for lime buttons

  // Content Typography
  onSurface: '#172033', // Deep Obsidian
  onSurfaceVariant: '#697386', // Cool Steel

  // Functional Status Tokens
  success: '#176B4A',
  successContainer: '#E5F6EE',
  error: '#A61B1B',
  errorContainer: '#FCE8E8',
  warning: '#8A5B00',
  warningContainer: '#FFF4D6',
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#172B4D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#172B4D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  hero: {
    shadowColor: '#172B4D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  control: 14, // Buttons, inputs, chips
  card: 18,    // Standard surface cards
  hero: 22,    // Hero balance cards
  sheet: 28,   // Bottom sheet top radius
  full: 9999,  // Pill badges
} as const;
