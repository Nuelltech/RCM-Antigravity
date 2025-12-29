import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity, FlatList, Dimensions, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

const { width: screenWidth } = Dimensions.get('window');
import api from '../../../../lib/api';
import { ArrowLeft, ChefHat, Clock, Users, DollarSign, Video as VideoIcon } from 'lucide-react-native';
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
    const [recipe, setRecipe] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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

    if (!recipe) {
        return (
            <View className="flex-1 bg-slate-900 justify-center items-center">
                <Text className="text-white">Receita não encontrada.</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4">
                    <Text className="text-orange-500">Voltar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-slate-900">
            {/* Header / Image / Video */}
            <View className="relative bg-slate-800">
                {(() => {
                    const youtubeId = recipe.video_url ? getYouTubeVideoId(recipe.video_url) : null;
                    const hasImage = recipe.imagem_url && recipe.imagem_url.trim() !== '';

                    // If YouTube video + image, show image with play button
                    if (youtubeId && hasImage) {
                        return (
                            <View className="relative">
                                <Image
                                    source={{ uri: recipe.imagem_url }}
                                    className="w-full h-64"
                                    resizeMode="cover"
                                />
                                {/* Play button overlay */}
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(recipe.video_url)}
                                    className="absolute inset-0 items-center justify-center"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                                >
                                    <View className="bg-red-600 rounded-full p-4">
                                        <VideoIcon size={40} color="white" />
                                    </View>
                                    <Text className="text-white mt-2 font-bold">Ver Vídeo no YouTube</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }

                    // Direct video file (not YouTube)
                    if (recipe.video_url && recipe.video_url.trim() !== '' && !youtubeId) {
                        return (
                            <View className="w-full h-64">
                                <Video
                                    source={{ uri: recipe.video_url }}
                                    useNativeControls
                                    resizeMode={ResizeMode.CONTAIN}
                                    style={{ width: '100%', height: '100%' }}
                                    isLooping={false}
                                />
                            </View>
                        );
                    }

                    // Image only
                    if (hasImage) {
                        return <Image source={{ uri: recipe.imagem_url }} className="w-full h-64" resizeMode="cover" />;
                    }

                    // Placeholder
                    return (
                        <View className="w-full h-64 items-center justify-center bg-slate-700">
                            <ChefHat size={64} color="#475569" />
                            <Text className="text-slate-500 mt-2">Sem imagem</Text>
                        </View>
                    );
                })()}

                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-12 left-4 bg-black/50 p-2 rounded-full z-10"
                >
                    <ArrowLeft color="white" size={24} />
                </TouchableOpacity>
            </View>

            <View className="p-6">
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-white text-3xl font-bold flex-1 mr-4">{recipe.nome}</Text>
                    <View className="bg-orange-500 px-3 py-1 rounded-full">
                        <Text className="text-white font-bold text-xs uppercase">{recipe.tipo}</Text>
                    </View>
                </View>

                <Text className="text-slate-400 text-sm mb-6">{recipe.descricao || 'Sem descrição.'}</Text>

                {/* Info Grid */}
                <View className="flex-row flex-wrap gap-3 mb-8">
                    <View className="bg-slate-800 p-3 rounded-xl flex-1 min-w-[45%]">
                        <View className="flex-row items-center mb-1">
                            <Users size={16} color="#94a3b8" />
                            <Text className="text-slate-400 text-xs ml-2">Porções</Text>
                        </View>
                        <Text className="text-white font-bold text-lg">{recipe.numero_porcoes}</Text>
                    </View>
                    <View className="bg-slate-800 p-3 rounded-xl flex-1 min-w-[45%]">
                        <View className="flex-row items-center mb-1">
                            <Clock size={16} color="#94a3b8" />
                            <Text className="text-slate-400 text-xs ml-2">Tempo</Text>
                        </View>
                        <Text className="text-white font-bold text-lg">{recipe.tempo_preparacao || '-'} min</Text>
                    </View>
                    <View className="bg-slate-800 p-3 rounded-xl flex-1 min-w-[45%]">
                        <View className="flex-row items-center mb-1">
                            <DollarSign size={16} color="#94a3b8" />
                            <Text className="text-slate-400 text-xs ml-2">Custo Total</Text>
                        </View>
                        <Text className="text-emerald-400 font-bold text-lg">{formatCurrency(recipe.custo_total)}</Text>
                    </View>
                    <View className="bg-slate-800 p-3 rounded-xl flex-1 min-w-[45%]">
                        <View className="flex-row items-center mb-1">
                            <DollarSign size={16} color="#94a3b8" />
                            <Text className="text-slate-400 text-xs ml-2">Por Porção</Text>
                        </View>
                        <Text className="text-emerald-400 font-bold text-lg">{formatCurrency(recipe.custo_por_porcao)}</Text>
                    </View>
                </View>

                {/* Ingredients */}
                <Text className="text-white text-xl font-bold mb-4">Ingredientes</Text>
                <View className="bg-slate-800 rounded-xl overflow-hidden mb-8">
                    {recipe.ingredientes?.map((ing: any, index: number) => (
                        <View key={index} className={`p-4 flex-row justify-between items-center ${index !== recipe.ingredientes.length - 1 ? 'border-b border-slate-700' : ''}`}>
                            <View className="flex-1">
                                <Text className="text-white font-semibold">
                                    {ing.produto?.nome || ing.receitaPreparo?.nome}
                                </Text>
                                <Text className="text-slate-400 text-xs">
                                    {ing.quantidade_bruta} {ing.unidade}
                                </Text>
                            </View>
                            <Text className="text-slate-300 font-bold">
                                {formatCurrency(ing.custo_ingrediente)}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Steps */}
                {recipe.etapas && recipe.etapas.length > 0 && (
                    <>
                        <Text className="text-white text-xl font-bold mb-4">Modo de Preparo</Text>
                        <View className="space-y-4 mb-8">
                            {recipe.etapas.map((step: any, index: number) => (
                                <View key={index} className="flex-row">
                                    <View className="bg-slate-700 w-8 h-8 rounded-full items-center justify-center mr-4 mt-1">
                                        <Text className="text-white font-bold">{step.numero_etapa}</Text>
                                    </View>
                                    <View className="flex-1 bg-slate-800 p-4 rounded-xl">
                                        <Text className="text-slate-300 leading-6">{step.descricao}</Text>
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
