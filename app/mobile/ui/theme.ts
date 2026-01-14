/**
 * Centralized theme configuration
 * Used by React Native Paper and custom components
 * 
 * To change colors/spacing across the entire app, modify this file only.
 */

export const theme = {
    colors: {
        // Brand colors
        primary: '#f97316',      // Orange (brand)
        secondary: '#0f172a',    // Navy (brand)

        // UI colors
        background: '#ffffff',
        backgroundDark: '#0f172a',
        surface: '#f8fafc',
        surfaceDark: '#1e293b',

        // Status colors
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
        info: '#3b82f6',

        // Text colors
        text: '#0f172a',
        textSecondary: '#64748b',
        textLight: '#94a3b8',
        textInverse: '#ffffff',

        // Border and divider colors
        border: '#e2e8f0',
        borderDark: '#334155',
        divider: '#f1f5f9',

        // Overlay
        backdrop: 'rgba(0, 0, 0, 0.5)',
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999,
    },

    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
        },
    },
};

import { MD3DarkTheme } from 'react-native-paper';

/**
 * React Native Paper theme configuration
 * Extends the base theme with Paper-specific properties
 */
export const paperTheme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: theme.colors.primary,
        secondary: theme.colors.secondary,
        error: theme.colors.error,
        background: theme.colors.background,
        surface: theme.colors.surface,
        onSurface: theme.colors.text,
        onBackground: theme.colors.text,
        outline: theme.colors.border,
    },
    roundness: theme.borderRadius.md,
};

export type Theme = typeof theme;
