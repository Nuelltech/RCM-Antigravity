/**
 * DashboardChart Component
 * SVG chart wrapper for sales vs costs
 */

import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Svg, Path, Line, Text as SvgText } from 'react-native-svg';
import { theme } from '../../ui/theme';
import { spacing } from '../../ui/spacing';

interface ChartData {
    date: string;
    vendas: number;
    custos: number;
}

interface DashboardChartProps {
    data: ChartData[];
    dateRange: { from: string; to: string };
}

export const DashboardChart: React.FC<DashboardChartProps> = ({
    data,
    dateRange,
}) => {
    // Track chart container width for responsiveness
    const [chartWidth, setChartWidth] = useState(300);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
        });
    };

    const generatePath = (key: 'vendas' | 'custos') => {
        try {
            if (!Array.isArray(data) || data.length < 2 || chartWidth <= 0) return '';

            // Calculate max value safely
            const maxVal = Math.max(
                ...data.map((d) => Math.max(Number(d.vendas) || 0, Number(d.custos) || 0)),
                0
            );
            // Avoid division by zero: if maxVal is 0, render a flat line at 0 (bottom)
            // But we use it as denominator, so set a safe minimum (e.g. 100)
            const safeMax = maxVal === 0 ? 100 : maxVal;

            const points = data.map((point, index) => {
                // Safe division guarded by length < 2 check above
                const rawX = (index / (data.length - 1)) * chartWidth;
                const rawY = 160 - ((Number(point[key]) || 0) / safeMax) * 160;

                // Final safety check for NaN/Infinity
                const x = Number.isFinite(rawX) ? rawX : 0;
                const y = Number.isFinite(rawY) ? rawY : 160; // Default to bottom if invalid

                return `${x},${y}`;
            });

            return `M ${points.join(' L ')}`;
        } catch (e) {
            console.error("Error generating chart path:", e);
            return '';
        }
    };

    const calculateTotal = (key: 'vendas' | 'custos') => {
        if (!Array.isArray(data)) return 0;
        return data.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
    };

    return (
        <Card style={styles.card}>
            <Card.Title
                title="Vendas vs Custos"
                subtitle={
                    dateRange.from && dateRange.to
                        ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
                        : 'Período'
                }
            />
            <Card.Content>
                {data.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Sem dados para o período</Text>
                    </View>
                ) : (
                    <>
                        <View
                            style={styles.chartContainer}
                            onLayout={(event: LayoutChangeEvent) => {
                                const { width } = event.nativeEvent.layout;
                                setChartWidth(width);
                            }}
                        >
                            <Svg height="100%" width="100%" viewBox={`0 0 ${chartWidth} 180`}>
                                {/* Horizontal Grid Lines */}
                                <Line
                                    x1="0"
                                    y1="40"
                                    x2={chartWidth}
                                    y2="40"
                                    stroke={theme.colors.divider}
                                    strokeWidth="1"
                                />
                                <Line
                                    x1="0"
                                    y1="80"
                                    x2={chartWidth}
                                    y2="80"
                                    stroke={theme.colors.divider}
                                    strokeWidth="1"
                                />
                                <Line
                                    x1="0"
                                    y1="120"
                                    x2={chartWidth}
                                    y2="120"
                                    stroke={theme.colors.divider}
                                    strokeWidth="1"
                                />

                                {/* Vertical Grid Lines + Date Labels */}
                                {(() => {
                                    const numLabels = Math.min(6, data.length);
                                    if (numLabels < 2) return null; // Need at least 2 points for a meaningful axis

                                    const lastIndex = data.length - 1;
                                    // Protect against 0 length (though guarded above)
                                    if (lastIndex <= 0) return null;

                                    const step = lastIndex / (numLabels - 1);

                                    // Generate indices safely
                                    const indices = Array.from({ length: numLabels }, (_, i) => Math.round(i * step));

                                    return indices.map((dataIndex) => {
                                        // Ensure index is within bounds
                                        const safeIndex = Math.min(Math.max(0, dataIndex), data.length - 1);
                                        const item = data[safeIndex];
                                        if (!item) return null;

                                        const x = (safeIndex / lastIndex) * chartWidth;

                                        // Safe date parsing
                                        let dateLabel = '';
                                        try {
                                            dateLabel = new Date(item.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
                                        } catch (e) {
                                            dateLabel = item.date;
                                        }

                                        return (
                                            <React.Fragment key={`axis-${safeIndex}`}>
                                                <Line
                                                    x1={x}
                                                    y1="0"
                                                    x2={x}
                                                    y2="160"
                                                    stroke={theme.colors.divider}
                                                    strokeWidth="1"
                                                    strokeDasharray="2,2"
                                                />
                                                <SvgText
                                                    x={x}
                                                    y="175"
                                                    fill={theme.colors.textSecondary}
                                                    fontSize="10"
                                                    textAnchor="middle"
                                                >
                                                    {dateLabel}
                                                </SvgText>
                                            </React.Fragment>
                                        );
                                    });
                                })()}

                                {/* Vendas Line (Blue) */}
                                <Path
                                    d={generatePath('vendas')}
                                    fill="none"
                                    stroke={theme.colors.info}
                                    strokeWidth="2.5"
                                />

                                {/* Custos Line (Red) */}
                                <Path
                                    d={generatePath('custos')}
                                    fill="none"
                                    stroke={theme.colors.error}
                                    strokeWidth="2.5"
                                />
                            </Svg>
                        </View>

                        {/* Legend */}
                        <View style={styles.legend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: theme.colors.info }]} />
                                <Text style={styles.legendText}>Vendas</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
                                <Text style={styles.legendText}>Custos</Text>
                            </View>
                        </View>

                        {/* Totals */}
                        <View style={styles.totals}>
                            <Text style={styles.totalText}>
                                Total Vendas: {formatCurrency(calculateTotal('vendas'))}
                            </Text>
                            <Text style={styles.totalText}>
                                Total Custos: {formatCurrency(calculateTotal('custos'))}
                            </Text>
                        </View>
                    </>
                )}
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        marginBottom: spacing.lg,
    },
    chartContainer: {
        height: 180,
        justifyContent: 'flex-end',
    },
    emptyContainer: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textLight,
    },
    legend: {
        marginTop: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: spacing.sm,
    },
    legendText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    totals: {
        marginTop: spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
});
