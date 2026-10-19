import { MD3LightTheme } from 'react-native-paper';

/**
 * HiBank "Calm Confidence" Theme Specification
 * Reference: mobile/.agents/ui/calm_confidence/DESIGN.md
 * Warm neutral foundation with mature indigo-violet primary voice.
 */
export const appLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4D39BF',
    onPrimary: '#FFFFFF',
    primaryContainer: '#6654D9',
    onPrimaryContainer: '#ECE7FF',
    secondary: '#5B4DBF',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#EAE7FB',
    onSecondaryContainer: '#2C1390',
    background: '#FAF9F6', // Warm neutral canvas
    surface: '#FFFFFF',     // Elevated selective cards
    surfaceVariant: '#EFEDF3', // Subdued secondary zones
    outline: '#E5E2E9',    // Border subtle
    outlineVariant: '#C9C4D6',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#F7E9E8',
    onErrorContainer: '#93000A',
  },
};

export type AppTheme = typeof appLightTheme;
