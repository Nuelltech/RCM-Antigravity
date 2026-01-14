/**
 * Centralized spacing scale
 * Use these values for consistent margins, padding, and gaps
 * 
 * Example: style={{ padding: spacing.md, marginBottom: spacing.lg }}
 */

export const spacing = {
    xs: 4,    // 4px - tight spacing
    sm: 8,    // 8px - small spacing
    md: 16,   // 16px - default spacing
    lg: 24,   // 24px - large spacing
    xl: 32,   // 32px - extra large spacing
    xxl: 48,  // 48px - extra extra large spacing
} as const;

export type Spacing = typeof spacing;
