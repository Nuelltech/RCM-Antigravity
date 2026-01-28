import { View, ScrollView, Modal, StyleSheet, Platform, Alert } from 'react-native';
import { Text, Card, Chip, FAB, ActivityIndicator, Portal, Dialog, Button as PaperButton } from 'react-native-paper';
import { useState, useEffect, useCallback } from 'react';
import { Invoice, InvoiceStatus } from '../../../types/invoice';
import InvoiceCard from '../../../components/invoices/InvoiceCard';
import { ApiService, CameraService, FileService } from '../../../services';
import { theme } from '../../../ui/theme';
import { spacing } from '../../../ui/spacing';
import { typography } from '../../../ui/typography';
import { Button } from '../../../components/base';

// Inline test component
function InlineInvoiceCard({ invoice }: { invoice: Invoice }) {
    console.log('[INLINE] Rendering invoice:', invoice.id);
    return (
        <View style={{
            padding: 40,
            marginBottom: 20,
            backgroundColor: '#FF00FF',  // NEON PINK
            borderRadius: 8,
            borderWidth: 5,
            borderColor: '#00FF00',      // NEON GREEN border
            minHeight: 100,
        }}>
            <Text style={{
                fontSize: 28,
                color: '#FFFF00',        // YELLOW text  
                fontWeight: 'bold',
                textAlign: 'center',
            }}>
                🟢 ULTRA TEST #{invoice.id} - {invoice.status} 🟢
            </Text>
        </View>
    );
}

