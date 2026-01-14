import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, IconButton, Avatar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import api from '../../../../../lib/api';
import { theme } from '../../../../../ui/theme';

export default function MenuDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadItem(Number(id));
        }
    }, [id]);

    const loadItem = async (itemId: number) => {
        try {
            const response = await api.get(`/api/menu/${itemId}`);
            setItem(response.data);
        } catch (error) {
            console.error('Failed to load menu item:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const calculateCMV = (menuKey: any) => {
        if (!menuKey) return 0;
        const pvp = Number(menuKey.pvp);
        const cost = getCost(menuKey);
        if (pvp <= 0) return 0;
        return (cost / pvp) * 100;
    }

    const getCost = (menuKey: any) => {
        if (!menuKey) return 0;
        if (menuKey.receita) return Number(menuKey.receita.custo_por_porcao);
        if (menuKey.combo) return Number(menuKey.combo.custo_total);
        if (menuKey.formatoVenda) return Number(menuKey.formatoVenda.custo_unitario);
        return 0;
    }

    if (loading) {
        return (
            <View className="flex-1 bg-slate-900 justify-center items-center">
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!item) {
        return (
            <View className="flex-1 bg-slate-900 justify-center items-center">
                <Text className="text-white">Item não encontrado.</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-orange-500">Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const cmv = calculateCMV(item);
    const cost = getCost(item);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerBackground}>
                    <Avatar.Icon size={80} icon="silverware-fork-knife" style={{ backgroundColor: 'transparent' }} color="#3b82f6" />
                </View>
                <View style={styles.backButton}>
                    <IconButton
                        icon="arrow-left"
                        iconColor="white"
                        size={24}
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/(tabs)/catalog');
                            }
                        }}
                        style={styles.backButtonIcon}
                    />
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{item.nome_comercial}</Text>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.categoria_menu || 'Geral'}</Text>
                    </View>
                </View>

                {/* Financials Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardLabel}>Preço de Venda (PVP)</Text>
                        <Text style={styles.priceValue}>{formatCurrency(item.pvp)}</Text>
                    </View>

                    <View style={styles.cardRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Custo</Text>
                            <Text style={styles.statValue}>{formatCurrency(cost)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>CMV (%)</Text>
                            <Text style={[styles.statValue, cmv <= 30 ? styles.textSuccess : styles.textError]}>
                                {cmv.toFixed(1)}%
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Margem Grossa</Text>
                            <Text style={[styles.statValue, styles.textEmerald]}>{formatCurrency(item.margem_bruta)}</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Item Base</Text>
                <TouchableOpacity
                    onPress={() => {
                        if (item.receita) router.push(`/catalog/details/recipe/${item.receita.id}`);
                        else if (item.combo) router.push(`/catalog/details/combo/${item.combo.id}`);
                        // Products don't have a detail screen yet in the catalog flow exposed here, but we can add if needed
                        // For now, only Recipes and Combos are fully navigable
                    }}
                    disabled={!item.receita && !item.combo}
                >
                    <View style={styles.baseItemCard}>
                        <View style={styles.baseItemHeader}>
                            <Text style={styles.baseItemName}>
                                {item.receita?.nome || item.combo?.nome || item.formatoVenda?.produto?.nome}
                            </Text>
                            {(item.receita || item.combo) && (
                                <IconButton icon="chevron-right" iconColor="#94a3b8" size={24} />
                            )}
                        </View>
                        <Text style={styles.baseItemType}>
                            {item.receita ? 'Receita' : item.combo ? 'Combo' : 'Produto'}
                        </Text>
                    </View>
                </TouchableOpacity>

            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a', // slate-900
    },
    header: {
        position: 'relative',
        height: 256, // h-64
        backgroundColor: '#1e293b', // slate-800
    },
    headerBackground: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(30, 58, 138, 0.2)', // blue-900/20
    },
    backButton: {
        position: 'absolute',
        top: 48, // top-12
        left: 16, // left-4
    },
    backButtonIcon: {
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        padding: 24, // p-6
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    title: {
        color: 'white',
        fontSize: 30, // text-3xl
        fontWeight: 'bold',
        flex: 1,
        marginRight: 16,
    },
    categoryBadge: {
        backgroundColor: '#3b82f6', // blue-500
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    categoryText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12, // text-xs
        textTransform: 'uppercase',
    },
    card: {
        backgroundColor: '#1e293b', // slate-800
        padding: 24,
        borderRadius: 16,
        marginBottom: 32,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155', // slate-700
        paddingBottom: 16,
    },
    cardLabel: {
        color: '#94a3b8', // slate-400
    },
    priceValue: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 30, // text-3xl
    },
    cardRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        color: '#94a3b8', // slate-400
        fontSize: 12, // text-xs
        marginBottom: 4,
    },
    statValue: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18, // text-lg
    },
    textSuccess: {
        color: '#22c55e', // green-500
    },
    textError: {
        color: '#ef4444', // red-500
    },
    textEmerald: {
        color: '#34d399', // emerald-400
    },
    sectionTitle: {
        color: 'white',
        fontSize: 20, // text-xl
        fontWeight: 'bold',
        marginBottom: 16,
    },
    baseItemCard: {
        backgroundColor: '#1e293b', // slate-800
        padding: 16,
        borderRadius: 12,
    },
    baseItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    baseItemName: {
        color: 'white',
        fontWeight: '600',
        fontSize: 18, // text-lg
        flex: 1,
    },
    baseItemType: {
        color: '#94a3b8', // slate-400
        fontSize: 14, // text-sm
        marginTop: 4,
    },
});
