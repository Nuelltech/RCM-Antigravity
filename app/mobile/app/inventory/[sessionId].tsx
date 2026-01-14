import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, ActivityIndicator, Portal, Dialog, Button as PaperButton } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiService } from '../../services';
import { InventoryList } from '../../components/features/inventory/InventoryList';
import { Button } from '../../components/base';
import { theme } from '../../ui/theme';
import { spacing } from '../../ui/spacing';
import { typography } from '../../ui/typography';

interface InventorySession {
    id: number;
    nome: string;
    status: string;
    itens: any[];
}

export default function InventoryExecutionScreen() {
    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
    const router = useRouter();
    const [session, setSession] = useState<InventorySession | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        fetchSession();
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            const data = await ApiService.getInventorySession(Number(sessionId));
            setSession(data);
        } catch (error) {
            console.error('Failed to fetch inventory session:', error);
            Alert.alert('Erro', 'Falha ao carregar inventário');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateItem = async (itemId: number, quantidade: number) => {
        try {
            await ApiService.updateInventoryItem(itemId, { quantidade });
        } catch (error) {
            console.error('Failed to update item:', error);
            Alert.alert('Erro', 'Falha a guardar quantidade');
        }
    };

    const handleCloseInventory = async () => {
        try {
            setClosing(true);
            await ApiService.closeInventorySession(Number(sessionId));
            Alert.alert(
                'Inventário Fechado',
                'O inventário foi fechado com sucesso.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            console.error('Failed to close inventory:', error);
            Alert.alert('Erro', 'Falha ao fechar inventário');
        } finally {
            setClosing(false);
            setShowCloseDialog(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>A carregar inventário...</Text>
            </View>
        );
    }

    if (!session) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Sessão não encontrada</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{session.nome}</Text>
                <Text style={styles.subtitle}>{session.itens?.length || 0} itens para contar</Text>
            </View>

            <InventoryList items={session.itens || []} onUpdateItem={handleUpdateItem} />

            <View style={styles.footer}>
                <Button
                    onPress={() => setShowCloseDialog(true)}
                    style={styles.closeButton}
                >
                    Fechar Inventário
                </Button>
            </View>

            {/* Close Confirmation Dialog */}
            <Portal>
                <Dialog visible={showCloseDialog} onDismiss={() => setShowCloseDialog(false)}>
                    <Dialog.Title>Fechar Inventário?</Dialog.Title>
                    <Dialog.Content>
                        <Text>
                            Tem a certeza que deseja fechar este inventário?
                            As quantidades contadas serão processadas.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <PaperButton onPress={() => setShowCloseDialog(false)}>
                            Cancelar
                        </PaperButton>
                        <PaperButton
                            onPress={handleCloseInventory}
                            loading={closing}
                            disabled={closing}
                        >
                            Confirmar
                        </PaperButton>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundDark,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundDark,
    },
    loadingText: {
        marginTop: spacing.md,
        color: theme.colors.textLight,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 16,
    },
    header: {
        padding: spacing.lg,
        paddingTop: 64,
        paddingBottom: spacing.md,
        backgroundColor: theme.colors.surfaceDark,
    },
    title: {
        ...typography.h2,
        color: theme.colors.textInverse,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    footer: {
        padding: spacing.lg,
        paddingBottom: 100,
        backgroundColor: theme.colors.surfaceDark,
    },
    closeButton: {
        backgroundColor: theme.colors.success,
    },
});
