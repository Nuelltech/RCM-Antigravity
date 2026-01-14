import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity, FlatList, Dimensions, Linking, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useState, useEffect } from 'react';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Icon wrappers to match previous usage
const IconWrapper = ({ name, color, size }: { name: any, color: string, size: number }) => (
    <MaterialCommunityIcons name={name} size={size} color={color} />
);

const ArrowLeft = (props: any) => <IconWrapper name="arrow-left" {...props} />;
const VideoIcon = (props: any) => <IconWrapper name="video" {...props} />;
const ChefHat = (props: any) => <IconWrapper name="chef-hat" {...props} />;
const Users = (props: any) => <IconWrapper name="account-group" {...props} />;
const Clock = (props: any) => <IconWrapper name="clock-outline" {...props} />;
const DollarSign = (props: any) => <IconWrapper name="currency-usd" {...props} />;

const { width: screenWidth } = Dimensions.get('window');
import api from '../../../../../lib/api';
import { theme } from '../../../../../ui/theme';
import { Video, ResizeMode } from 'expo-av';

// Helper to extract YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;

    // youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];

    // youtube.com/watch?v=VIDEO_ID
    const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (longMatch) return longMatch[1];

    return null;
};

export default function RecipeDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();
    const [recipe, setRecipe] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const handleBack = () => {
        if (navigation.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/catalog');
        }
    };

    useEffect(() => {
        if (id) {
            loadRecipe(Number(id));
        }
    }, [id]);

    const loadRecipe = async (recipeId: number) => {
        try {
            const response = await api.get(`/api/recipes/${recipeId}`);
            console.log('Recipe data:', response.data);
            console.log('Video URL:', response.data?.video_url);
            console.log('Image URL:', response.data?.imagem_url);
            setRecipe(response.data);
        } catch (error) {
            console.error('Failed to load recipe:', error);
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

    return (
        <ScrollView style={styles.container}>
            {/* Header / Image / Video */}
            <View style={styles.mediaContainer}>
                {(() => {
                    const youtubeId = recipe.video_url ? getYouTubeVideoId(recipe.video_url) : null;
                    const hasImage = recipe.imagem_url && recipe.imagem_url.trim() !== '';

                    // If YouTube video + image, show image with play button
                    if (youtubeId && hasImage) {
                        return (
                            <View>
                                <Image
                                    source={{ uri: recipe.imagem_url }}
                                    style={styles.mediaImage}
                                    resizeMode="cover"
                                />
                                {/* Play button overlay */}
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(recipe.video_url)}
                                    style={styles.playButtonOverlay}
                                >
                                    <View style={styles.playButton}>
                                        <VideoIcon size={40} color="white" />
                                    </View>
                                    <Text style={styles.playButtonText}>Ver Vídeo no YouTube</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }

                    // Direct video file (not YouTube)
                    if (recipe.video_url && recipe.video_url.trim() !== '' && !youtubeId) {
                        return (
                            <View style={styles.mediaImage}>
                                <Video
                                    source={{ uri: recipe.video_url }}
                                    useNativeControls
                                    resizeMode={ResizeMode.CONTAIN}
                                    style={styles.fullSize}
                                    isLooping={false}
                                />
                            </View>
                        );
                    }

                    // Image only
                    if (hasImage) {
                        return <Image source={{ uri: recipe.imagem_url }} style={styles.mediaImage} resizeMode="cover" />;
                    }

                    // Placeholder
                    return (
                        <View style={[styles.mediaImage, styles.placeholderContainer]}>
                            <ChefHat size={64} color="#475569" />
                            <Text style={styles.placeholderText}>Sem imagem</Text>
                        </View>
                    );
                })()}

                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>{recipe.nome}</Text>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>{recipe.tipo}</Text>
                    </View>
                </View>

                <Text style={styles.description}>{recipe.descricao || 'Sem descrição.'}</Text>

                {/* Info Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Users size={16} color="#94a3b8" />
                            <Text style={styles.statLabel}>Porções</Text>
                        </View>
                        <Text style={styles.statValue}>{recipe.numero_porcoes}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Clock size={16} color="#94a3b8" />
                            <Text style={styles.statLabel}>Tempo</Text>
                        </View>
                        <Text style={styles.statValue}>{recipe.tempo_preparacao || '-'} min</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <DollarSign size={16} color="#94a3b8" />
                            <Text style={styles.statLabel}>Custo Total</Text>
                        </View>
                        <Text style={[styles.statValue, styles.textSuccess]}>{formatCurrency(recipe.custo_total)}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <DollarSign size={16} color="#94a3b8" />
                            <Text style={styles.statLabel}>Por Porção</Text>
                        </View>
                        <Text style={[styles.statValue, styles.textSuccess]}>{formatCurrency(recipe.custo_por_porcao)}</Text>
                    </View>
                </View>

                {/* Ingredients Table */}
                <Text style={styles.sectionTitle}>Ingredientes</Text>
                <View style={styles.tableContainer}>
                    <View style={styles.tableRowRef}>
                        {/* Fixed Column - Product Name */}
                        <View style={styles.fixedColumn}>
                            <View style={[styles.cell, styles.headerCell, styles.fixedHeader]}>
                                <Text style={styles.headerText}>Produto</Text>
                            </View>
                            {recipe.ingredientes?.map((ing: any, index: number) => (
                                <View key={index} style={[styles.cell, styles.fixedCell]}>
                                    <Text style={styles.cellText} numberOfLines={2}>
                                        {ing.produto?.nome || ing.receitaPreparo?.nome}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Scrollable Columns */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                            <View>
                                <View style={styles.headerRow}>
                                    <View style={[styles.cell, styles.headerCell, { width: 80 }]}>
                                        <Text style={styles.headerText}>Qtd Bruta</Text>
                                    </View>
                                    <View style={[styles.cell, styles.headerCell, { width: 80 }]}>
                                        <Text style={styles.headerText}>Qtd Líq.</Text>
                                    </View>
                                    <View style={[styles.cell, styles.headerCell, { width: 80 }]}>
                                        <Text style={styles.headerText}>Rent.</Text>
                                    </View>
                                    <View style={[styles.cell, styles.headerCell, { width: 60 }]}>
                                        <Text style={styles.headerText}>Unid.</Text>
                                    </View>
                                    <View style={[styles.cell, styles.headerCell, { width: 80 }]}>
                                        <Text style={styles.headerText}>Custo</Text>
                                    </View>
                                    <View style={[styles.cell, styles.headerCell, { width: 150 }]}>
                                        <Text style={styles.headerText}>Notas</Text>
                                    </View>
                                </View>

                                {recipe.ingredientes?.map((ing: any, index: number) => (
                                    <View key={index} style={styles.dataRow}>
                                        <View style={[styles.cell, { width: 80 }]}>
                                            <Text style={styles.cellText}>{ing.quantidade_bruta}</Text>
                                        </View>
                                        <View style={[styles.cell, { width: 80 }]}>
                                            <Text style={styles.cellText}>{ing.quantidade_liquida || '-'}</Text>
                                        </View>
                                        <View style={[styles.cell, { width: 80 }]}>
                                            <Text style={styles.cellText}>
                                                {ing.rentabilidade ? `${Number(ing.rentabilidade).toFixed(1)}%` : '-'}
                                            </Text>
                                        </View>
                                        <View style={[styles.cell, { width: 60 }]}>
                                            <Text style={styles.cellText}>{ing.unidade}</Text>
                                        </View>
                                        <View style={[styles.cell, { width: 80 }]}>
                                            <Text style={styles.cellText}>{formatCurrency(ing.custo_ingrediente)}</Text>
                                        </View>
                                        <View style={[styles.cell, { width: 150 }]}>
                                            <Text style={[styles.cellText, styles.noteText]} numberOfLines={1}>
                                                {ing.notas || '-'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </View>

                {/* Steps */}
                {recipe.etapas && recipe.etapas.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Modo de Preparo</Text>
                        <View style={styles.stepsContainer}>
                            {recipe.etapas.map((step: any, index: number) => (
                                <View key={index} style={styles.stepItem}>
                                    <View style={styles.stepNumber}>
                                        <Text style={styles.stepNumberText}>{step.numero_etapa}</Text>
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={styles.stepText}>{step.descricao}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
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
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'white',
        marginBottom: 16,
    },
    errorButton: {
        marginTop: 16,
    },
    errorButtonText: {
        color: '#f97316', // orange-500
    },
    mediaContainer: {
        position: 'relative',
        backgroundColor: '#1e293b', // slate-800
    },
    mediaImage: {
        width: '100%',
        height: 256,
    },
    fullSize: {
        width: '100%',
        height: '100%',
    },
    playButtonOverlay: {
        position: 'absolute',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playButton: {
        backgroundColor: '#dc2626', // red-600
        borderRadius: 9999,
        padding: 16,
    },
    playButtonText: {
        color: 'white',
        marginTop: 8,
        fontWeight: 'bold',
    },
    placeholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#334155', // slate-700
    },
    placeholderText: {
        color: '#64748b', // slate-500
        marginTop: 8,
    },
    backButton: {
        position: 'absolute',
        top: 48,
        left: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        borderRadius: 9999,
        zIndex: 10,
    },
    content: {
        padding: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    title: {
        color: 'white',
        fontSize: 30,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 16,
    },
    tag: {
        backgroundColor: '#f97316', // orange-500
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    tagText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    description: {
        color: '#94a3b8', // slate-400
        fontSize: 14,
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
    },
    statCard: {
        backgroundColor: '#1e293b', // slate-800
        padding: 12,
        borderRadius: 12,
        flex: 1,
        minWidth: '45%',
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    statLabel: {
        color: '#94a3b8', // slate-400
        fontSize: 12,
        marginLeft: 8,
    },
    statValue: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    textSuccess: {
        color: '#34d399', // emerald-400
    },
    sectionTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    listContainer: {
        backgroundColor: '#1e293b', // slate-800
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 32,
    },
    listItem: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: '#334155', // slate-700
    },
    flex1: {
        flex: 1,
    },
    listItemTitle: {
        color: 'white',
        fontWeight: '600',
    },
    listItemSubtitle: {
        color: '#94a3b8', // slate-400
        fontSize: 12,
    },
    listItemValue: {
        color: '#cbd5e1', // slate-300
        fontWeight: 'bold',
    },
    stepsContainer: {
        gap: 16,
        marginBottom: 32,
    },
    stepItem: {
        flexDirection: 'row',
    },
    stepNumber: {
        backgroundColor: '#334155', // slate-700
        width: 32,
        height: 32,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        marginTop: 4,
    },
    stepNumberText: {
        color: 'white',
        fontWeight: 'bold',
    },
    stepContent: {
        flex: 1,
        backgroundColor: '#1e293b', // slate-800
        padding: 16,
        borderRadius: 12,
    },
    stepText: {
        color: '#cbd5e1', // slate-300
        lineHeight: 24,
    },
    // Table Styles
    tableContainer: {
        marginBottom: 32,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
    },
    tableRowRef: {
        flexDirection: 'row',
    },
    fixedColumn: {
        width: 140,
        backgroundColor: '#1e293b',
        borderRightWidth: 1,
        borderRightColor: '#334155',
        zIndex: 10,
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    dataRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    cell: {
        height: 50, // Fixed height for alignment
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    headerCell: {
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    headerText: {
        color: '#94a3b8', // slate-400
        fontWeight: 'bold',
        fontSize: 12,
    },
    cellText: {
        color: 'white',
        fontSize: 13,
    },
    fixedHeader: {
        height: 50, // Match other headers
    },
    fixedCell: {
        height: 50, // Match data rows
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    noteText: {
        color: '#94a3b8',
        fontSize: 12,
        fontStyle: 'italic',
    },
});
