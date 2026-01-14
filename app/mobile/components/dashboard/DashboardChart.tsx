/**
 * DashboardChart Component
 * SVG chart wrapper for sales vs costs
 */

import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Svg, Path, Line } from 'react-native-svg';
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
        if (data.length === 0 || chartWidth === 0) return '';

        const maxValue = Math.max(
            ...data.map((d) => Math.max(d.vendas, d.custos)),
            100
        );

        const points = data.map((point, index) => {
            // Use dynamic chartWidth instead of fixed 300
            const x = (index / (data.length - 1)) * chartWidth;
            const y = 160 - (point[key] / maxValue) * 160;
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    };

    const calculateTotal = (key: 'vendas' | 'custos') => {
        return data.reduce((sum, item) => sum + item[key], 0);
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
                                    // Show max 6 date labels evenly distributed
                                    const numLabels = Math.min(6, data.length);
                                    const step = Math.floor(data.length / (numLabels - 1));
                                    const indices = Array.from({ length: numLabels }, (_, i) =>
                                        i === numLabels - 1 ? data.length - 1 : i * step
                                    );

                                    return indices.map((dataIndex) => {
                                        const x = (dataIndex / (data.length - 1)) * chartWidth;
                                        const dateLabel = new Date(data[dataIndex].date)
                                            .toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });

                                        return (
                                            <React.Fragment key={dataIndex}>
                                                {/* Vertical line */}
                                                <Line
                                                    x1={x}
                                                    y1="0"
                                                    x2={x}
                                                    y2="160"
                                                    stroke={theme.colors.divider}
                                                    strokeWidth="1"
                                                    strokeDasharray="2,2"
                                                />
                                                {/* Date label */}
                                                <text
                                                    x={x}
                                                    y="175"
                                                    fill={theme.colors.textSecondary}
                                                    fontSize="10"
                                                    textAnchor="middle"
                                                >
                                                    {dateLabel}
                                                </text>
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
