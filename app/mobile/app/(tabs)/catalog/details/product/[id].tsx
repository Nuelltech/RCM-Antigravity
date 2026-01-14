import { View, ScrollView, StyleSheet } from 'react-native';
// Product Detail Screen
import { Text, Card, ActivityIndicator, IconButton, Chip, Divider, DataTable } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useState, useEffect } from 'react';
import api from '../../../../../lib/api';
import { theme } from '../../../../../ui/theme';
import { spacing } from '../../../../../ui/spacing';
import { typography } from '../../../../../ui/typography';

export default function ProductDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadProduct(Number(id));
        }
    }, [id]);

    const loadProduct = async (productId: number) => {
        try {
            // Using direct api call since we don't have a dedicated method in ApiService for this yet
            const response = await ApiService.get(`/api/products/${productId}`);
            setProduct(response.data);
        } catch (error) {
            console.error('Failed to load product:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const handleBack = () => {
        if (navigation.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/catalog');
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!product) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Produto não encontrado.</Text>
                <IconButton icon="arrow-left" onPress={handleBack} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <IconButton
                    icon="arrow-left"
                    iconColor="white"
                    onPress={handleBack}
                    style={styles.backButton}
                />
                <Text style={styles.title}>{product.nome}</Text>
                {product.subfamilia?.familia?.nome && (
                    <Chip style={styles.familyChip}>{product.subfamilia.familia.nome}</Chip>
                )}
            </View>

            <View style={styles.content}>
                {/* Main Info */}
                <Card style={styles.sectionCard}>
                    <Card.Content>
                        <View style={styles.row}>
                            <View style={styles.infoItem}>
                                <Text style={styles.label}>Família</Text>
                                <Text style={styles.value}>{product.subfamilia?.familia?.nome || '-'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.label}>Subfamília</Text>
                                <Text style={styles.value}>{product.subfamilia?.nome || '-'}</Text>
                            </View>
                        </View>
                        <Divider style={styles.divider} />
                        <View style={styles.row}>
                            <View style={styles.infoItem}>
                                <Text style={styles.label}>Unidade Base</Text>
                                <Text style={styles.value}>{product.unidade_medida}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.label}>Vendável</Text>
                                <Chip icon={product.vendavel ? 'check' : 'close'} compact>
                                    {product.vendavel ? 'Sim' : 'Não'}
                                </Chip>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* Purchase Variations */}
                <Text style={styles.sectionTitle}>Variantes de Compra</Text>
                <Card style={styles.sectionCard}>
                    <Card.Content>
                        {product.variacoes && product.variacoes.length > 0 ? (
                            product.variacoes.map((v: any, index: number) => (
                                <View key={v.id} style={[styles.variationItem, index !== product.variacoes.length - 1 && styles.borderBottom]}>
                                    <View style={styles.variationInfo}>
                                        <Text style={styles.variationName}>
                                            {v.fornecedor || 'Fornecedor Desconhecido'}
                                        </Text>
                                        <Text style={styles.variationDetail}>
                                            {v.unidades_por_compra} {v.tipo_unidade_compra}
                                            {v.volume_por_unidade ? ` x ${v.volume_por_unidade}` : ''}
                                        </Text>
                                    </View>
                                    <View style={styles.variationPrice}>
                                        <Text style={styles.priceValue}>{formatCurrency(v.preco_compra)}</Text>
                                        <Text style={styles.unitPrice}>
                                            ({formatCurrency(v.preco_unitario)}/{product.unidade_medida.toLowerCase()})
                                        </Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>Sem variantes de compra registadas.</Text>
                        )}
                    </Card.Content>
                </Card>

                {/* Sales Variations (If Vendable) */}
                {product.vendavel && (
                    <>
                        <Text style={styles.sectionTitle}>Variantes de Venda</Text>
                        <Card style={styles.sectionCard}>
                            <Card.Content>
                                {product.formatoVenda && product.formatoVenda.length > 0 ? (
                                    product.formatoVenda.map((f: any, index: number) => (
                                        <View key={f.id} style={[styles.variationItem, index !== product.formatoVenda.length - 1 && styles.borderBottom]}>
                                            <View style={styles.variationInfo}>
                                                <Text style={styles.variationName}>{f.nome}</Text>
                                                <Text style={styles.variationDetail}>
                                                    Quantidade: {f.quantidade} {product.unidade_medida}
                                                </Text>
                                            </View>
                                            <View style={styles.variationPrice}>
                                                <Text style={styles.priceValue}>{formatCurrency(f.preco)}</Text>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.emptyText}>Sem formatos de venda configurados.</Text>
                                )}
                            </Card.Content>
                        </Card>
                    </>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundDark,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundDark,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        backgroundColor: theme.colors.surfaceDark,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderDark,
    },
    backButton: {
        marginLeft: -10,
        marginBottom: spacing.xs,
    },
    title: {
        ...typography.h1,
        color: theme.colors.textInverse,
        marginBottom: spacing.sm,
    },
    familyChip: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.primary + '20',
    },
    content: {
        padding: spacing.md,
    },
    sectionTitle: {
        ...typography.h3,
        color: theme.colors.textInverse,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    sectionCard: {
        backgroundColor: theme.colors.surfaceDark,
        marginBottom: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: spacing.xs,
    },
    infoItem: {
        flex: 1,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 2,
    },
    value: {
        color: theme.colors.textInverse,
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        marginVertical: spacing.md,
        backgroundColor: theme.colors.borderDark,
    },
    errorText: {
        color: theme.colors.textInverse,
        marginBottom: spacing.md,
    },
    variationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.borderDark,
    },
    variationInfo: {
        flex: 1,
    },
    variationName: {
        color: theme.colors.textInverse,
        fontWeight: 'bold',
        fontSize: 16,
    },
    variationDetail: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    variationPrice: {
        alignItems: 'flex-end',
    },
    priceValue: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    unitPrice: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: spacing.sm,
    }
});
