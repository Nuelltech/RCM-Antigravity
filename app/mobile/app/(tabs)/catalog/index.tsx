import { View, ScrollView, FlatList, StyleSheet, Platform } from 'react-native';
import { Text, Card, Chip, Searchbar, ActivityIndicator, IconButton, FAB, Button } from 'react-native-paper';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import api, { fetchRecipes, fetchCombos, fetchMenu, fetchMenuStats } from '../../../lib/api';
import { theme } from '../../../ui/theme';
import { spacing } from '../../../ui/spacing';
import { typography } from '../../../ui/typography';

// Types
interface Product {
    id: number;
    nome: string;
    unidade_medida: string;
    subfamilia?: { nome: string; familia?: { nome: string } };
    variacoes: { preco_unitario: string | number }[];
}

interface Recipe {
    id: number;
    nome: string;
    custo_por_porcao: number;
    unidade_medida: string;
    categoria?: string;
    tipo: string;
}

interface Combo {
    id: number;
    nome: string;
    custo_total: number;
    tipo: string;
}

interface MenuItem {
    id: number;
    nome_comercial: string;
    pvp: number;
    margem_bruta: number;
    categoria_menu?: string;
    receita?: { nome: string; custo_por_porcao: number };
    combo?: { nome: string; custo_total: number };
    formatoVenda?: {
        produto: {
            nome: string;
            variacoes?: { preco_unitario: number }[]
        };
        custo_unitario?: number;
    };
    cmv_percentual?: number;
}

type TabType = 'products' | 'recipes' | 'combos' | 'menu' | 'alerts';

