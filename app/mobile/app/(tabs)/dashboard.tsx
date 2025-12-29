import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../lib/auth';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { Svg, Path, Line } from 'react-native-svg';

interface DashboardStats {
    vendasMes: number;
    custoMercadoria: number;
    cmvTeorico: number;
    comprasMes: number;
    custoEstrutura: {
        valor: number;
        periodo: string;
    };
    salesTrend: { date: string; value: number }[];
    alertsCount: number;
    allItems: {
        id: number;
        name: string;
        category: string;
        quantity: number;
        revenue: number;
        image: string;
    }[];
}

export default function DashboardScreen() {
    const { logout, user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const response = await api.get('/api/dashboard/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStats();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const profit = stats ? (stats.vendasMes - stats.custoMercadoria - stats.custoEstrutura.valor) : 0;

    return (
        <ScrollView
            className="flex-1 bg-slate-900"
            contentContainerStyle={{ padding: 24, paddingTop: 64 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
            }
        >
            <View className="mb-6">
                <Text className="text-white text-3xl font-bold">Dashboard</Text>
                <Text className="text-slate-400 text-sm">Visão geral do desempenho do seu restaurante este mês.</Text>
            </View>

            {/* Row 1: Sales, CMV, CMV% */}
            <View className="flex-row gap-3 mb-3">
                {/* Sales Card */}
                <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
                    <View className="flex-row justify-between items-start mb-2">
                        <Text className="text-slate-600 text-xs font-bold uppercase">Vendas do Mês</Text>
                        <Text className="text-slate-400 text-[10px]">$</Text>
                    </View>
                    <Text className="text-slate-900 text-xl font-bold -mb-1">
                        {stats ? formatCurrency(stats.vendasMes) : '...'}
                    </Text>
                    <Text className="text-slate-400 text-[10px]">vs. mês anterior</Text>
                </View>

                {/* CMV Card */}
                <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
                    <View className="flex-row justify-between items-start mb-2">
                        <Text className="text-slate-600 text-xs font-bold uppercase">CMV Atual</Text>
                        <Text className="text-slate-400 text-[10px]">📦</Text>
                    </View>
                    <Text className="text-slate-900 text-xl font-bold -mb-1">
                        {stats ? formatCurrency(stats.custoMercadoria) : '...'}
                    </Text>
                    <Text className="text-slate-400 text-[10px]">Custo total merc.</Text>
                </View>
            </View>

            <View className="flex-row gap-3 mb-6">
                {/* CMV % Card */}
                <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
                    <View className="flex-row justify-between items-start mb-2">
                        <Text className="text-slate-600 text-xs font-bold uppercase">CMV %</Text>
                        <Text className="text-slate-400 text-[10px]">📉</Text>
                    </View>
                    <Text className={`text-xl font-bold -mb-1 ${stats && stats.cmvTeorico > 35 ? 'text-red-500' : 'text-slate-900'}`}>
                        {stats ? `${stats.cmvTeorico}%` : '...'}
                    </Text>
                    <Text className="text-slate-400 text-[10px]">da receita total</Text>
                </View>

                {/* Purchases Card */}
                <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
                    <View className="flex-row justify-between items-start mb-2">
                        <Text className="text-slate-600 text-xs font-bold uppercase">Compras</Text>
                        <Text className="text-slate-400 text-[10px]">🛒</Text>
                    </View>
                    <Text className="text-slate-900 text-xl font-bold -mb-1">
                        {stats ? formatCurrency(stats.comprasMes) : '...'}
                    </Text>
                    <Text className="text-slate-400 text-[10px]">Total de compras</Text>
                </View>

                {/* Structure Cost Card */}
                <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
                    <View className="flex-row justify-between items-start mb-2">
                        <Text className="text-slate-600 text-xs font-bold uppercase">Custo Est.</Text>
                        <Text className="text-slate-400 text-[10px]">🏢</Text>
                    </View>
                    <Text className="text-slate-900 text-xl font-bold -mb-1">
                        {stats ? formatCurrency(stats.custoEstrutura.valor) : '...'}
                    </Text>
                    <Text className="text-slate-400 text-[10px]">por Mês</Text>
                </View>
            </View>

            {/* Alerts Widget */}
            <TouchableOpacity
                className={`mb-6 p-4 rounded-xl shadow-sm border-l-4 flex-row justify-between items-center ${stats?.alertsCount > 0 ? 'bg-red-50 border-l-red-500' : 'bg-green-50 border-l-green-500'}`}
            // OnPress could navigate to alerts screen
            >
                <View>
                    <Text className={`text-xs font-bold uppercase ${stats?.alertsCount > 0 ? 'text-red-700' : 'text-green-700'}`}>Alertas Ativos</Text>
                    <Text className="text-slate-900 text-2xl font-bold mt-1">{stats?.alertsCount || 0}</Text>
                    <Text className="text-slate-500 text-xs">{stats?.alertsCount > 0 ? 'Requerem atenção imediata' : 'Tudo operacional'}</Text>
                </View>
                <View className={`p-2 rounded-full ${stats?.alertsCount > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    <Text>{stats?.alertsCount > 0 ? '⚠️' : '✅'}</Text>
                </View>
            </TouchableOpacity>


            {/* Sales Chart (Line Chart) */}
            <View className="bg-white p-6 rounded-xl shadow-sm mb-6">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-slate-900 text-lg font-bold">Vendas do Mês</Text>
                    <View className="bg-slate-100 px-3 py-1 rounded text-xs">
                        <Text className="text-slate-600 text-xs">Tendência Diária</Text>
                    </View>
                </View>

                <View className="h-40 justify-end" style={{ overflow: 'hidden' }}>
                    {/* Simple SVG Line Chart */}
                    <Svg height="100%" width="100%">
                        {/* Grid Lines */}
                        <Line x1="0" y1="25%" x2="100%" y2="25%" stroke="#f1f5f9" strokeWidth="1" />
                        <Line x1="0" y1="50%" x2="100%" y2="50%" stroke="#f1f5f9" strokeWidth="1" />
                        <Line x1="0" y1="75%" x2="100%" y2="75%" stroke="#f1f5f9" strokeWidth="1" />

                        {/* Trend Line */}
                        {stats?.salesTrend && stats.salesTrend.length > 0 && (
                            <Path
                                d={`M ${stats.salesTrend.map((p, index) => {
                                    const x = (index / (stats.salesTrend.length - 1)) * 300; // Approximate width mapping
                                    // Normalize y: find max value first
                                    const maxVal = Math.max(...stats.salesTrend.map(i => i.value), 100);
                                    const y = 160 - ((p.value / maxVal) * 160); // Invert Y, scale to height 160
                                    return `${x},${y}`;
                                }).join(' L ')}`}
                                fill="none"
                                stroke="#f97316"
                                strokeWidth="3"
                            />
                        )}
                    </Svg>
                </View>
                <View className="mt-2 flex-row justify-between">
                    <Text className="text-slate-400 text-xs">Início</Text>
                    <Text className="text-slate-400 text-xs">Fim do Mês</Text>
                </View>
                <Text className="text-slate-500 text-xs mt-4">Total: {stats ? formatCurrency(stats.vendasMes) : '...'}</Text>
            </View>

            {/* Top Sales List */}
            <View className="space-y-4 mb-8">
                <View className="flex-row justify-between items-center">
                    <Text className="text-white text-xl font-bold">Top Vendas</Text>
                    <View className="flex-row gap-2">
                        <View className="bg-slate-800 px-3 py-1 rounded border border-slate-700">
                            <Text className="text-slate-300 text-xs font-bold">€ Faturação</Text>
                        </View>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-4">
                    {stats?.allItems?.slice(0, 5).map((item, index) => (
                        <View key={item.id} className="bg-white rounded-xl p-4 w-40 shadow-sm mr-4">
                            <View className="flex-row justify-between mb-2">
                                <View className="bg-blue-500 w-6 h-6 rounded-full items-center justify-center">
                                    <Text className="text-white text-xs font-bold">#{index + 1}</Text>
                                </View>
                            </View>
                            <View className="bg-slate-100 w-16 h-16 rounded mb-3 mx-auto items-center justify-center">
                                {/* Image Placeholder */}
                                <Text>📦</Text>
                            </View>
                            <Text className="text-slate-900 font-bold text-sm mb-1" numberOfLines={1}>{item.name}</Text>
                            <Text className="text-slate-500 text-xs mb-3">{item.category}</Text>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-slate-400 text-[10px]">Qtd. {item.quantity}</Text>
                                <Text className="text-blue-600 font-bold text-xs">{formatCurrency(item.revenue)}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </ScrollView>
    );

}
