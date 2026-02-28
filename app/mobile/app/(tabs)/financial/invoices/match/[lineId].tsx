import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, ActivityIndicator, TextInput, IconButton, Card, Button, Chip } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MatchSuggestion } from '../../../../../types/invoice';
import api from '../../../../../lib/api';
import { theme } from '../../../../../ui/theme';
import { spacing } from '../../../../../ui/spacing';
import { typography } from '../../../../../ui/typography';

export default function ProductMatchScreen() {
    const { lineId, invoiceId } = useLocalSearchParams<{ lineId: string, invoiceId: string }>();
    const router = useRouter();
    const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [matching, setMatching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (lineId && invoiceId) {
            fetchSuggestions();
        }
    }, [lineId, invoiceId]);

    const fetchSuggestions = async () => {
        try {
            const response = await api.get(`/api/invoices/${invoiceId}/lines/${lineId}/suggestions`);
            setSuggestions(response.data || []);
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
            Alert.alert('Erro', 'Não foi possível carregar as sugestões.');
        } finally {
            setLoading(false);
        }
    };

    const handleMatch = async (produtoId: number, variacaoId?: number) => {
        try {
            setMatching(true);
            await api.post(`/api/invoices/${invoiceId}/lines/${lineId}/match`, {
                produto_id: produtoId,
                variacao_id: variacaoId,
            });

            Alert.alert('Sucesso', 'Produto associado com sucesso!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Erro', error?.response?.data?.error || 'Falha ao associar produto');
        } finally {
            setMatching(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const filteredSuggestions = suggestions.filter(s =>
        !searchQuery ||
        s.produtoNome.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton
                    icon="arrow-left"
                    iconColor="white"
                    onPress={() => router.back()}
                />
                <Text style={styles.headerTitle}>Associar Produto</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>
                    Selecione o produto e variação correspondentes para a linha da fatura.
                </Text>

                {/* Search */}
                <TextInput
                    mode="outlined"
                    placeholder="Pesquisar produtos..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                    left={<TextInput.Icon icon="magnify" />}
                />

                {/* Suggestions */}
                <Text style={styles.sectionTitle}>
                    Sugestões ({filteredSuggestions.length})
                </Text>

                {filteredSuggestions.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <Card.Content>
                            <Text style={styles.emptyText}>Sem sugestões disponíveis</Text>
                        </Card.Content>
                    </Card>
                ) : (
                    filteredSuggestions.map((suggestion) => {
                        // DEBUG: Check what data we are getting
                        console.log(`[Item] ${suggestion.produtoNome}`, suggestion.variations.map(v =>
                            `ID:${v.id} Name:${v.template?.nome ?? v.tipo_unidade_compra} (Original:${v.tipo_unidade_compra}, T:${v.template?.nome})`
                        ));
                        return (
                            <SuggestionCard
                                key={suggestion.produtoId}
                                suggestion={suggestion}
                                onMatch={handleMatch}
                                matching={matching}
                            />
                        );
                    })
                )}
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
        if (confidence >= 80) return theme.colors.success;
        if (confidence >= 60) return theme.colors.warning;
        return theme.colors.error;
    };

    return (
        <Card style={styles.card} onPress={() => setExpanded(!expanded)}>
            <Card.Content>
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>
                            {suggestion.produtoNome}
                        </Text>
                        <Text style={styles.matchReason}>{suggestion.matchReason}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                        <Text style={[styles.confidence, { color: getConfidenceColor(suggestion.confianca) }]}>
                            {suggestion.confianca}%
                        </Text>
                        <Text style={styles.confidenceLabel}>confiança</Text>
                    </View>
                </View>

                {expanded && (
                    <View style={styles.variationsContainer}>
                        <Text style={styles.variationsTitle}>Variações Disponíveis:</Text>

                        {suggestion.variations.length === 0 ? (
                            <Button
                                mode="contained"
                                onPress={() => onMatch(suggestion.produtoId)}
                                loading={matching}
                                disabled={matching}
                                style={styles.selectButton}
                            >
                                Selecionar (Sem Variação)
                            </Button>
                        ) : (
                            suggestion.variations.map((variation) => (
                                <TouchableOpacity
                                    key={variation.id}
                                    onPress={() => onMatch(suggestion.produtoId, variation.id)}
                                    disabled={matching}
                                    style={styles.variationItem}
                                >
                                    <View style={styles.row}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.variationName}>
                                                {variation.template?.nome ?? variation.tipo_unidade_compra}
                                            </Text>
                                            <Text style={styles.variationDetail}>
                                                {variation.unidades_por_compra || '-'} {suggestion.unidadeMedida}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.variationPrice}>
                                                {formatCurrency(variation.preco_compra)}
                                            </Text>
                                            <Text style={styles.variationUnitDetail}>
                                                {formatCurrency(variation.preco_unitario)}/{suggestion.unidadeMedida}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundDark,
        paddingTop: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundDark,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        paddingBottom: spacing.sm,
    },
    headerTitle: {
        ...typography.h3,
        color: theme.colors.textInverse,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 80,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        marginBottom: spacing.md,
    },
    searchInput: {
        marginBottom: spacing.lg,
        backgroundColor: theme.colors.surface,
    },
    sectionTitle: {
        ...typography.h4,
        color: theme.colors.textInverse,
        marginBottom: spacing.sm,
    },
    emptyCard: {
        backgroundColor: theme.colors.surfaceDark,
        padding: spacing.lg,
        alignItems: 'center',
        borderColor: theme.colors.border,
        borderWidth: 1,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    card: {
        backgroundColor: theme.colors.surfaceDark,
        marginBottom: spacing.md,
        borderColor: theme.colors.border,
        borderWidth: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    productName: {
        ...typography.h4,
        color: theme.colors.textInverse,
        marginBottom: 4,
    },
    matchReason: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    confidence: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    confidenceLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
    },
    variationsContainer: {
        marginTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: spacing.md,
    },
    variationsTitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: spacing.sm,
    },
    selectButton: {
        backgroundColor: theme.colors.primary,
    },
    variationItem: {
        backgroundColor: theme.colors.background,
        padding: spacing.sm,
        borderRadius: 8,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    variationName: {
        color: theme.colors.textInverse,
        fontWeight: '600',
    },
    variationDetail: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    variationPrice: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    variationUnitDetail: {
        color: theme.colors.textSecondary,
        fontSize: 10,
    },
});
