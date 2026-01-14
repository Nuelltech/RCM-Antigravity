import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { MatchSuggestion } from '../../../../../types/invoice';
import api from '../../../../../lib/api';
import { theme } from '../../../../../ui/theme';

export default function ProductMatchScreen() {
    const { lineId } = useLocalSearchParams<{ lineId: string }>();
    const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [matching, setMatching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchSuggestions();
    }, [lineId]);

    const fetchSuggestions = async () => {
        try {
            // Get invoice ID from line (we'll need to pass it or fetch it)
            // For now, we'll use a placeholder
            const response = await api.get(`/api/invoices/0/lines/${lineId}/suggestions`);
            setSuggestions(response.data || []);
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMatch = async (produtoId: number, variacaoId?: number) => {
        try {
            setMatching(true);
            await api.post(`/api/invoices/0/lines/${lineId}/match`, {
                produto_id: produtoId,
                variacao_id: variacaoId,
            });

            Alert.alert('Sucesso', 'Produto associado com sucesso!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert('Erro', 'Falha ao associar produto');
        } finally {
            setMatching(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    if (loading) {
        return (
            <View className="flex-1 bg-slate-900 items-center justify-center">
                <ActivityIndicator size="large" color="#f97316" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-900">
            <ScrollView className="flex-1">
                <View className="p-6 pt-16">
                    <TouchableOpacity onPress={() => router.back()} className="mb-4">
                        <Text className="text-orange-500 text-base">← Voltar</Text>
                    </TouchableOpacity>

                    <Text className="text-white text-2xl font-bold mb-2">Associar Produto</Text>
                    <Text className="text-slate-400 text-sm mb-6">
                        Selecione o produto e variação correspondentes
                    </Text>

                    {/* Search */}
                    <View className="mb-6">
                        <TextInput
                            className="bg-slate-800 text-white px-4 py-3 rounded-lg"
                            placeholder="Pesquisar produtos..."
                            placeholderTextColor="#64748b"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Suggestions */}
                    <Text className="text-white text-lg font-bold mb-3">
                        Sugestões ({suggestions.length})
                    </Text>

                    {suggestions.length === 0 ? (
                        <View className="bg-slate-800 rounded-xl p-6 items-center">
                            <Text className="text-slate-400">Sem sugestões disponíveis</Text>
                        </View>
                    ) : (
                        suggestions
                            .filter(s =>
                                !searchQuery ||
                                s.produtoNome.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((suggestion) => (
                                <SuggestionCard
                                    key={suggestion.produtoId}
                                    suggestion={suggestion}
                                    onMatch={handleMatch}
                                    matching={matching}
                                />
                            ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

function SuggestionCard({
    suggestion,
    onMatch,
    matching
}: {
    suggestion: MatchSuggestion;
    onMatch: (produtoId: number, variacaoId?: number) => void;
    matching: boolean;
}) {
    const [expanded, setExpanded] = useState(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 80) return 'text-green-400';
        if (confidence >= 60) return 'text-orange-400';
        return 'text-red-400';
    };

    return (
        <View className="bg-slate-800 rounded-xl p-4 mb-3">
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                        <Text className="text-white font-bold text-base mb-1">
                            {suggestion.produtoNome}
                        </Text>
                        <Text className="text-slate-400 text-xs">{suggestion.matchReason}</Text>
                    </View>
                    <View className="items-end ml-2">
                        <Text className={`font-bold ${getConfidenceColor(suggestion.confianca)}`}>
                            {suggestion.confianca}%
                        </Text>
                        <Text className="text-slate-400 text-xs">confiança</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {expanded && (
                <View className="mt-3 pt-3 border-t border-slate-700">
                    <Text className="text-slate-400 text-xs mb-2">Variações Disponíveis:</Text>

                    {suggestion.variations.length === 0 ? (
                        <TouchableOpacity
                            onPress={() => onMatch(suggestion.produtoId)}
                            disabled={matching}
                            className="bg-orange-500 py-2 rounded-lg"
                        >
                            <Text className="text-white text-center font-semibold">
                                Selecionar (Sem Variação)
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        suggestion.variations.map((variation) => (
                            <TouchableOpacity
                                key={variation.id}
                                onPress={() => onMatch(suggestion.produtoId, variation.id)}
                                disabled={matching}
                                className="bg-slate-700 p-3 rounded-lg mb-2"
                            >
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-1">
                                        <Text className="text-white font-semibold mb-1">
                                            {variation.tipo_unidade_compra}
                                        </Text>
                                        <Text className="text-slate-400 text-xs">
                                            {variation.unidades_por_compra} {suggestion.unidadeMedida}
                                        </Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-orange-400 font-bold">
                                            {formatCurrency(variation.preco_compra)}
                                        </Text>
                                        <Text className="text-slate-400 text-xs">
                                            {formatCurrency(variation.preco_unitario)}/{suggestion.unidadeMedida}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            )}
        </View>
    );
}
