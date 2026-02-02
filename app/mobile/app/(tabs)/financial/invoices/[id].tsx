import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Invoice, InvoiceLine, InvoiceStatus } from '../../../../types/invoice';
import InvoiceStatusBadge from '../../../../components/invoices/InvoiceStatusBadge';
import { ApiService } from '../../../../services';
import api from '../../../../lib/api';
import { theme } from '../../../../ui/theme';

export default function InvoiceDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
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
            Alert.alert('Erro', 'Não foi possível carregar os detalhes da fatura');
        } finally {
            setLoading(false);
        }
    };

    const handleViewFile = async (url?: string) => {
        if (!url) {
            Alert.alert('Erro', 'Não há ficheiro associado a esta fatura.');
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
                Alert.alert('Erro', `Não é possível abrir este URL.`);
            }
        } catch (error) {
            console.error('Error opening URL:', error);
            Alert.alert('Erro', 'Erro ao abrir o ficheiro.');
        }
    };

    const handleApprove = async () => {
        Alert.alert(
            'Aprovar Fatura',
            'Tem a certeza que deseja aprovar esta fatura? Isto irá criar uma compra e atualizar os preços.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Aprovar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setApproving(true);
                            await api.post(`/api/invoices/${id}/approve`);
                            Alert.alert('Sucesso', 'Fatura aprovada com sucesso!', [
                                { text: 'OK', onPress: () => router.back() }
                            ]);
                        } catch (error: any) {
                            Alert.alert('Erro', error?.response?.data?.error || 'Falha ao aprovar fatura');
                        } finally {
                            setApproving(false);
                        }
                    }
                }
            ]
        );
    };

    const handleReject = async () => {
        Alert.alert(
            'Rejeitar Fatura',
            'Tem a certeza que deseja rejeitar esta fatura? Esta ação não pode ser desfeita.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Rejeitar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/api/invoices/${id}`);
                            Alert.alert('Sucesso', 'Fatura rejeitada', [
                                { text: 'OK', onPress: () => router.back() }
                            ]);
                        } catch (error) {
                            Alert.alert('Erro', 'Falha ao rejeitar fatura');
                        }
                    }
                }
            ]
        );
    };

    const formatCurrency = (value?: number) => {
        if (!value) return '€0.00';
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('pt-PT');
    };

    if (loading) {
        return (
            <View className="flex-1 bg-slate-900 items-center justify-center">
                <ActivityIndicator size="large" color="#f97316" />
            </View>
        );
    }

    if (!invoice) {
        return (
            <View className="flex-1 bg-slate-900 items-center justify-center p-6">
                <Text className="text-white text-lg">Fatura não encontrada</Text>
            </View>
        );
    }

    const allMatched = invoice.linhas?.every(l => l.status === 'matched') ?? false;
    const canApprove = invoice.status === 'reviewing' && invoice.linhas && invoice.linhas.length > 0;

    return (
        <View className="flex-1 bg-slate-900">
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="p-6 pt-16">
                    <TouchableOpacity onPress={() => router.back()} className="mb-4">
                        <Text className="text-orange-500 text-base">← Voltar</Text>
                    </TouchableOpacity>

                    <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-1">
                            <Text className="text-white text-2xl font-bold mb-2">
                                {invoice.numero_fatura || `Fatura #${invoice.id}`}
                            </Text>
                            <View className="flex-row items-center gap-2">
                                <Text className="text-slate-400 text-sm flex-1" numberOfLines={1}>
                                    {invoice.ficheiro_nome}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => handleViewFile(invoice.ficheiro_url)}
                                    className="bg-slate-700 px-3 py-1 rounded-full flex-row items-center"
                                >
                                    <Text className="text-orange-400 text-xs font-bold mr-1">👁️</Text>
                                    <Text className="text-white text-xs">Ver Original</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <InvoiceStatusBadge status={invoice.status} />
                    </View>

                    {/* Invoice Info */}
                    <View className="bg-slate-800 rounded-xl p-4 mb-4">
                        <View className="flex-row justify-between mb-3">
                            <View>
                                <Text className="text-slate-400 text-xs mb-1">Fornecedor</Text>
                                <Text className="text-white font-semibold">
                                    {invoice.fornecedor_nome || 'N/A'}
                                </Text>
                                {invoice.fornecedor_nif && (
                                    <Text className="text-slate-400 text-xs">NIF: {invoice.fornecedor_nif}</Text>
                                )}
                            </View>
                            <View className="items-end">
                                <Text className="text-slate-400 text-xs mb-1">Data</Text>
                                <Text className="text-white font-semibold">
                                    {formatDate(invoice.data_fatura)}
                                </Text>
                            </View>
                        </View>

                        <View className="border-t border-slate-700 pt-3">
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-slate-400 text-sm">Subtotal</Text>
                                <Text className="text-white">{formatCurrency(invoice.total_sem_iva)}</Text>
                            </View>
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-slate-400 text-sm">IVA</Text>
                                <Text className="text-white">{formatCurrency(invoice.total_iva)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-white font-bold">Total</Text>
                                <Text className="text-orange-500 font-bold text-lg">
                                    {formatCurrency(invoice.total_com_iva)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Line Items */}
                    <Text className="text-white text-lg font-bold mb-3">
                        Linhas da Fatura ({invoice.linhas?.length || 0})
                    </Text>

                    {invoice.linhas && invoice.linhas.length > 0 ? (
                        invoice.linhas.map((line) => (
                            <LineItemCard key={line.id} line={line} invoiceId={invoice.id} />
                        ))
                    ) : (
                        <View className="bg-slate-800 rounded-xl p-6 items-center">
                            <Text className="text-slate-400">Sem linhas processadas</Text>
                        </View>
                    )}
                </View>

                <View className="h-32" />
            </ScrollView>

            {/* Action Buttons */}
            {canApprove && (
                <View className="absolute bottom-0 left-0 right-0 bg-slate-800 p-4 border-t border-slate-700">
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            onPress={handleReject}
                            className="flex-1 bg-red-500 py-3 rounded-lg items-center"
                        >
                            <Text className="text-white font-bold">Rejeitar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleApprove}
                            disabled={approving || !allMatched}
                            className={`flex-1 py-3 rounded-lg items-center ${approving || !allMatched ? 'bg-slate-600' : 'bg-green-500'
                                }`}
                        >
                            <Text className="text-white font-bold">
                                {approving ? 'A Aprovar...' : 'Aprovar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {!allMatched && (
                        <Text className="text-orange-400 text-xs text-center mt-2">
                            Todas as linhas devem estar associadas para aprovar
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
}

// Line Item Component
function LineItemCard({ line, invoiceId }: { line: InvoiceLine; invoiceId: number }) {
    const formatCurrency = (value?: number) => {
        if (!value) return '€0.00';
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const getStatusIcon = () => {
        switch (line.status) {
            case 'matched':
                return '✅';
            case 'manual_review':
                return '⚠️';
            case 'pending':
                return '⏳';
        }
    };

    return (
        <View className="bg-slate-800 rounded-xl p-4 mb-3">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                    <Text className="text-white font-semibold mb-1">
                        Linha {line.linha_numero}
                    </Text>
                    <Text className="text-slate-300 text-sm">{line.descricao_original}</Text>
                </View>
                <Text className="text-2xl ml-2">{getStatusIcon()}</Text>
            </View>

            <View className="flex-row justify-between mt-2">
                <Text className="text-slate-400 text-xs">
                    Qtd: {line.quantidade} {line.unidade}
                </Text>
                <Text className="text-slate-400 text-xs">
                    {formatCurrency(line.preco_unitario)} × {line.quantidade}
                </Text>
                <Text className="text-white font-semibold">
                    {formatCurrency(line.preco_total)}
                </Text>
            </View>

            {line.status === 'matched' && line.produto && (
                <View className="mt-3 pt-3 border-t border-slate-700">
                    <Text className="text-green-400 text-xs mb-1">
                        ✓ Associado a: {line.produto.nome}
                    </Text>
                    {line.variacao && (
                        <Text className="text-slate-400 text-xs">
                            {line.variacao.tipo_unidade_compra} ({line.variacao.unidades_por_compra} {line.produto.unidade_medida})
                        </Text>
                    )}
                    {line.confianca_match && (
                        <Text className="text-slate-400 text-xs">
                            Confiança: {line.confianca_match}%
                        </Text>
                    )}
                </View>
            )}

            {(line.status === 'pending' || line.status === 'manual_review') && (
                <TouchableOpacity
                    className="mt-3 bg-orange-500 py-2 rounded-lg"
                    onPress={() => router.push(`/financial/invoices/match/${line.id}`)}
                >
                    <Text className="text-white text-center font-semibold text-sm">
                        Ver Sugestões
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
