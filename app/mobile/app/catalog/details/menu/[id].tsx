import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { ArrowLeft, UtensilsCrossed } from 'lucide-react-native';

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
                <ActivityIndicator size="large" color="#f97316" />
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
        <ScrollView className="flex-1 bg-slate-900">
            <View className="relative h-64 bg-slate-800">
                <View className="w-full h-full items-center justify-center bg-blue-900/20">
                    <UtensilsCrossed size={64} color="#3b82f6" />
                </View>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-12 left-4 bg-black/50 p-2 rounded-full"
                >
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
            </View>

            <View className="p-6">
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-white text-3xl font-bold flex-1 mr-4">{item.nome_comercial}</Text>
                    <View className="bg-blue-500 px-3 py-1 rounded-full">
                        <Text className="text-white font-bold text-xs uppercase">{item.categoria_menu || 'Geral'}</Text>
                    </View>
                </View>

                {/* Financials Card */}
                <View className="bg-slate-800 p-6 rounded-2xl mb-8">
                    <View className="flex-row justify-between items-end mb-4 border-b border-slate-700 pb-4">
                        <Text className="text-slate-400">Preço de Venda (PVP)</Text>
                        <Text className="text-white font-bold text-3xl">{formatCurrency(item.pvp)}</Text>
                    </View>

                    <View className="flex-row gap-4">
                        <View className="flex-1">
                            <Text className="text-slate-400 text-xs mb-1">Custo</Text>
                            <Text className="text-white font-bold text-lg">{formatCurrency(cost)}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-slate-400 text-xs mb-1">CMV (%)</Text>
                            <Text className={`font-bold text-lg ${cmv <= 30 ? 'text-green-500' : 'text-red-500'}`}>
                                {cmv.toFixed(1)}%
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-slate-400 text-xs mb-1">Margem Grossa</Text>
                            <Text className="text-emerald-400 font-bold text-lg">{formatCurrency(item.margem_bruta)}</Text>
                        </View>
                    </View>
                </View>

                <Text className="text-white text-xl font-bold mb-4">Item Base</Text>
                <View className="bg-slate-800 p-4 rounded-xl">
                    <Text className="text-white font-semibold text-lg">
                        {item.receita?.nome || item.combo?.nome || item.formatoVenda?.produto?.nome}
                    </Text>
                    <Text className="text-slate-400 text-sm mt-1">
                        {item.receita ? 'Receita' : item.combo ? 'Combo' : 'Produto'}
                    </Text>
                </View>

            </View>
        </ScrollView>
    );
}
