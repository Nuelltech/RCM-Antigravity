import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, IconButton, Avatar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import api from '../../../../../lib/api';
import { theme } from '../../../../../ui/theme';

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
                <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerBackground}>
                    <Avatar.Icon size={80} icon="layers" style={{ backgroundColor: 'transparent' }} color="#a855f7" />
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
                <Text style={styles.title}>{combo.nome}</Text>
                <Text style={styles.description}>{combo.descricao || 'Sem descrição.'}</Text>

                <View style={styles.costCard}>
                    <Text style={styles.costLabel}>Custo Total</Text>
                    <Text style={styles.costValue}>{formatCurrency(combo.custo_total)}</Text>
                </View>

                <Text style={styles.sectionTitle}>
                    {combo.tipo === 'Complexo' ? 'Itens do Combo' : 'Opções do Combo'}
                </Text>

                {combo.tipo === 'Complexo' ? (
                    <View style={styles.itemsList}>
                        {combo.itens?.map((item: any, index: number) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    if (item.receita) router.push(`/catalog/details/recipe/${item.receita.id}`);
                                    else if (item.produto) router.push(`/catalog/details/product/${item.produto.id}`);
                                }}
                                disabled={!item.receita && !item.produto}
                            >
                                <View style={[styles.itemRow, index !== combo.itens.length - 1 && styles.borderBottom]}>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>
                                            {item.produto?.nome || item.receita?.nome || item.menuItem?.nome_comercial}
                                        </Text>
                                        <Text style={styles.itemQuantity}>
                                            Qtd: {item.quantidade}
                                        </Text>
                                    </View>
                                    <IconButton icon="chevron-right" iconColor="#64748b" size={20} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.categoriesContainer}>
                        {combo.categorias?.map((cat: any, index: number) => (
                            <View key={index} style={styles.categoryCard}>
                                <View style={styles.categoryHeader}>
                                    <Text style={styles.categoryTitle}>{cat.categoria}</Text>
                                    <Text style={styles.categoryBadge}>
                                        {cat.obrigatoria ? 'Obrigatório' : 'Opcional'}
                                    </Text>
                                </View>
                                <View style={styles.optionsList}>
                                    {cat.opcoes?.map((opt: any, optIndex: number) => (
                                        <TouchableOpacity
                                            key={optIndex}
                                            onPress={() => {
                                                if (opt.receita) router.push(`/catalog/details/recipe/${opt.receita.id}`);
                                                else if (opt.formatoVenda?.produto) router.push(`/catalog/details/product/${opt.formatoVenda.produto.id}`);
                                            }}
                                            disabled={!opt.receita && !opt.formatoVenda?.produto}
                                        >
                                            <View style={[styles.optionRow, optIndex !== cat.opcoes.length - 1 && styles.borderBottom]}>
                                                <View style={styles.itemInfo}>
                                                    <Text style={styles.itemName}>
                                                        {opt.receita?.nome || opt.formatoVenda?.nome}
                                                    </Text>
                                                    <Text style={styles.itemCost}>
                                                        {formatCurrency(opt.custo_unitario)}
                                                    </Text>
                                                </View>
                                                <IconButton icon="chevron-right" iconColor="#64748b" size={20} />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}
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
        backgroundColor: 'rgba(88, 28, 135, 0.2)', // purple-900/20
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
    title: {
        color: 'white',
        fontSize: 30, // text-3xl
        fontWeight: 'bold',
        marginBottom: 8,
    },
    description: {
        color: '#94a3b8', // slate-400
        fontSize: 14, // text-sm
        marginBottom: 24,
    },
    costCard: {
        backgroundColor: '#1e293b', // slate-800
        padding: 16,
        borderRadius: 12, // rounded-xl
        marginBottom: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    costLabel: {
        color: '#94a3b8', // slate-400
        fontSize: 16, // text-base
    },
    costValue: {
        color: '#34d399', // emerald-400
        fontWeight: 'bold',
        fontSize: 24, // text-2xl
    },
    sectionTitle: {
        color: 'white',
        fontSize: 20, // text-xl
        fontWeight: 'bold',
        marginBottom: 16,
    },
    itemsList: {
        backgroundColor: '#1e293b', // slate-800
        borderRadius: 12, // rounded-xl
        overflow: 'hidden',
        marginBottom: 32,
    },
    itemRow: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: '#334155', // slate-700
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        color: 'white',
        fontWeight: '600',
    },
    itemQuantity: {
        color: '#94a3b8', // slate-400
        fontSize: 12, // text-xs
    },
    categoriesContainer: {
        gap: 16,
        marginBottom: 32,
    },
    categoryCard: {
        backgroundColor: '#1e293b', // slate-800
        borderRadius: 12,
        overflow: 'hidden',
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#334155', // slate-700
    },
    categoryTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    categoryBadge: {
        color: '#94a3b8', // slate-400
        fontSize: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    optionsList: {
        padding: 0,
    },
    optionRow: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemCost: {
        color: '#94a3b8', // slate-400
        fontSize: 12,
    },
});
