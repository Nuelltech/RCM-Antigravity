import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ApiService } from '../../services';
import { theme } from '../../ui/theme';
import { spacing } from '../../ui/spacing';
import { typography } from '../../ui/typography';

interface InventorySession {
    id: number;
    numero: number;
    nome: string;
    tipo: string;
    status: string;
    created_at: string;
    _count?: {
        itens: number;
    };
}

export default function InventoryIndexScreen() {
    const router = useRouter();
    const [sessions, setSessions] = useState<InventorySession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const data = await ApiService.getInventorySessions('Aberto');
            setSessions(data);
        } catch (error) {
            console.error('Failed to fetch inventory sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>A carregar...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Inventário</Text>
                <Text style={styles.subtitle}>Sessões abertas para execução</Text>
            </View>

            {sessions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📦</Text>
                    <Text style={styles.emptyTitle}>Sem Inventários Abertos</Text>
                    <Text style={styles.emptySubtitle}>
                        Crie um inventário no sistema web para começar
                    </Text>
                </View>
            ) : (
                sessions.map((session) => (
                    <Card
                        key={session.id}
                        style={styles.sessionCard}
                        onPress={() => router.push(`/inventory/${session.id}`)}
                    >
                        <Card.Content>
                            <View style={styles.sessionHeader}>
                                <Text style={styles.sessionName}>{session.nome}</Text>
                                <Chip>{session.tipo}</Chip>
                            </View>
                            <Text style={styles.sessionMeta}>
                                Sessão #{session.numero} • {session._count?.itens || 0} itens
                            </Text>
                            <Text style={styles.sessionDate}>
                                Criado em {formatDate(session.created_at)}
                            </Text>
                        </Card.Content>
                    </Card>
                ))
            )}

            <View style={styles.bottomSpace} />
        </ScrollView>
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
    header: {
        padding: spacing.lg,
        paddingTop: 64,
        paddingBottom: spacing.md,
    },
    title: {
        ...typography.h1,
        color: theme.colors.textInverse,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    sessionCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: theme.colors.surfaceDark,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    sessionName: {
        ...typography.h3,
        color: theme.colors.textInverse,
        flex: 1,
        marginRight: spacing.sm,
    },
    sessionMeta: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginBottom: spacing.xs,
    },
    sessionDate: {
        color: theme.colors.textLight,
        fontSize: 12,
    },
    emptyContainer: {
        paddingVertical: 80,
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        fontSize: 60,
        marginBottom: spacing.md,
    },
    emptyTitle: {
        ...typography.h2,
        color: theme.colors.textInverse,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
    bottomSpace: {
        height: 96,
    },
});
