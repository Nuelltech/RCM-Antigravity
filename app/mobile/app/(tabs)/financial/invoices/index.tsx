import { View, ScrollView, StyleSheet, RefreshControl, Linking } from 'react-native';
import { Text, Card, ActivityIndicator, FAB, Button } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ApiService } from '../../../../services';
import api from '../../../../lib/api';
import { theme } from '../../../../ui/theme';
import { spacing } from '../../../../ui/spacing';
import { typography } from '../../../../ui/typography';

interface Invoice {
    id: number;
    numero_fatura?: string;
    fornecedor?: { nome: string };
    data_fatura?: string;
    total?: number;
    status: string;
    created_at: string;
    ficheiro_url?: string;
}

export default function InvoicesIndexScreen() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const data = await ApiService.getInvoices({ limit: 50 });
            setInvoices(data.invoices || []);
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchInvoices();
    };

    const formatCurrency = (value?: number) => {
        if (!value) return '€0.00';
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return theme.colors.success;
            case 'reviewing': return theme.colors.warning;
            case 'processing': return theme.colors.info;
            default: return theme.colors.textSecondary;
        }
    };

    const handleViewFile = async (url?: string) => {
        if (!url) {
            alert('Não há ficheiro associado a esta fatura.');
            return;
        }

        try {
            let fullUrl = url;
            // If relative URL (starts with /), prepend API URL
            if (url.startsWith('/')) {
                const baseUrl = api.defaults.baseURL || '';
                // Remove trailing slash from base if present and leading from url if present to avoid double, 
                // but usually axios baseUrl doesn't have trailing slash.
                fullUrl = `${baseUrl}${url}`;
            }

            const supported = await Linking.canOpenURL(fullUrl);
            if (supported) {
                await Linking.openURL(fullUrl);
            } else {
                alert(`Não é possível abrir este URL: ${fullUrl}`);
            }
        } catch (error) {
            console.error('Error opening URL:', error);
            alert('Erro ao abrir o ficheiro.');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>A carregar faturas...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Faturas</Text>
                <Text style={styles.subtitle}>{invoices.length} faturas registadas</Text>
            </View>

            <ScrollView
                style={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {invoices.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📄</Text>
                        <Text style={styles.emptyTitle}>Sem Faturas</Text>
                        <Text style={styles.emptySubtitle}>
                            Importe a sua primeira fatura
                        </Text>
                    </View>
                ) : (
                    invoices.map((invoice) => (
                        <Card
                            key={invoice.id}
                            style={styles.invoiceCard}
                            onPress={() => router.push(`/financial/invoices/${invoice.id}`)}
                        >
                            <Card.Content>
                                <View style={styles.invoiceHeader}>
                                    <Text style={styles.invoiceNumber}>
                                        {invoice.numero_fatura || `#${invoice.id}`}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '30' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                                            {invoice.status}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.supplier}>
                                    {invoice.fornecedor?.nome || 'Fornecedor desconhecido'}
                                </Text>
                                <View style={styles.invoiceFooter}>
                                    <Text style={styles.date}>{formatDate(invoice.data_fatura)}</Text>
                                    {invoice.total && (
                                        <Text style={styles.total}>{formatCurrency(invoice.total)}</Text>
                                    )}
                                </View>
                            </Card.Content>
                            <Card.Actions style={{ justifyContent: 'flex-end', paddingTop: 0 }}>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <Button
                                        mode="text"
                                        compact
                                        icon="eye"
                                        onPress={(e: any) => {
                                            e.stopPropagation();
                                            handleViewFile(invoice.ficheiro_url);
                                        }}
                                    >
                                        Ver Ficheiro
                                    </Button>
                                    {(invoice.status === 'reviewing' || invoice.status === 'pending') && (
                                        <Button
                                            mode="contained-tonal"
                                            compact
                                            icon="check-circle-outline"
                                            onPress={() => router.push(`/financial/invoices/${invoice.id}`)}
                                        >
                                            Validar
                                        </Button>
                                    )}
                                </View>
                            </Card.Actions>
                        </Card>
                    ))
                )}
                <View style={styles.bottomSpace} />
            </ScrollView>

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => router.push('/financial/invoices/new')}
                color={theme.colors.textInverse}
            />
        </View >
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
    list: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    invoiceCard: {
        marginBottom: spacing.md,
        backgroundColor: theme.colors.surfaceDark,
    },
    invoiceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    invoiceNumber: {
        ...typography.h3,
        color: theme.colors.textInverse,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    supplier: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginBottom: spacing.sm,
    },
    invoiceFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    date: {
        color: theme.colors.textLight,
        fontSize: 12,
    },
    total: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyContainer: {
        paddingVertical: 80,
        alignItems: 'center',
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
    fab: {
        position: 'absolute',
        bottom: 100,
        right: spacing.lg,
        backgroundColor: theme.colors.primary,
    },
});
