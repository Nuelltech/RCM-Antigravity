/**
 * Centralized typography scale
 * Use these values for consistent font sizes and weights
 * 
 * Example: style={[typography.h1, { color: theme.colors.text }]}
 */

import { TextStyle } from 'react-native';

export const typography = {
    // Headings
    h1: {
        fontSize: 30,
        fontWeight: 'bold' as TextStyle['fontWeight'],
        lineHeight: 36,
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold' as TextStyle['fontWeight'],
        lineHeight: 32,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as TextStyle['fontWeight'],
        lineHeight: 28,
    },
    h4: {
        fontSize: 18,
        fontWeight: '600' as TextStyle['fontWeight'],
        lineHeight: 24,
    },

    // Body text
    body: {
        fontSize: 14,
        fontWeight: 'normal' as TextStyle['fontWeight'],
        lineHeight: 20,
    },
    bodyLarge: {
        fontSize: 16,
        fontWeight: 'normal' as TextStyle['fontWeight'],
        lineHeight: 24,
    },
    bodySmall: {
        fontSize: 12,
        fontWeight: 'normal' as TextStyle['fontWeight'],
        lineHeight: 16,
    },

    // Captions and labels
    caption: {
        fontSize: 12,
        fontWeight: 'normal' as TextStyle['fontWeight'],
        lineHeight: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '600' as TextStyle['fontWeight'],
        lineHeight: 16,
        textTransform: 'uppercase' as TextStyle['textTransform'],
    },

    // Buttons
    button: {
        fontSize: 14,
        fontWeight: '600' as TextStyle['fontWeight'],
        lineHeight: 20,
    },
} as const;

export type Typography = typeof typography;
