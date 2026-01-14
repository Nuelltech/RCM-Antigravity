import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, Searchbar, ActivityIndicator, IconButton } from 'react-native-paper';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import api from '../../../lib/api';
import { theme } from '../../../ui/theme';
import { spacing } from '../../../ui/spacing';
import { typography } from '../../../ui/typography';
import { getAlertParams, getSeverityColor } from '../../../lib';

export default function AlertsScreen() {
    const router = useRouter();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'high' | 'warning' | 'info'>('all');

    const fetchAlerts = async () => {
        try {
            // Fetch more alerts for the full list
            const data = await ApiService.getActiveAlerts(100);

            // Sort by severity (High > Warning > Info)
            const severityWeight = { high: 3, warning: 2, info: 1 } as any;
            const sorted = (data || []).sort((a: any, b: any) => {
                const wA = severityWeight[a.severity] || 0;
                const wB = severityWeight[b.severity] || 0;
                return wB - wA;
            });

            setAlerts(sorted);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAlerts();
    }, []);

    const filteredAlerts = alerts.filter(alert => {
        const matchesSearch =
            (alert.item || '').toLowerCase().includes(search.toLowerCase()) ||
            (alert.message || '').toLowerCase().includes(search.toLowerCase());

        if (filter === 'all') return matchesSearch;
        return matchesSearch && alert.severity === filter;
    });

    const renderItem = ({ item }: { item: any }) => {
        const { label } = getAlertParams(item.type);
        const severityColor = getSeverityColor(item.severity);

        return (
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.cardHeader}>
                        <View style={[styles.badge, { backgroundColor: severityColor }]}>
                            <Text style={styles.badgeText}>{label}</Text>
                        </View>
                        <Text style={styles.date}>
                            {new Date(item.date).toLocaleDateString('pt-PT')}
                        </Text>
                    </View>

                    <Text style={styles.itemName}>{item.item}</Text>
                    <Text style={styles.message}>{item.message}</Text>

                    {/* Future actions: Snooze/Archive */}
                </Card.Content>
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.topBar}>
                    <IconButton
                        icon="arrow-left"
                        iconColor="white"
                        onPress={() => router.back()}
                    />
                    <Text style={styles.title}>Alertas</Text>
                </View>

                <Searchbar
                    placeholder="Pesquisar alertas..."
                    onChangeText={setSearch}
                    value={search}
                    style={styles.searchbar}
                    inputStyle={{ color: theme.colors.text }}
                    iconColor={theme.colors.textSecondary}
                    placeholderTextColor={theme.colors.textSecondary}
                />

                <View style={styles.filters}>
                    <Chip
                        selected={filter === 'all'}
                        onPress={() => setFilter('all')}
                        style={styles.chip}
                        showSelectedCheck={false}
                    >
                        Todos
                    </Chip>
                    <Chip
                        selected={filter === 'high'}
                        onPress={() => setFilter('high')}
                        style={styles.chip}
                        showSelectedCheck={false}
                        textStyle={{ color: filter === 'high' ? 'white' : theme.colors.error }}
                    >
                        Críticos
                    </Chip>
                    <Chip
                        selected={filter === 'warning'}
                        onPress={() => setFilter('warning')}
                        style={styles.chip}
                        showSelectedCheck={false}
                        textStyle={{ color: filter === 'warning' ? 'white' : theme.colors.warning }}
                    >
                        Avisos
                    </Chip>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredAlerts}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>Sem alertas encontrados</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundDark,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: theme.colors.surfaceDark,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h2,
        color: theme.colors.textInverse,
        marginLeft: spacing.xs,
    },
    searchbar: {
        backgroundColor: theme.colors.backgroundDark,
        marginBottom: spacing.md,
    },
    filters: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    chip: {
        backgroundColor: theme.colors.backgroundDark,
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: theme.colors.surfaceDark,
        marginBottom: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.border, // Default, overridden by severity if needed or just use bg
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    date: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    itemName: {
        ...typography.h4,
        color: theme.colors.textInverse,
        marginBottom: 4,
    },
    message: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 16,
    }
});
