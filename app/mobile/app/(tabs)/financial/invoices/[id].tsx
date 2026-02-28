import { View, ScrollView, StyleSheet, Linking, Platform, Alert } from 'react-native';
import { Text, Card, ActivityIndicator, Divider, Button, Chip, DataTable, IconButton } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Invoice, InvoiceStatus } from '../../../../types/invoice';
import api from '../../../../lib/api';
import { theme } from '../../../../ui/theme';
import { spacing } from '../../../../ui/spacing';
import { typography } from '../../../../ui/typography';

export default function InvoiceDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        fetchInvoiceDetails();
    }, [id]);

    const fetchInvoiceDetails = async () => {
        try {
            const response = await api.get(`/api/invoices/${id}`);
            setInvoice(response.data);
        } catch (error) {
            console.error('Failed to fetch invoice details:', error);
            // Fallback for demo/dev if API fails or ID is invalid in some environments
            // setInvoice(mockInvoice); 
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '€0.00';
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'long', // Full month name for details
            year: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return theme.colors.success;
            case 'approved_partial': return theme.colors.warning;
            case 'reviewing': return theme.colors.warning;
            case 'processing': return theme.colors.info;
            case 'pending': return theme.colors.secondary;
            case 'error': return theme.colors.error;
            case 'rejected': return theme.colors.error;
            default: return theme.colors.textSecondary;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return 'Aprovada';
            case 'approved_partial': return 'Parcialmente Aprovada';
            case 'reviewing': return 'Em Revisão';
            case 'processing': return 'A Processar';
            case 'pending': return 'Pendente';
            case 'error': return 'Erro';
            case 'rejected': return 'Rejeitada';
            default: return status;
        }
    }

    const handleViewFile = async (url?: string) => {
        if (!url) {
            alert('Não há ficheiro associado a esta fatura.');
            return;
        }

        try {
            let fullUrl = url;
            if (url.startsWith('/')) {
                const baseUrl = api.defaults.baseURL || '';
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

    const handleApprove = async () => {
        if (!invoice) return;

        // Check for unmatched lines
        const unmatchedLines = invoice.linhas?.filter((l) => !l.produto_id) || [];
        const isPartial = unmatchedLines.length > 0;

        let title = 'Aprovar Fatura';
        let message = 'Confirmar aprovação? Isto irá criar a compra no sistema.';

        if (isPartial) {
            title = 'Aprovação Parcial';
            message = `Existem ${unmatchedLines.length} itens sem correspondência que serão ignorados.\n\nDeseja continuar com a aprovação parcial?`;
        }

        Alert.alert(
            title,
            message,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: isPartial ? 'Aprovar Parcialmente' : 'Aprovar',
                    style: 'default',
                    onPress: async () => {
                        try {
                            setApproving(true);
                            await api.post(`/api/invoices/${id}/approve`);
                            Alert.alert('Sucesso', 'Fatura aprovada com sucesso!', [
                                { text: 'OK', onPress: () => router.back() }
                            ]);
                        } catch (error: any) {
                            Alert.alert('Erro', error?.response?.data?.error || 'Falha ao aprovar');
                        } finally {
                            setApproving(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!invoice) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: theme.colors.text }}>Fatura não encontrada.</Text>
                <Button onPress={() => router.back()}>Voltar</Button>
            </View>
        );
    }

    const providerName = invoice.fornecedor?.nome || invoice.fornecedor_nome || 'Fornecedor Desconhecido';
    const statusColor = getStatusColor(invoice.status);
    const canEdit = invoice.status === 'reviewing' || invoice.status === 'approved_partial';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <IconButton
                    icon="arrow-left"
                    iconColor="white"
                    onPress={() => router.back()}
                />
                <Text style={styles.headerTitle}>Detalhes da Fatura</Text>
                <IconButton
                    icon="file-document-outline"
                    iconColor={theme.colors.primary}
                    onPress={() => handleViewFile(invoice.ficheiro_url)}
                />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Card */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Fornecedor</Text>
                                <Text style={styles.providerValue}>{providerName}</Text>
                                {invoice.fornecedor?.nif && <Text style={styles.nif}>NIF: {invoice.fornecedor.nif}</Text>}
                            </View>
                            <Chip
                                style={{ backgroundColor: statusColor + '20' }}
                                textStyle={{ color: statusColor, fontSize: 12 }}
                            >
                                {getStatusLabel(invoice.status)}
                            </Chip>
                        </View>

                        <Divider style={styles.divider} />

                        <View style={styles.row}>
                            <View>
                                <Text style={styles.label}>Nº Fatura</Text>
                                <Text style={styles.value}>{invoice.numero_fatura || 'N/A'}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.label}>Data</Text>
                                <Text style={styles.value}>{formatDate(invoice.data_fatura)}</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* Totals Card */}
                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.row}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalValue}>{formatCurrency(invoice.total_sem_iva)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.totalLabel}>IVA</Text>
                            <Text style={styles.totalValue}>{formatCurrency(invoice.total_iva)}</Text>
                        </View>
                        <Divider style={styles.divider} />
                        <View style={styles.row}>
                            <Text style={[styles.totalLabel, { fontSize: 18, color: theme.colors.textInverse }]}>Total</Text>
                            <Text style={[styles.totalValue, { fontSize: 24, color: theme.colors.primary }]}>{formatCurrency(invoice.total_com_iva ?? invoice.total_sem_iva)}</Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Lines Section */}
                <Text style={styles.sectionTitle}>Linhas da Fatura ({invoice.linhas?.length || 0})</Text>

                <Card style={[styles.card, { padding: 0 }]}>
                    {(invoice.linhas && invoice.linhas.length > 0) ? (
                        <DataTable>
                            <DataTable.Header>
                                <DataTable.Title style={{ flex: 2 }}><Text style={{ color: theme.colors.textSecondary }}>Descrição</Text></DataTable.Title>
                                <DataTable.Title numeric style={{ flex: 0.8 }}><Text style={{ color: theme.colors.textSecondary }}>Qtd</Text></DataTable.Title>
                                <DataTable.Title numeric style={{ flex: 1.2 }}><Text style={{ color: theme.colors.textSecondary }}>P.Unit</Text></DataTable.Title>
                                <DataTable.Title numeric style={{ flex: 1.2 }}><Text style={{ color: theme.colors.textSecondary }}>Total</Text></DataTable.Title>
                            </DataTable.Header>

                            {invoice.linhas.map((line) => (
                                <DataTable.Row
                                    key={line.id}
                                    onPress={canEdit ? () => router.push({
                                        pathname: "/(tabs)/financial/invoices/match/[lineId]",
                                        params: { lineId: line.id.toString(), invoiceId: id }
                                    }) : undefined}
                                >
                                    <DataTable.Cell style={{ flex: 2 }}>
                                        <View style={{ paddingVertical: 8 }}>
                                            <Text style={styles.lineDesc} numberOfLines={2}>{line.descricao_original}</Text>
                                            {line.produto ? (
                                                <Text style={styles.lineProduct}>✓ {line.produto.nome}</Text>
                                            ) : (
                                                <Text style={[styles.lineProduct, { color: theme.colors.warning }]}>⚠️ Por associar</Text>
                                            )}
                                        </View>
                                    </DataTable.Cell>
                                    <DataTable.Cell numeric style={{ flex: 0.8 }}>
                                        <Text style={styles.cellText}>{line.quantidade}</Text>
                                    </DataTable.Cell>
                                    <DataTable.Cell numeric style={{ flex: 1.2 }}>
                                        <Text style={styles.cellText}>{formatCurrency(line.preco_unitario)}</Text>
                                    </DataTable.Cell>
                                    <DataTable.Cell numeric style={{ flex: 1.2 }}>
                                        <Text style={styles.cellText}>{formatCurrency(line.preco_total)}</Text>
                                    </DataTable.Cell>
                                </DataTable.Row>
                            ))}
                        </DataTable>
                    ) : (
                        <View style={{ padding: spacing.md }}>
                            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>Nenhuma linha detetada.</Text>
                        </View>
                    )}
                </Card>

                {/* Actions Footer */}
                <View style={styles.footer}>
                    {canEdit ? (
                        <Button
                            mode="contained"
                            onPress={handleApprove}
                            loading={approving}
                            style={{ backgroundColor: theme.colors.success, flex: 1 }}
                        >
                            {invoice.status === 'reviewing' ? 'Aprovar Fatura' : 'Concluir Aprovação'}
                        </Button>
                    ) : null}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundDark,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
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
        backgroundColor: theme.colors.backgroundDark, // Match background
    },
    headerTitle: {
        ...typography.h3,
        color: theme.colors.textInverse,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 80,
    },
    card: {
        backgroundColor: theme.colors.surfaceDark,
        marginBottom: spacing.md,
        borderColor: theme.colors.border,
        borderWidth: 1,
    },
    label: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    providerValue: {
        ...typography.h4,
        color: theme.colors.textInverse,
    },
    nif: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    value: {
        fontSize: 16,
        color: theme.colors.textInverse,
    },
    divider: {
        backgroundColor: theme.colors.border,
        marginVertical: spacing.md,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    totalLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    totalValue: {
        fontSize: 16,
        color: theme.colors.textInverse,
        fontWeight: 'bold',
    },
    sectionTitle: {
        ...typography.h4,
        color: theme.colors.textInverse,
        marginBottom: spacing.sm,
        marginLeft: 4,
    },
    lineDesc: {
        color: theme.colors.textInverse,
        fontSize: 14,
    },
    lineProduct: {
        color: theme.colors.primary,
        fontSize: 12,
    },
    cellText: {
        color: theme.colors.textInverse,
    },
    footer: {
        marginTop: spacing.md,
        marginBottom: spacing.xl,
        flexDirection: 'row',
        gap: spacing.md,
    }
});
