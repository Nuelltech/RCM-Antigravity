
import { View, Text, FlatList, TextInput, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useGlobalSearchParams } from 'expo-router'; // ADDED
import { Search, ChefHat, Layers, UtensilsCrossed, Package, ArrowLeft } from 'lucide-react-native';
import api, { fetchRecipes, fetchCombos, fetchMenu } from '../../lib/api';

// ========================
// Types
// ========================
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

type TabType = 'products' | 'recipes' | 'combos' | 'menu';

// ========================
// Components
// ========================
const TabButton = ({ title, active, onPress, icon: Icon }: any) => (
    <TouchableOpacity
        onPress={onPress}
        className={`flex-1 items-center py-3 border-b-2 ${active ? 'border-orange-500' : 'border-transparent'}`}
    >
        <Icon color={active ? '#f97316' : '#94a3b8'} size={20} />
        <Text className={`text-xs mt-1 ${active ? 'text-orange-500 font-bold' : 'text-slate-400'}`}>
            {title}
        </Text>
    </TouchableOpacity>
);

export default function CatalogScreen() {
    const router = useRouter();
    const params = useGlobalSearchParams(); // ADDED
    const [viewMode, setViewMode] = useState<'hub' | 'list'>('hub');

    // Sync state with params when they change (e.g. back navigation)
    useEffect(() => {
        if (params.view === 'list') {
            setViewMode('list');
        } else if (params.view === 'hub') {
            setViewMode('hub');
        }
    }, [params.view]);

    const [activeTab, setActiveTab] = useState<TabType>('products');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const openCategory = (tab: TabType) => {
        setActiveTab(tab);
        setViewMode('list');
        router.setParams({ view: 'list' }); // ADDED
    };

    const navToDetail = (item: any) => {
        if (activeTab === 'recipes') {
            router.push(`/catalog/details/recipe/${item.id}`);
        } else if (activeTab === 'combos') {
            router.push(`/catalog/details/combo/${item.id}`);
        } else if (activeTab === 'menu') {
            router.push(`/catalog/details/menu/${item.id}`);
        }
        // Products detail not requested yet
    };

    const goBack = () => {
        setViewMode('hub');
        setSearch('');
        setData([]);
        router.setParams({ view: 'hub' }); // ADDED
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
                    response = await fetchMenu({ ...params, categoria: overrideSearch || undefined });
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

    useEffect(() => {
        if (viewMode === 'list') {
            const timer = setTimeout(() => {
                fetchData(search);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [search, activeTab, viewMode]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(search);
    }, [search, activeTab, viewMode]);

    const formatCurrency = (value: string | number) => {
        const num = Number(value);
        if (isNaN(num)) return '€0.00';
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
    };

    // ========================
    // Render Items
    // ========================
    const renderProduct = ({ item }: { item: Product }) => {
        const currentPrice = item.variacoes?.[0]?.preco_unitario || 0;
        const unit = item.unidade_medida || 'un';

        return (
            <TouchableOpacity
                className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700 flex-row justify-between items-center"
            // Product detail not requested, but could add here if needed
            >
                <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                        <Text className="text-white font-bold text-lg mr-2">{item.nome}</Text>
                        <View className="bg-slate-700 px-2 py-0.5 rounded">
                            <Text className="text-slate-300 text-[10px] uppercase">
                                {item.subfamilia?.familia?.nome || 'Geral'}
                            </Text>
                        </View>
                    </View>
                    <Text className="text-slate-400 text-sm">
                        {item.subfamilia?.nome || 'Sem categoria'} • {unit}
                    </Text>
                </View>
                <View className="items-end">
                    <Text className="text-orange-500 font-bold text-lg">
                        {formatCurrency(currentPrice)}
                        <Text className="text-slate-500 text-xs font-normal">/{unit.toLowerCase()}</Text>
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderRecipe = ({ item }: { item: Recipe }) => (
        <TouchableOpacity
            onPress={() => navToDetail(item)}
            className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700 flex-row justify-between items-center"
        >
            <View className="flex-1">
                <View className="flex-row items-center mb-1">
                    <Text className="text-white font-bold text-lg mr-2">{item.nome}</Text>
                    <View className="bg-indigo-900 px-2 py-0.5 rounded">
                        <Text className="text-indigo-300 text-[10px] uppercase">{item.tipo}</Text>
                    </View>
                </View>
                <Text className="text-slate-400 text-sm">
                    {item.categoria || 'Sem categoria'} • {item.unidade_medida || 'un'}
                </Text>
            </View>
            <View className="items-end">
                <Text className="text-emerald-400 font-bold text-lg">
                    {formatCurrency(item.custo_por_porcao)}
                    <Text className="text-slate-500 text-xs font-normal">/porção</Text>
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderCombo = ({ item }: { item: Combo }) => (
        <TouchableOpacity
            onPress={() => navToDetail(item)}
            className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700 flex-row justify-between items-center"
        >
            <View className="flex-1">
                <View className="flex-row items-center mb-1">
                    <Text className="text-white font-bold text-lg mr-2">{item.nome}</Text>
                    <View className="bg-purple-900 px-2 py-0.5 rounded">
                        <Text className="text-purple-300 text-[10px] uppercase">{item.tipo}</Text>
                    </View>
                </View>
            </View>
            <View className="items-end">
                <Text className="text-emerald-400 font-bold text-lg">
                    {formatCurrency(item.custo_total)}
                    <Text className="text-slate-500 text-xs font-normal"> costo</Text>
                </Text>
            </View>
        </TouchableOpacity>
    );

    const getCMVColor = (cmv: number) => {
        if (cmv <= 25) return 'text-green-500';
        if (cmv <= 35) return 'text-yellow-500';
        return 'text-red-500';
    };

    const calculateCMV = (item: MenuItem) => {
        let cost = 0;
        if (item.receita) cost = Number(item.receita.custo_por_porcao);
        else if (item.combo) cost = Number(item.combo.custo_total);
        else if (item.formatoVenda) cost = Number(item.formatoVenda.produto.variacoes?.[0]?.preco_unitario || 0); // Estimate cost for product

        // Use backend provided cmv if available, otherwise calculate
        // Ideally backend should provide consistent cost/cmv
        if ((item as any).cmv_percentual !== undefined) return Number((item as any).cmv_percentual);

        const pvp = Number(item.pvp);
        if (pvp <= 0) return 0;
        return (cost / pvp) * 100;
    };

    const renderMenu = ({ item }: { item: MenuItem }) => {
        const cmv = calculateCMV(item);
        const cmvColor = getCMVColor(cmv);

        return (
            <TouchableOpacity
                onPress={() => navToDetail(item)}
                className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700 flex-row justify-between items-center"
            >
                <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                        <Text className="text-white font-bold text-lg mr-2">{item.nome_comercial}</Text>
                    </View>
                    <Text className="text-slate-400 text-sm italic">
                        {item.receita?.nome || item.combo?.nome || item.formatoVenda?.produto?.nome}
                    </Text>
                    <Text className="text-slate-500 text-xs mt-1">
                        {item.categoria_menu || 'Sem categoria'}
                    </Text>
                </View>
                <View className="items-end">
                    <Text className="text-white font-bold text-xl">
                        {formatCurrency(item.pvp)}
                    </Text>
                    <View className="flex-row items-center mt-1">
                        <Text className={`text - xs font - bold mr - 2 ${item.margem_bruta > 0 ? 'text-green-500' : 'text-red-500'} `}>
                            Margem: {formatCurrency(item.margem_bruta)}
                        </Text>
                        <View className={`px - 1.5 py - 0.5 rounded ${cmv <= 25 ? 'bg-green-900/30' : cmv <= 35 ? 'bg-yellow-900/30' : 'bg-red-900/30'} `}>
                            <Text className={`text - [10px] font - bold ${cmvColor} `}>
                                CMV: {cmv.toFixed(1)}%
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const getRenderItem = () => {
        switch (activeTab) {
            case 'products': return renderProduct;
            case 'recipes': return renderRecipe;
            case 'combos': return renderCombo;
            case 'menu': return renderMenu;
            default: return renderProduct;
        }
    };

    // ========================
    // Components
    // ========================
    const CategoryCard = ({ title, icon: Icon, color, onPress }: any) => (
        <TouchableOpacity
            onPress={onPress}
            className="bg-slate-800 p-6 rounded-2xl border border-slate-700 items-center justify-center aspect-square mb-4 w-[48%]"
        >
            <View className={`w - 16 h - 16 rounded - full items - center justify - center mb - 4 ${color} `}>
                <Icon size={32} color="white" />
            </View>
            <Text className="text-white font-bold text-lg">{title}</Text>
        </TouchableOpacity>
    );

    if (viewMode === 'hub') {
        return (
            <View className="flex-1 bg-slate-900 pt-16 px-4">
                <Text className="text-white text-3xl font-bold mb-8">Catálogo</Text>

                <View className="flex-row flex-wrap justify-between">
                    <CategoryCard
                        title="Produtos"
                        icon={Package}
                        color="bg-orange-500"
                        onPress={() => openCategory('products')}
                    />
                    <CategoryCard
                        title="Receitas"
                        icon={ChefHat}
                        color="bg-emerald-500"
                        onPress={() => openCategory('recipes')}
                    />
                    <CategoryCard
                        title="Combos"
                        icon={Layers}
                        color="bg-purple-500"
                        onPress={() => openCategory('combos')}
                    />
                    <CategoryCard
                        title="Menu"
                        icon={UtensilsCrossed}
                        color="bg-blue-500"
                        onPress={() => openCategory('menu')}
                    />
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-900 pt-16 px-4">
            <View className="mb-4">
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity onPress={goBack} className="mr-3 bg-slate-800 p-2 rounded-full border border-slate-700">
                        <ArrowLeft size={20} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-3xl font-bold capitalize">{activeTab === 'menu' ? 'Menu' : activeTab === 'recipes' ? 'Receitas' : activeTab === 'combos' ? 'Combos' : 'Produtos'}</Text>
                </View>

                {/* Search Bar */}
                <View className="bg-slate-800 rounded-xl flex-row items-center px-4 border border-slate-700 h-12 mb-4">
                    <Search color="#94a3b8" size={20} />
                    <TextInput
                        className="flex-1 ml-3 text-white h-full"
                        placeholder={`Pesquisar...`}
                        placeholderTextColor="#94a3b8"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#f97316" />
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={getRenderItem() as any}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View className="items-center mt-10">
                            <Text className="text-slate-500">Nenhum item encontrado.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
