import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { ArrowLeft, Layers, DollarSign } from 'lucide-react-native';

export default function ComboDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [combo, setCombo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadCombo(Number(id));
        }
    }, [id]);

    const loadCombo = async (comboId: number) => {
        try {
            const response = await api.get(`/api/combos/${comboId}`);
            setCombo(response.data);
        } catch (error) {
            console.error('Failed to load combo:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    if (loading) {
        return (
            <View className="flex-1 bg-slate-900 justify-center items-center">
                <ActivityIndicator size="large" color="#f97316" />
            </View>
        );
    }

    if (!combo) {
        return (
            <View className="flex-1 bg-slate-900 justify-center items-center">
                <Text className="text-white">Combo não encontrado.</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-orange-500">Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-slate-900">
            <View className="relative h-64 bg-slate-800">
                <View className="w-full h-full items-center justify-center bg-purple-900/20">
                    <Layers size={64} color="#a855f7" />
                </View>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-12 left-4 bg-black/50 p-2 rounded-full"
                >
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
            </View>

            <View className="p-6">
                <Text className="text-white text-3xl font-bold mb-2">{combo.nome}</Text>
                <Text className="text-slate-400 text-sm mb-6">{combo.descricao || 'Sem descrição.'}</Text>

                <View className="bg-slate-800 p-4 rounded-xl mb-8 flex-row justify-between items-center">
                    <Text className="text-slate-400 text-base">Custo Total</Text>
                    <Text className="text-emerald-400 font-bold text-2xl">{formatCurrency(combo.custo_total)}</Text>
                </View>

                <Text className="text-white text-xl font-bold mb-4">Itens do Combo</Text>
                <View className="bg-slate-800 rounded-xl overflow-hidden mb-8">
                    {combo.itens?.map((item: any, index: number) => (
                        <View key={index} className={`p-4 flex-row justify-between items-center ${index !== combo.itens.length - 1 ? 'border-b border-slate-700' : ''}`}>
                            <View className="flex-1">
                                <Text className="text-white font-semibold">
                                    {item.produto?.nome || item.receita?.nome || item.menuItem?.nome_comercial}
                                </Text>
                                <Text className="text-slate-400 text-xs">
                                    Qtd: {item.quantidade}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}
