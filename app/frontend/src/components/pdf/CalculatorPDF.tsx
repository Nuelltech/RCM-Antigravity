/**
 * Calculator PDF Template
 * Generates purchase requirements report with production plan
 */

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PDFHeader } from './PDFHeader';
import { PDFFooter } from './PDFFooter';

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#0f172a',
        backgroundColor: '#ffffff',
    },
    section: {
        marginTop: 15,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        textTransform: 'uppercase',
    },
    // Summary Blocks
    summaryGrid: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    summaryCard: {
        flex: 1,
        padding: 12,
        borderRadius: 4,
        borderWidth: 1,
    },
    summaryLabel: {
        fontSize: 9,
        color: '#64748b',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Tables
    table: {
        width: '100%',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        padding: 8,
        borderRadius: 4,
        marginBottom: 5,
    },
    tableRow: {
        flexDirection: 'row',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableCell: {
        fontSize: 9,
        color: '#0f172a',
    },
    tableCellHeader: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#475569',
    },
    badge: {
        fontSize: 7,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 2,
        backgroundColor: '#e2e8f0',
        color: '#475569',
        textTransform: 'uppercase',
        marginTop: 2,
        width: 60,
        textAlign: 'center',
    },
});

interface SimulationItem {
    tipo: 'receita' | 'combo' | 'formato_venda';
    nome: string;
    quantidade: number;
}

interface SimulationResult {
    total_itens: number;
    custo_total: number;
    consumos: {
        codigo: string;
        nome: string;
        unidade_medida: string;
        quantidade_consumida: number;
        preco_unitario: number;
        custo_total: number;
    }[];
}

interface CalculatorPDFProps {
    restaurantName: string;
    generatedBy?: string;
    logoUrl?: string;
    plannedItems: SimulationItem[];
    simulationResult: SimulationResult;
}

const getTipoLabel = (tipo: string) => {
    switch (tipo) {
        case 'receita': return 'Receita';
        case 'combo': return 'Combo';
        case 'formato_venda': return 'Produto';
        default: return tipo;
    }
};

export function CalculatorPDF({ restaurantName, generatedBy, logoUrl, plannedItems, simulationResult }: CalculatorPDFProps) {
    const now = new Date();
    const generatedAt = `${now.toLocaleDateString('pt-PT')} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <PDFHeader
                    restaurantName={restaurantName}
                    title="CALCULADORA DE COMPRAS"
                    generatedBy={generatedBy}
                    generatedAt={generatedAt}
                    logoUrl={logoUrl}
                />

                {/* Summary Blocks */}
                <View style={styles.summaryGrid}>
                    <View style={[styles.summaryCard, { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}>
                        <Text style={styles.summaryLabel}>Custo Total Estimado</Text>
                        <Text style={[styles.summaryValue, { color: '#ea580c' }]}>
                            € {simulationResult.custo_total.toFixed(2)}
                        </Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                        <Text style={styles.summaryLabel}>Itens Planeados</Text>
                        <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
                            {plannedItems.length}
                        </Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
                        <Text style={styles.summaryLabel}>Total de Ingredientes</Text>
                        <Text style={[styles.summaryValue, { color: '#2563eb' }]}>
                            {simulationResult.consumos.length}
                        </Text>
                    </View>
                </View>

                {/* Production Plan Table */}
                {plannedItems && plannedItems.length > 0 && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>Plano de Produção</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCellHeader, { width: '60%' }]}>Item a Produzir</Text>
                                <Text style={[styles.tableCellHeader, { width: '20%', textAlign: 'center' }]}>Tipo</Text>
                                <Text style={[styles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Qtd Planeada</Text>
                            </View>
                            {plannedItems.map((item, index) => (
                                <View key={index} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { width: '60%', fontWeight: 'bold' }]}>{item.nome}</Text>
                                    <View style={{ width: '20%', alignItems: 'center' }}>
                                        <Text style={styles.badge}>{getTipoLabel(item.tipo)}</Text>
                                    </View>
                                    <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                                        {Number(item.quantidade)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Ingredients/Shopping List Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Necessidades de Compra</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableCellHeader, { width: '50%' }]}>Produto</Text>
                            <Text style={[styles.tableCellHeader, { width: '25%', textAlign: 'right' }]}>Qtd. Necessária</Text>
                            <Text style={[styles.tableCellHeader, { width: '25%', textAlign: 'right' }]}>Custo Estimado</Text>
                        </View>
                        {simulationResult.consumos.map((item, index) => (
                            <View key={index} style={styles.tableRow} wrap={false}>
                                <View style={{ width: '50%' }}>
                                    <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{item.nome}</Text>
                                    <Text style={{ fontSize: 7, color: '#94a3b8', marginTop: 1 }}>Código: {item.codigo}</Text>
                                </View>
                                <Text style={[styles.tableCell, { width: '25%', textAlign: 'right', fontFamily: 'Courier' }]}>
                                    {Number(item.quantidade_consumida).toFixed(3)} {item.unidade_medida}
                                </Text>
                                <Text style={[styles.tableCell, { width: '25%', textAlign: 'right', color: '#64748b' }]}>
                                    € {Number(item.custo_total).toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                <PDFFooter pageNumber={1} totalPages={1} />
            </Page>
        </Document>
    );
}
