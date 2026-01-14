/**
 * DashboardKPICard Component
 * Reusable KPI card for dashboard metrics
 * 
 * Usage:
 *   <DashboardKPICard
 *     label="VENDAS"
 *     value={formatCurrency(stats.vendasMes)}
 *     hint="No período"
 *     alert={false}
 *   />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { theme } from '../../ui/theme';
import { spacing } from '../../ui/spacing';

interface DashboardKPICardProps {
    label: string;
    value: string;
    hint?: string;
    alert?: boolean;
    variant?: 'large' | 'small';
}

export const DashboardKPICard: React.FC<DashboardKPICardProps> = ({
    label,
    value,
    hint,
    alert = false,
    variant = 'large',
}) => {
    const isSmall = variant === 'small';

    return (
        <Card style={[styles.card, isSmall && styles.cardSmall]}>
            <Card.Content>
                <Text style={[styles.label, isSmall && styles.labelSmall]}>
                    {label}
                </Text>
                <Text style={[
                    styles.value,
                    isSmall && styles.valueSmall,
                    alert && styles.valueAlert,
                ]}>
                    {value}
                </Text>
                {hint && (
                    <Text style={[styles.hint, isSmall && styles.hintSmall]}>
                        {hint}
                    </Text>
                )}
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    cardSmall: {
        flex: 1,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    labelSmall: {
        fontSize: 10,
    },
    value: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
    },
    valueSmall: {
        fontSize: 16,
    },
    valueAlert: {
        color: theme.colors.error,
    },
    hint: {
        color: theme.colors.textLight,
        fontSize: 10,
    },
    hintSmall: {
        fontSize: 9,
    },
});