export default function FinancialScreen() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
    const [uploading, setUploading] = useState(false);

    const fetchInvoices = async () => {
        try {
            const params: any = { limit: 50 };
            if (filter !== 'all') {
                params.status = filter;
            }

            const data = await ApiService.getInvoices(params);
            setInvoices(data.invoices || []);
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [filter]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchInvoices();
    }, [filter]);

    const handleUploadPhoto = async () => {
        try {
            setUploading(true);
            setShowUploadDialog(false);

            const photo = await CameraService.takePicture();
            if (photo) {
                await FileService.uploadImage(photo, '/api/invoices/upload');
                Alert.alert(
                    'Upload Concluído',
                    'A fatura está a ser processada.',
                    [{ text: 'OK', onPress: () => fetchInvoices() }]
                );
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha no upload');
        } finally {
            setUploading(false);
        }
    };

    const handleUploadGallery = async () => {
        try {
            setUploading(true);
            setShowUploadDialog(false);

            const photo = await CameraService.pickFromGallery();
            if (photo) {
                await FileService.uploadImage(photo, '/api/invoices/upload');
                Alert.alert(
                    'Upload Concluído',
                    'A fatura está a ser processada.',
                    [{ text: 'OK', onPress: () => fetchInvoices() }]
                );
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha no upload');
        } finally {
            setUploading(false);
        }
    };

    const handleUploadDocument = async () => {
        try {
            setUploading(true);
            setShowUploadDialog(false);

            const pdf = await FileService.pickPDF();
            if (pdf) {
                await FileService.uploadFile(pdf, '/api/invoices/upload');
                Alert.alert(
                    'Upload Concluído',
                    'A fatura está a ser processada.',
                    [{ text: 'OK', onPress: () => fetchInvoices() }]
                );
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha no upload');
        } finally {
            setUploading(false);
        }
    };

    const filters: { label: string; value: InvoiceStatus | 'all' }[] = [
        { label: 'Todas', value: 'all' },
        { label: 'Em Revisão', value: 'reviewing' },
        { label: 'Aprovadas', value: 'approved' },
        { label: 'Aprov. Parcial', value: 'approved_partial' },
        { label: 'A Processar', value: 'processing' },
        { label: 'Com Erro', value: 'error' },
        { label: 'Rejeitadas', value: 'rejected' },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Financeiro</Text>
                <Text style={styles.subtitle}>Gestão de faturas e compras</Text>
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContent}
                >
                    {filters.map((f) => (
                        <Chip
                            key={f.value}
                            selected={filter === f.value}
                            onPress={() => setFilter(f.value)}
                            style={styles.filterChip}
                            showSelectedOverlay
                        >
                            {f.label}
                        </Chip>
                    ))}
                </ScrollView>
            </View>

            {/* Invoice List - TABLE VIEW */}
            <View style={{ flex: 1, padding: spacing.lg }}>
                {loading ? (
                    <View style={styles.emptyContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.emptyText}>A carregar...</Text>
                    </View>
                ) : invoices.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📄</Text>
                        <Text style={styles.emptyTitle}>Sem Faturas</Text>
                        <Text style={styles.emptySubtitle}>
                            Importe a sua primeira fatura para começar
                        </Text>
                    </View>
                ) : (
                    <View style={{
                        backgroundColor: '#1F2937',
                        borderRadius: 12,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#374151',
                    }}>
                        <View style={{ flexDirection: 'row' }}>
                            {/* Fixed Column - Filename */}
                            <View style={{
                                width: 180,
                                backgroundColor: '#1F2937',
                                borderRightWidth: 1,
                                borderRightColor: '#374151',
                                zIndex: 10,
                            }}>
                                {/* Header */}
                                <View style={{
                                    height: 50,
                                    backgroundColor: '#1F2937',
                                    justifyContent: 'center',
                                    paddingHorizontal: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: '#374151',
                                }}>
                                    <Text style={{ color: '#9CA3AF', fontWeight: 'bold', fontSize: 12 }}>
                                        Ficheiro
                                    </Text>
                                </View>

                                {/* Data cells */}
                                {invoices.map((invoice) => (
                                    <View
                                        key={invoice.id}
                                        style={{
                                            height: 50,
                                            justifyContent: 'center',
                                            paddingHorizontal: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: '#374151',
                                        }}
                                    >
                                        <Text style={{ color: '#F9FAFB', fontSize: 13 }} numberOfLines={2}>
                                            {invoice.ficheiro_nome || invoice.numero_fatura || `Fatura #${invoice.id}`}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Scrollable Columns */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                                <View>
                                    {/* Header Row */}
                                    <View style={{ flexDirection: 'row', backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151' }}>
                                        <View style={{ width: 150, height: 50, justifyContent: 'center', paddingHorizontal: 12 }}>
                                            <Text style={{ color: '#9CA3AF', fontWeight: 'bold', fontSize: 12 }}>Fornecedor</Text>
                                        </View>
                                        <View style={{ width: 100, height: 50, justifyContent: 'center', paddingHorizontal: 12 }}>
                                            <Text style={{ color: '#9CA3AF', fontWeight: 'bold', fontSize: 12 }}>Valor</Text>
                                        </View>
                                        <View style={{ width: 100, height: 50, justifyContent: 'center', paddingHorizontal: 12 }}>
                                            <Text style={{ color: '#9CA3AF', fontWeight: 'bold', fontSize: 12 }}>Data</Text>
                                        </View>
                                        <View style={{ width: 120, height: 50, justifyContent: 'center', paddingHorizontal: 12 }}>
                                            <Text style={{ color: '#9CA3AF', fontWeight: 'bold', fontSize: 12 }}>Status</Text>
                                        </View>
                                    </View>

                                    {/* Data Rows */}
                                    {invoices.map((invoice) => {
                                        // Status badge colors
                                        const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
                                            'reviewing': { label: 'Em Revisão', bg: '#3B82F6', text: '#FFFFFF' },
                                            'approved': { label: 'Aprovada', bg: '#10B981', text: '#FFFFFF' },
                                            'approved_partial': { label: 'Aprov. Parcial', bg: '#8B5CF6', text: '#FFFFFF' },
                                            'processing': { label: 'A Processar', bg: '#F59E0B', text: '#FFFFFF' },
                                            'error': { label: 'Com Erro', bg: '#EF4444', text: '#FFFFFF' },
                                            'rejected': { label: 'Rejeitada', bg: '#6B7280', text: '#FFFFFF' },
                                        };
                                        const status = statusConfig[invoice.status] || { label: invoice.status, bg: '#6B7280', text: '#FFFFFF' };

                                        return (
                                            <View key={invoice.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#374151' }}>
                                                {/* Supplier */}
                                                <View style={{ width: 150, height: 50, justifyContent: 'center', paddingHorizontal: 12 }}>
                                                    <Text style={{ color: '#D1D5DB', fontSize: 13 }} numberOfLines={1}>
                                                        {invoice.fornecedor_nome || '-'}
                                                    </Text>
                                                </View>

                                                {/* Amount */}
                                                <View style={{ width: 100, height: 50, justifyContent: 'center', paddingHorizontal: 12 }}>
                                                    <Text style={{ color: '#D1D5DB', fontSize: 13 }}>
                                                        {invoice.total_com_iva ? `€${Number(invoice.total_com_iva).toFixed(2)}` : '-'}
                                                    </Text>
                                                </View>

                                                {/* Date */}
                                                <View style={{ width: 100, height: 50, justifyContent: 'center', paddingHorizontal: 12 }}>
                                                    <Text style={{ color: '#D1D5DB', fontSize: 13 }}>
                                                        {invoice.data_fatura ? new Date(invoice.data_fatura).toLocaleDateString('pt-PT') : '-'}
                                                    </Text>
                                                </View>

                                                {/* Status Badge */}
                                                <View style={{ width: 120, height: 50, justifyContent: 'center', paddingHorizontal: 12 }}>
                                                    <View style={{
                                                        backgroundColor: status.bg,
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 4,
                                                        borderRadius: 12,
                                                        alignSelf: 'flex-start',
                                                    }}>
                                                        <Text style={{ fontSize: 11, color: status.text, fontWeight: '600' }}>
                                                            {status.label}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                )}
            </View>

            {/* Upload Dialog */}
            <Portal>
                <Dialog visible={showUploadDialog} onDismiss={() => setShowUploadDialog(false)}>
                    <Dialog.Title>Importar Fatura</Dialog.Title>
                    <Dialog.Content>
                        <Text>Escolha o método de upload</Text>

                        <Button
                            onPress={handleUploadPhoto}
                            icon="camera"
                            style={styles.dialogButton}
                        >
                            Tirar Foto
                        </Button>

                        <Button
                            onPress={handleUploadGallery}
                            icon="image"
                            variant="outlined"
                            style={styles.dialogButton}
                        >
                            Galeria
                        </Button>

                        <Button
                            onPress={handleUploadDocument}
                            icon="file-pdf-box"
                            variant="outlined"
                            style={styles.dialogButton}
                        >
                            Documento PDF
                        </Button>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <PaperButton onPress={() => setShowUploadDialog(false)}>
                            Cancelar
                        </PaperButton>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Upload FAB */}
            <FAB
                icon={uploading ? 'timer-sand' : 'plus'}
                style={styles.fab}
                onPress={() => setShowUploadDialog(true)}
                disabled={uploading}
                color={theme.colors.textInverse}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundDark,
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
    filterContainer: {
        marginBottom: spacing.md,
    },
    filterContent: {
        flexDirection: 'row',
        paddingHorizontal: 4,
    },
    filterChip: {
        marginRight: spacing.sm,
        backgroundColor: theme.colors.surfaceDark,
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: spacing.lg,
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
        ...typography.h3,
        color: theme.colors.textInverse,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: spacing.md,
    },
    bottomSpace: {
        height: 96,
    },
    dialogButton: {
        marginTop: spacing.md,
    },
    fab: {
        position: 'absolute',
        bottom: 100,
        right: spacing.lg,
        backgroundColor: theme.colors.primary,
    },

});
