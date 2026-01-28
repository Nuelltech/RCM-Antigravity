import { View, ScrollView, StyleSheet, TouchableOpacity, Image, Platform, RefreshControl } from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../lib/auth';
import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../../services';
import { DashboardKPICard, DashboardChart } from '../../components/dashboard';
import { Button } from '../../components/base';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../ui/theme';
import { spacing } from '../../ui/spacing';
import { getAlertParams, getSeverityColor } from '../../lib';
import { typography } from '../../ui/typography';

interface DashboardStats {
    vendasMes: number;
    custoMercadoria: number;
    cmvTeorico: number;
    comprasMes: number;
    custoEstrutura: {
        valor: number;
        periodo: string;
    };
    taxaOcupacao: number;
    lucroBruto: number;
    alertsCount: number;
    topItems: {
        id: number;
        name: string;
        category: string;
        quantity: number;
        revenue: number;
        image: string;
    }[];
}

interface SalesChartData {
    date: string;
    vendas: number;
    custos: number;
}

export default function DashboardScreen() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [salesChartData, setSalesChartData] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Date range state
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'from' | 'to'>('from');

    // Initialize with last 30 days
    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        setDateRange({
            from: start.toISOString().split('T')[0],
            to: end.toISOString().split('T')[0]
        });
    }, []);

    const fetchStats = async () => {
        if (!dateRange.from || !dateRange.to) return;

        try {
            const data = await ApiService.getDashboardStats(dateRange.from, dateRange.to);
            setStats(data);

            // Load chart data
            const chartData = await ApiService.getSalesChart(dateRange.from, dateRange.to);
            setSalesChartData(chartData || []);

            // Load active alerts (showing all for now to demonstrate hierarchy, sorted by severity)
            const alertsData = await ApiService.getActiveAlerts(10);

            // Sort: High > Warning > Info
            const severityWeight = { high: 3, warning: 2, info: 1 } as any;
            const sortedAlerts = (alertsData || []).sort((a: any, b: any) => {
                const wA = severityWeight[a.severity] || 0;
                const wB = severityWeight[b.severity] || 0;
                return wB - wA; // Descending weight
            });

            // For mobile, maybe we still only want High? Or all? User asked for hierarchy.
            // Let's show all but prioritized.
            // const highSeverityAlerts = (alertsData || []).filter((alert: any) => alert.severity === 'high');
            setAlerts(sortedAlerts);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Reload when date range changes
    useEffect(() => {
        if (dateRange.from && dateRange.to) {
            setLoading(true);
            fetchStats();
        }
    }, [dateRange]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStats();
    }, [dateRange]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short'
        });
    };

    const handlePresetSelect = (days: number | 'current-month') => {
        const end = new Date();
        let start = new Date();

        if (days === 'current-month') {
            start = new Date(end.getFullYear(), end.getMonth(), 1);
        } else {
            start.setDate(start.getDate() - days);
        }

        setDateRange({
            from: start.toISOString().split('T')[0],
            to: end.toISOString().split('T')[0]
        });
    };

    const openDatePicker = (mode: 'from' | 'to') => {
        setDatePickerMode(mode);
        setShowDatePicker(true);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');

        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            setDateRange(prev => ({
                ...prev,
                [datePickerMode]: dateStr
            }));
        }
    };

    if (loading && !stats) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>A carregar dashboard...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }

        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Dashboard</Text>
                <Text style={styles.subtitle}>{user?.tenantName || 'Restaurante'}</Text>
                <Text style={styles.userInfo}>👤 {user?.name || 'Gestor'}</Text>
            </View>

            {/* Date Filter */}
            <Card style={styles.filterCard}>
                <Card.Content>
                    <Text style={styles.filterLabel}>Período</Text>

                    {/* Quick Presets */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
                        <Chip onPress={() => handlePresetSelect(7)} style={styles.chip} textStyle={styles.chipText}>7 dias</Chip>
                        <Chip onPress={() => handlePresetSelect(30)} style={styles.chip} textStyle={styles.chipText}>30 dias</Chip>
                        <Chip onPress={() => handlePresetSelect(90)} style={styles.chip} textStyle={styles.chipText}>90 dias</Chip>
                        <Chip onPress={() => handlePresetSelect('current-month')} style={styles.chip} textStyle={styles.chipText}>Este mês</Chip>
                    </ScrollView>

                    {/* Custom Date Range */}
                    <View style={styles.dateRow}>
                        <Button variant="outlined" onPress={() => openDatePicker('from')} style={styles.dateButton}>
                            {dateRange.from ? formatDate(dateRange.from) : 'De'}
                        </Button>
                        <Button variant="outlined" onPress={() => openDatePicker('to')} style={styles.dateButton}>
                            {dateRange.to ? formatDate(dateRange.to) : 'Até'}
                        </Button>
                    </View>
                </Card.Content>
            </Card>

            {showDatePicker && (
                <DateTimePicker
                    value={new Date(dateRange[datePickerMode])}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {/* KPI Cards - Row 1 */}
            <View style={styles.kpiRow}>
                <DashboardKPICard
                    label="VENDAS"
                    value={stats ? formatCurrency(stats.vendasMes) : '...'}
                    hint="No período"
                />
                <DashboardKPICard
                    label="CMV ATUAL"
                    value={stats ? formatCurrency(stats.custoMercadoria) : '...'}
                    hint="Custo total"
                />
            </View>

            {/* KPI Cards - Row 2 */}
            <View style={styles.kpiRow}>
                <DashboardKPICard
                    label="CMV %"
                    value={stats && stats.cmvTeorico != null ? `${stats.cmvTeorico.toFixed(1)}%` : '...'}
                    hint="da receita"
                    alert={stats ? stats.cmvTeorico > 35 : false}
                />
                <DashboardKPICard
                    label="COMPRAS"
                    value={stats ? formatCurrency(stats.comprasMes) : '...'}
                    hint="Aprovadas"
                />
            </View>

            {/* KPI Cards - Row 3 (Small) */}
            <View style={styles.kpiRowSmall}>
                <DashboardKPICard
                    variant="small"
                    label="CUSTO EST."
                    value={stats ? formatCurrency(stats.custoEstrutura.valor) : '...'}
                    hint="Proporcional"
                />
                <DashboardKPICard
                    variant="small"
                    label="TAXA OCUP."
                    value={stats && stats.taxaOcupacao != null && !isNaN(stats.taxaOcupacao) ? `${stats.taxaOcupacao.toFixed(1)}%` : '...'}
                    hint="Média diária"
                />
                <DashboardKPICard
                    variant="small"
                    label="LUCRO BRUTO"
                    value={stats && stats.lucroBruto != null && !isNaN(stats.lucroBruto) ? formatCurrency(stats.lucroBruto) : '...'}
                    hint="V - CMV - Est"
                    alert={stats ? stats.lucroBruto < 0 : false}
                />
            </View>

            {/* Sales Chart */}
            <DashboardChart data={salesChartData} dateRange={dateRange} />

            {/* Alerts Widget - Show List (High Severity Only) */}
            {alerts.length > 0 && (
                <Card style={styles.alertsCard}>
                    <Card.Content>
                        <Text style={styles.alertsLabel}>ALERTAS CRÍTICOS</Text>
                        <Text style={styles.alertsCount}>{alerts.length}</Text>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.alertsScroll}
                            contentContainerStyle={{ paddingRight: spacing.md }}
                        >
                            {alerts.map((alert: any, index: number) => {
                                const { label } = getAlertParams(alert.type);
                                const backgroundColor = getSeverityColor(alert.severity);
                                const textColor = '#FFFFFF'; // Ensure readable text on colored bg

                                return (
                                    <View key={alert.id || index} style={[styles.alertItem, { backgroundColor }]}>
                                        <Text style={[styles.alertType, { color: textColor }]}>{label}</Text>
                                        <Text style={[styles.alertItemName, { color: textColor }]} numberOfLines={1}>{alert.item}</Text>
                                        <Text style={[styles.alertMessage, { color: textColor }]} numberOfLines={2}>
                                            {alert.message || 'Sem detalhes'}
                                        </Text>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </Card.Content>
                </Card>
            )}

            {/* Top Sales List */}
            <Card style={styles.topSalesCard}>
                <Card.Title
                    title="Top Vendas"
                    subtitle={`${stats?.topItems?.length || 0} itens`}
                />
                <Card.Content>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {stats?.topItems?.slice(0, 10).map((item, index) => (
                            <Card key={item.id} style={styles.topItemCard}>
                                <Card.Content>
                                    <View style={styles.topItemHeader}>
                                        <Chip style={styles.topItemBadge}>#{index + 1}</Chip>
                                    </View>
                                    {item.image ? (
                                        <Image source={{ uri: item.image }} style={styles.topItemImage} resizeMode="cover" />
                                    ) : (
                                        <Text style={styles.topItemIcon}>🍽️</Text>
                                    )}
                                    <Text numberOfLines={1} style={styles.topItemName}>{item.name}</Text>
                                    <Text style={styles.topItemCategory}>{item.category}</Text>
                                    <View style={styles.topItemFooter}>
                                        <Text style={styles.topItemQty}>Qtd. {item.quantity}</Text>
                                        <Text style={styles.topItemRevenue}>{formatCurrency(item.revenue)}</Text>
                                    </View>
                                </Card.Content>
                            </Card>
                        ))}
                    </ScrollView>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundDark,
    },
    content: {
        padding: spacing.lg,
        paddingTop: 64,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundDark,
    },
    loadingText: {
        marginTop: spacing.md,
        color: theme.colors.textLight,
    },
    header: {
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h1,
        color: theme.colors.textInverse,
    },
    subtitle: {
        color: theme.colors.textLight,
        fontSize: 14,
    },
    userInfo: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: spacing.xs,
    },
    filterCard: {
        marginBottom: spacing.lg,
        backgroundColor: theme.colors.surfaceDark,
    },
    filterLabel: {
        color: theme.colors.textInverse,
        fontSize: 14,
        marginBottom: spacing.sm,
    },
    chipsContainer: {
        marginBottom: spacing.md,
    },
    chip: {
        marginRight: spacing.sm,
    },
    chipText: {
        color: theme.colors.textInverse,
    },
    dateRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    dateButton: {
        flex: 1,
    },
    kpiRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    kpiRowSmall: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    alertsCard: {
        marginBottom: spacing.lg,
    },
    alertsCardDanger: {
        backgroundColor: '#fef2f2',
    },
    alertsCardSuccess: {
        backgroundColor: '#f0fdf4',
    },
    alertsContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    alertsLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: theme.colors.textLight, // Lighter for contrast on dark bg
    },
    alertsCount: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: spacing.xs,
        color: theme.colors.textInverse, // White for max contrast
    },
    alertsHint: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: spacing.md,
    },
    alertsScroll: {
        marginTop: spacing.md,
    },
    alertItem: {
        borderRadius: theme.borderRadius.sm,
        padding: spacing.md,
        marginRight: spacing.md,
        width: 220, // Slightly wider for better text fit
        elevation: 2,
    },
    alertType: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.text,
        textTransform: 'uppercase',
        opacity: 0.8,
        marginBottom: 2,
    },
    alertItemName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    alertMessage: {
        fontSize: 12,
        color: theme.colors.text,
        opacity: 0.9,
    },
    alertsIcon: {
        fontSize: 32,
    },
    topSalesCard: {
        marginBottom: spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    topItemCard: {
        width: 160,
        marginRight: spacing.md,
        backgroundColor: theme.colors.surface,
    },
    topItemHeader: {
        marginBottom: spacing.sm,
    },
    topItemBadge: {
        width: 40,
    },
    topItemIcon: {
        fontSize: 32,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    topItemImage: {
        width: '100%',
        height: 64,
        borderRadius: theme.borderRadius.sm,
        marginBottom: spacing.sm,
    },
    topItemName: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: spacing.xs,
    },
    topItemCategory: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: spacing.sm,
    },
    topItemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topItemQty: {
        fontSize: 10,
        color: theme.colors.textLight,
    },
    topItemRevenue: {
        fontWeight: 'bold',
        fontSize: 12,
        color: theme.colors.primary,
    },
});
