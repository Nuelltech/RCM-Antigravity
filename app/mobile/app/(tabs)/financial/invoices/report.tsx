import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../../../../lib/api';
import { theme } from '../../../../ui/theme';

interface LogItem {
    id: number;
    entity_type: string;
    entity_id: number;
    entity_name: string;
    field_changed: string;
    old_value: number;
    new_value: number;
}

export default function IntegrationReportScreen() {
    const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<LogItem[]>([]);
    const [activeTab, setActiveTab] = useState('PRODUCT');

    useEffect(() => {
        if (invoiceId) {
            fetchLogItems();
        }
    }, [invoiceId]);

    const fetchLogItems = async () => {
        try {
            const response = await api.get(`/api/invoices/${invoiceId}/integration-log/items`);
            setItems(response.data);
        } catch (error) {
            console.error('Failed to fetch report:', error);
            Alert.alert('Erro', 'Não foi possível carregar o relatório.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
    };

    const formatPercent = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'percent', minimumFractionDigits: 1 }).format(val / 100);
    };

    const renderChange = (oldVal: number, newVal: number, type: string) => {
        const diff = newVal - oldVal;
        const isHigher = diff > 0;

        // Margin up is good (green), Cost/Price up is bad (red)
        let color = 'text-gray-400';
        if (type === 'margin') {
            color = isHigher ? 'text-green-500' : 'text-red-500';
        } else {
            color = isHigher ? 'text-red-500' : 'text-green-500';
        }

        return (
            <Text className={`${color} font-bold ml-2`}>
                {isHigher ? '↑' : '↓'} {type === 'margin' ? formatPercent(Math.abs(diff) * 100) : formatCurrency(Math.abs(diff))}
            </Text>
        );
    };

    const filteredItems = items.filter(i => i.entity_type === activeTab);

    if (loading) {
        return (
            <View className="flex-1 bg-slate-900 items-center justify-center">
                <ActivityIndicator size="large" color="#f97316" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-900">
            {/* Header */}
            <View className="p-6 pt-16 bg-slate-800">
                <TouchableOpacity onPress={() => router.back()} className="mb-4">
                    <Text className="text-orange-500 text-base">← Voltar</Text>
                </TouchableOpacity>
                <Text className="text-white text-2xl font-bold">Relatório de Integração</Text>
                <Text className="text-slate-400 text-sm">Fatura #{invoiceId}</Text>
            </View>

            {/* Tabs */}
            <View className="flex-row bg-slate-800 border-t border-slate-700">
                <TabButton
                    title="Produtos"
                    count={items.filter(i => i.entity_type === 'PRODUCT').length}
                    isActive={activeTab === 'PRODUCT'}
                    onPress={() => setActiveTab('PRODUCT')}
                />
                <TabButton
                    title="Receitas"
                    count={items.filter(i => i.entity_type === 'RECIPE').length}
                    isActive={activeTab === 'RECIPE'}
                    onPress={() => setActiveTab('RECIPE')}
                />
                <TabButton
                    title="Menus"
                    count={items.filter(i => i.entity_type === 'MENU_ITEM').length}
                    isActive={activeTab === 'MENU_ITEM'}
                    onPress={() => setActiveTab('MENU_ITEM')}
                />
            </View>

            {/* Content */}
            <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                    <View className="p-8 items-center">
                        <Text className="text-slate-500">Nenhuma alteração registada neste grupo.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View className="bg-slate-800 p-4 rounded-xl mb-3">
                        <Text className="text-white font-semibold text-lg mb-1">{item.entity_name}</Text>
                        <Text className="text-slate-400 text-xs mb-2 uppercase">
                            {item.field_changed === 'cost' ? 'Custo' :
                                item.field_changed === 'price_unit' ? 'Preço Uni.' :
                                    item.field_changed === 'margin' ? 'Margem' : item.field_changed}
                        </Text>

                        <View className="flex-row justify-between items-center bg-slate-900 p-3 rounded-lg">
                            <View>
                                <Text className="text-slate-500 text-xs">Anterior</Text>
                                <Text className="text-slate-300 font-medium">
                                    {item.field_changed === 'margin' ? formatPercent(item.old_value) : formatCurrency(item.old_value)}
                                </Text>
                            </View>

                            <Text className="text-slate-600">→</Text>

                            <View>
                                <Text className="text-slate-500 text-xs">Novo</Text>
                                <View className="flex-row items-center">
                                    <Text className="text-white font-medium">
                                        {item.field_changed === 'margin' ? formatPercent(item.new_value) : formatCurrency(item.new_value)}
                                    </Text>
                                    {renderChange(item.old_value, item.new_value, item.field_changed)}
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

function TabButton({ title, count, isActive, onPress }: any) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-1 p-4 border-b-2 ${isActive ? 'border-orange-500' : 'border-transparent'}`}
        >
            <Text className={`text-center font-bold ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>
                {title}
            </Text>
            <Text className="text-center text-xs text-slate-500">
                ({count})
            </Text>
        </TouchableOpacity>
    );
}