export default function CatalogScreen() {
    const router = useRouter();
    const params = useGlobalSearchParams();
    const [viewMode, setViewMode] = useState<'hub' | 'list'>('hub');
    const [activeTab, setActiveTab] = useState<TabType>('products');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
    const [menuStats, setMenuStats] = useState<any[]>([]);

    // Sync state with params
    useEffect(() => {
        if (params.view === 'list') {
            setViewMode('list');
        } else if (params.view === 'hub') {
            setViewMode('hub');
        }
    }, [params.view]);

    const openCategory = (tab: TabType) => {
        if (tab === 'alerts') {
            router.push('/catalog/alerts');
            return;
        }
        setActiveTab(tab);
        setViewMode('list');
        router.setParams({ view: 'list' });
    };

    const navToDetail = (item: any) => {
        if (activeTab === 'recipes') {
            router.push(`/catalog/details/recipe/${item.id}`);
        } else if (activeTab === 'combos') {
            router.push(`/catalog/details/combo/${item.id}`);
        } else if (activeTab === 'menu') {
            router.push(`/catalog/details/menu/${item.id}`);
        }
    };

    const goBack = () => {
        setViewMode('hub');
        setSearch('');
        setData([]);
        router.setParams({ view: 'hub' });
    };

    const fetchData = async (overrideSearch = search) => {
        if (viewMode === 'hub') return;

        setLoading(true);
        try {
            let response;
            const params = { search: overrideSearch, limit: 50 };

            switch (activeTab) {
                case 'products':
                    response = await api.get('/api/products', { params });
                    setData(response.data.data || []);
                    break;
                case 'recipes':
                    response = await fetchRecipes(params);
                    setData(response.data.data || []);
                    break;
                case 'combos':
                    response = await fetchCombos({ ...params, onlyActive: 'true' });
                    setData(Array.isArray(response.data) ? response.data : []);
                    break;
                case 'menu':
                    response = await fetchMenu({
                        ...params,
                        categoria: overrideSearch || undefined,
                        status: statusFilter
                    });
                    setData(Array.isArray(response.data) ? response.data : []);
                    break;
            }
        } catch (error) {
            console.error(`Failed to fetch ${activeTab}: `, error);
            setData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadMenuStats = async () => {
        try {
            const response = await fetchMenuStats();
            setMenuStats(response.data);
        } catch (error) {
            console.error('Failed to load menu stats:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'menu' && viewMode === 'list') {
            loadMenuStats();
        }
    }, [activeTab, viewMode]);

    useEffect(() => {
        if (viewMode === 'list') {
            const timer = setTimeout(() => {
                fetchData(search);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [search, activeTab, viewMode, statusFilter]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(search);
    }, [search, activeTab, viewMode, statusFilter]);

    const formatCurrency = (value: string | number) => {
        const num = Number(value);
        if (isNaN(num)) return '€0.00';
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
    };

    const getCategoryIcon = (tab: TabType) => {
        switch (tab) {
            case 'products': return 'package-variant';
            case 'recipes': return 'chef-hat';
            case 'combos': return 'layers';
            case 'menu': return 'silverware-fork-knife';
            case 'alerts': return 'bell-ring';
            default: return 'package-variant';
        }
    };

    const getCategoryColor = (tab: TabType) => {
        switch (tab) {
            case 'products': return theme.colors.primary;
            case 'recipes': return theme.colors.success;
            case 'combos': return '#a855f7';
            case 'menu': return theme.colors.info;
            case 'alerts': return theme.colors.error;
            default: return theme.colors.primary;
        }
    };

    const getTabTitle = () => {
        switch (activeTab) {
            case 'products': return 'Produtos';
            case 'recipes': return 'Receitas';
            case 'combos': return 'Combos';
            case 'menu': return 'Menu';
            default: return 'Catálogo';
        }
    };

    // Hub view
    if (viewMode === 'hub') {
        const categories = [
            { title: 'Produtos', tab: 'products' as TabType },
            { title: 'Receitas', tab: 'recipes' as TabType },
            { title: 'Combos', tab: 'combos' as TabType },
            { title: 'Menu', tab: 'menu' as TabType },
            { title: 'Alertas', tab: 'alerts' as TabType },
        ];

        return (
            <View style={styles.container}>
                <Text style={styles.hubTitle}>Catálogo</Text>

                <View style={styles.hubGrid}>
                    {categories.map((cat) => (
                        <Card
                            key={cat.tab}
                            style={[styles.categoryCard, { backgroundColor: getCategoryColor(cat.tab) }]}
                            onPress={() => openCategory(cat.tab)}
                        >
                            <Card.Content style={styles.categoryContent}>
                                <IconButton
                                    icon={getCategoryIcon(cat.tab)}
                                    iconColor="white"
                                    size={40}
                                />
                                <Text style={styles.categoryTitle}>{cat.title}</Text>
                            </Card.Content>
                        </Card>
                    ))}
                </View>


                {/* TEMPORARY: Debug Button */}
                <Button
                    mode="contained"
                    onPress={() => router.push('/financial/invoices')}
                    style={{ marginTop: 20, backgroundColor: theme.colors.warning }}
                >
                    [DEBUG] Ver Lista Cartões (Invoices)
                </Button>
            </View >
        );
    }

    // List view
    const renderItem = ({ item }: { item: any }) => {
        if (activeTab === 'products') {
            const currentPrice = item.variacoes?.[0]?.preco_unitario || 0;
            const unit = item.unidade_medida || 'un';

            return (
                <Card style={styles.itemCard} onPress={() => router.push(`/catalog/details/product/${item.id}`)}>
                    <Card.Content>
                        <View style={styles.itemHeader}>
                            <Text style={styles.itemName}>{item.nome}</Text>
                            {item.subfamilia?.familia?.nome && (
                                <Chip>{item.subfamilia.familia.nome}</Chip>
                            )}
                        </View>
                        <Text style={styles.itemSubtitle}>
                            {item.subfamilia?.nome || 'Sem categoria'} • {unit}
                        </Text>
                        <Text style={styles.itemPrice}>
                            {formatCurrency(currentPrice)}
                            <Text style={styles.itemPriceUnit}>/{unit.toLowerCase()}</Text>
                        </Text>
                    </Card.Content>
                </Card>
            );
        }

        if (activeTab === 'recipes') {
            return (
                <Card style={styles.itemCard} onPress={() => navToDetail(item)}>
                    <Card.Content>
                        <View style={styles.itemHeader}>
                            <Text style={styles.itemName}>{item.nome}</Text>
                            <Chip>{item.tipo}</Chip>
                        </View>
                        <Text style={styles.itemSubtitle}>
                            {item.categoria || 'Sem categoria'} • {item.unidade_medida || 'un'}
                        </Text>
                        <Text style={[styles.itemPrice, { color: theme.colors.success }]}>
                            {formatCurrency(item.custo_por_porcao)}
                            <Text style={styles.itemPriceUnit}>/porção</Text>
                        </Text>
                    </Card.Content>
                </Card>
            );
        }

        if (activeTab === 'combos') {
            return (
                <Card style={styles.itemCard} onPress={() => navToDetail(item)}>
                    <Card.Content>
                        <View style={styles.itemHeader}>
                            <Text style={styles.itemName}>{item.nome}</Text>
                            <Chip>{item.tipo}</Chip>
                        </View>
                        <Text style={[styles.itemPrice, { color: theme.colors.success }]}>
                            {formatCurrency(item.custo_total)}
                            <Text style={styles.itemPriceUnit}> custo</Text>
                        </Text>
                    </Card.Content>
                </Card>
            );
        }

        // Menu
        const cmv = item.cmv_percentual || 0;
        const cmvColor = cmv <= 25 ? theme.colors.success : cmv <= 35 ? theme.colors.warning : theme.colors.error;

        return (
            <Card style={styles.itemCard} onPress={() => navToDetail(item)}>
                <Card.Content>
                    <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{item.nome_comercial}</Text>
                    </View>
                    <Text style={styles.itemSubtitle}>
                        {item.receita?.nome || item.combo?.nome || item.formatoVenda?.produto?.nome}
                    </Text>
                    <View style={styles.menuMetrics}>
                        <Text style={styles.menuPrice}>{formatCurrency(item.pvp)}</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {!item.ativo && (
                                <Chip style={{ backgroundColor: theme.colors.error + '30' }} textStyle={{ color: theme.colors.error, fontSize: 10, lineHeight: 10, marginVertical: 0, paddingVertical: 0 }} compact>
                                    Inativo
                                </Chip>
                            )}
                            <Chip style={{ backgroundColor: cmvColor + '30' }} textStyle={{ color: cmvColor }}>
                                CMV: {cmv.toFixed(1)}%
                            </Chip>
                        </View>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.listHeader}>
                <View style={styles.topBar}>
                    <IconButton
                        icon="arrow-left"
                        iconColor="white"
                        onPress={goBack}
                    />
                    <Text style={styles.listTitle}>{getTabTitle()}</Text>
                </View>

                {activeTab === 'menu' && viewMode === 'list' && menuStats.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
                        {menuStats.map((stat) => (
                            <Card key={stat.category} style={styles.statsCard}>
                                <Card.Content style={styles.statsContent}>
                                    <Text style={styles.statsLabel}>{stat.category}</Text>
                                    <View style={styles.statsRow}>
                                        <Text style={styles.statsValue}>{stat.cmv.toFixed(1)}%</Text>
                                        <Text style={styles.statsSubtext}>CMV</Text>
                                    </View>
                                    <Chip compact style={styles.statsChip} textStyle={styles.statsChipLabel}>{stat.count} itens</Chip>
                                </Card.Content>
                            </Card>
                        ))}
                    </ScrollView>
                )}

                <Searchbar
                    placeholder="Pesquisar..."
                    onChangeText={setSearch}
                    value={search}
                    style={styles.searchbar}
                />
            </View>

            {activeTab === 'menu' && viewMode === 'list' && (
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                        <Chip
                            selected={statusFilter === 'active'}
                            onPress={() => setStatusFilter('active')}
                            style={styles.filterChip}
                            showSelectedOverlay
                        >
                            Ativos
                        </Chip>
                        <Chip
                            selected={statusFilter === 'inactive'}
                            onPress={() => setStatusFilter('inactive')}
                            style={styles.filterChip}
                            showSelectedOverlay
                        >
                            Inativos
                        </Chip>
                        <Chip
                            selected={statusFilter === 'all'}
                            onPress={() => setStatusFilter('all')}
                            style={styles.filterChip}
                            showSelectedOverlay
                        >
                            Todos
                        </Chip>
                    </ScrollView>
                </View>
            )}

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Nenhum item encontrado.</Text>
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
        paddingTop: 64,
        paddingHorizontal: spacing.lg,
    },
    hubTitle: {
        ...typography.h1,
        color: theme.colors.textInverse,
        marginBottom: spacing.xl,
    },
    hubGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    categoryCard: {
        width: '48%',
        marginBottom: spacing.lg,
        aspectRatio: 1,
    },
    categoryContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryTitle: {
        color: theme.colors.textInverse,
        fontWeight: 'bold',
        fontSize: 18,
        marginTop: spacing.sm,
    },
    listHeader: {
        marginBottom: spacing.lg,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    listTitle: {
        ...typography.h1,
        color: theme.colors.textInverse,
    },
    searchbar: {
        backgroundColor: theme.colors.surfaceDark,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 100,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: spacing.xxl,
    },
    emptyText: {
        color: theme.colors.textSecondary,
    },
    itemCard: {
        marginBottom: spacing.md,
        backgroundColor: theme.colors.surfaceDark,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    itemName: {
        ...typography.h4,
        color: theme.colors.textInverse,
        flex: 1,
        marginRight: spacing.sm,
    },
    itemSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginBottom: spacing.sm,
    },
    itemPrice: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 18,
    },
    itemPriceUnit: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: 'normal',
    },
    menuMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    menuPrice: {
        color: theme.colors.textInverse,
        fontWeight: 'bold',
        fontSize: 20,
    },
    filterContainer: {
        marginBottom: spacing.md,
    },
    filterContent: {
        flexDirection: 'row',
        paddingHorizontal: 4, // Add a little padding for the first/last chips
    },
    filterChip: {
        marginRight: spacing.sm,
        backgroundColor: theme.colors.surfaceDark,
    },
    statsContainer: {
        marginBottom: spacing.md,
    },
    statsCard: {
        width: 140,
        marginRight: spacing.md,
        backgroundColor: theme.colors.surface,
    },
    statsContent: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    statsLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 4,
        gap: 4
    },
    statsValue: {
        ...typography.h3,
        color: theme.colors.primary,
        fontSize: 24,
    },
    statsSubtext: {
        color: theme.colors.textSecondary,
        fontSize: 10,
    },
    statsChip: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        height: 24,
    },
    statsChipLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
});
