/**
 * Dashboard PDF Template - OPTIMIZED
 * Compact layout with logo, sales chart, top items, and critical alerts
 */

import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
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
        marginTop: 12,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 8,
        paddingBottom: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    // COMPACT KPIs - 3 columns
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    kpiCard: {
        width: '32%',
        backgroundColor: '#f8fafc',
        padding: 8,
        borderRadius: 3,
        borderLeftWidth: 2,
        borderLeftColor: '#f97316',
    },
    kpiLabel: {
        fontSize: 7,
        color: '#64748b',
        marginBottom: 2,
    },
    kpiValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    // Sales Chart (simple bars)
    chartContainer: {
        backgroundColor: '#f8fafc',
        padding: 10,
        borderRadius: 4,
    },
    chartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    chartLabel: {
        width: '30%',
        fontSize: 8,
        color: '#475569',
    },
    chartBar: {
        height: 12,
        backgroundColor: '#f97316',
        borderRadius: 2,
    },
    chartValue: {
        marginLeft: 5,
        fontSize: 8,
        color: '#0f172a',
        fontWeight: 'bold',
    },
    // Tables
    table: {
        width: '100%',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        padding: 6,
        borderRadius: 3,
        marginBottom: 3,
    },
    tableRow: {
        flexDirection: 'row',
        padding: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableCell: {
        fontSize: 8,
        color: '#0f172a',
    },
    tableCellHeader: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#475569',
    },
    // Alerts - Compact
    alertItem: {
        flexDirection: 'row',
        padding: 6,
        marginBottom: 4,
        backgroundColor: '#fef2f2',
        borderLeftWidth: 2,
        borderLeftColor: '#ef4444',
        borderRadius: 2,
    },
    alertIcon: {
        fontSize: 10,
        marginRight: 6,
    },
    alertText: {
        flex: 1,
        fontSize: 8,
        color: '#7f1d1d',
    },
    summaryText: {
        fontSize: 8,
        color: '#475569',
        lineHeight: 1.4,
        marginBottom: 3,
    },
});

interface DashboardStats {
    vendasMes: number;
    custoMercadoria: number;
    cmvTeorico: number;
    comprasMes: number;
    custoEstrutura: { valor: number; periodo: string };
}

interface SalesDataPoint {
    date: string;
    value: number;
}

interface TopMenuItem {
    nome: string;
    vendas: number;
    quantidade: number;
    cmv: number;
}

interface Alert {
    titulo?: string;
    mensagem?: string;
    item?: string;
    message?: string;
    severidade: 'alta' | 'media' | 'baixa' | 'high' | 'warning' | 'info';
}

interface DashboardPDFProps {
    restaurantName: string;
    dateRange: { from: string; to: string };
    stats: DashboardStats;
    activeAlerts: number;
    salesData?: SalesDataPoint[];
    topMenuItems?: TopMenuItem[];
    alerts?: Alert[];
    generatedBy?: string;
    logoUrl?: string;
    conclusions?: string;
}

export function DashboardPDF({
    restaurantName,
    dateRange,
    stats,
    activeAlerts,
    salesData = [],
    topMenuItems = [],
    alerts = [],
    generatedBy,
    logoUrl,
    conclusions,
}: DashboardPDFProps) {
    console.log('[DashboardPDF] Rendering with props:', {
        restaurantName,
        dateRange,
        stats,
        activeAlerts,
        salesData,
        topMenuItems,
        alerts,
        generatedBy,
        logoUrl,
    });

    // Validation
    // Validation (Relaxed to allow partial data)
    if (!stats) {
        console.warn('[DashboardPDF] Stats missing, using defaults');
    }

    console.log('[DashboardPDF] Validation passed, generating PDF...');

    const now = new Date();
    const generatedAt = `${now.toLocaleDateString('pt-PT')} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;

    // Calculate max value for chart scaling
    const maxSalesValue = salesData.length > 0
        ? Math.max(...salesData.map(d => d.value))
        : 1;

    // Filter critical alerts only
    const criticalAlerts = alerts
        .filter(a => a.severidade === 'alta')
        .slice(0, 5);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <PDFHeader
                    restaurantName={restaurantName}
                    title="RELATÓRIO DASHBOARD"
                    dateRange={dateRange}
                    generatedBy={generatedBy}
                    generatedAt={generatedAt}
                    logoUrl={logoUrl}
                />

                {/* COMPACT KPIs - 3x2 Grid */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>INDICADORES CHAVE</Text>
                    <View style={styles.kpiGrid}>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiLabel}>Vendas</Text>
                            <Text style={styles.kpiValue}>€ {(stats.vendasMes || 0).toFixed(0)}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiLabel}>CMV</Text>
                            <Text style={styles.kpiValue}>€ {(stats.custoMercadoria || 0).toFixed(0)}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiLabel}>CMV %</Text>
                            <Text style={styles.kpiValue}>{(stats.cmvTeorico || 0).toFixed(1)}%</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiLabel}>Compras</Text>
                            <Text style={styles.kpiValue}>€ {(stats.comprasMes || 0).toFixed(0)}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiLabel}>Custo Estrutura</Text>
                            <Text style={styles.kpiValue}>€ {(stats?.custoEstrutura?.valor || 0).toFixed(0)}</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <Text style={styles.kpiLabel}>Alertas</Text>
                            <Text style={styles.kpiValue}>{activeAlerts}</Text>
                        </View>
                    </View>
                </View>

                {/* Sales Chart - Vertical Histogram */}
                {salesData.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>VENDAS DO PERÍODO</Text>
                        <View style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 1, borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 2 }}>
                            {salesData.map((point, index) => {
                                const heightPercent = maxSalesValue > 0 ? (point.value / maxSalesValue) * 100 : 0;
                                return (
                                    <View key={index} style={{ flexDirection: 'column', alignItems: 'center', width: `${100 / salesData.length}%` }}>
                                        {/* Value Label (only for significant bars or sparsed) */}
                                        {point.value > 0 && (
                                            <Text style={{ fontSize: 4, marginBottom: 1, color: '#64748b' }}>€{Math.round(point.value)}</Text>
                                        )}
                                        <View
                                            style={{
                                                width: '80%',
                                                height: `${Math.max(heightPercent, 1)}%`, // At least 1% to show empty days exist
                                                backgroundColor: point.value > 0 ? '#f97316' : '#e2e8f0',
                                                borderRadius: 1,
                                            }}
                                        />
                                        {/* Date Label (Sparse: every 5 days + first + last) */}
                                        {(index === 0 || index === salesData.length - 1 || index % 5 === 0) ? (
                                            <Text style={{ fontSize: 4, marginTop: 2, color: '#94a3b8' }}>
                                                {point.date.split('-').slice(1).reverse().join('/')}
                                            </Text>
                                        ) : (
                                            <Text style={{ fontSize: 4, marginTop: 2, color: 'transparent' }}>.</Text>
                                        )}
                                    </View>
                                )
                            })}
                        </View>
                    </View>
                )}

                {/* Top Menu Items */}
                {topMenuItems.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>TOP 5 ITENS DO MENU</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCellHeader, { width: '45%' }]}>Item</Text>
                                <Text style={[styles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Qtd</Text>
                                <Text style={[styles.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Vendas</Text>
                                <Text style={[styles.tableCellHeader, { width: '15%', textAlign: 'right' }]}>CMV %</Text>
                            </View>
                            {topMenuItems.slice(0, 5).map((item, index) => (
                                <View key={index} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { width: '45%' }]}>{item.nome || 'Item Desconhecido'}</Text>
                                    <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                                        {item.quantidade || 0}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                                        € {(item.vendas || 0).toFixed(0)}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                                        {(item.cmv || 0).toFixed(1)}%
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Alerts - Show Important (High or Warning) */}
                {(alerts.length > 0) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ALERTAS IMPORTANTES</Text>
                        {/* Sort by severity (high > warning) and take top 5 */}
                        {alerts
                            .sort((a, b) => {
                                const score = (s: string) => (s === 'high' || s === 'alta') ? 2 : ((s === 'warning' || s === 'media') ? 1 : 0);
                                return score(b.severidade) - score(a.severidade);
                            })
                            .slice(0, 5)
                            .map((alert, index) => {
                                const isHigh = alert.severidade === 'alta' || alert.severidade === 'high';
                                const isWarning = alert.severidade === 'media' || alert.severidade === 'warning';
                                return (
                                    <View key={index} style={[styles.alertItem, {
                                        borderLeftColor: isHigh ? '#ef4444' : '#eab308',
                                        backgroundColor: isHigh ? '#fef2f2' : '#fefce8'
                                    }]}>

                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.alertText, { fontWeight: 'bold' }]}>
                                                {alert.titulo || alert.item || 'Alerta'}
                                            </Text>
                                            <Text style={styles.alertText}>
                                                {alert.mensagem || alert.message || 'Sem detalhes'}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                    </View>
                )}

                {/* Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>RESUMO & ANÁLISE</Text>
                    <Text style={styles.summaryText}>
                        • Receita total do período: € {(stats.vendasMes || 0).toFixed(2)}
                    </Text>
                    <Text style={styles.summaryText}>
                        • CMV: {(stats.cmvTeorico || 0).toFixed(1)}% (Margem bruta: {(100 - (stats.cmvTeorico || 0)).toFixed(1)}%)
                    </Text>
                    <Text style={styles.summaryText}>
                        • Total de compras: € {(stats.comprasMes || 0).toFixed(2)}
                    </Text>
                    {topMenuItems.length > 0 && (
                        <Text style={styles.summaryText}>
                            • Item mais vendido: {topMenuItems[0]?.nome} ({topMenuItems[0]?.quantidade} unidades)
                        </Text>
                    )}
                    <Text style={styles.summaryText}>
                        • {activeAlerts} {activeAlerts === 1 ? 'alerta ativo' : 'alertas ativos'} no sistema
                    </Text>
                </View>

                {/* Manager Comments */}
                {conclusions && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>COMENTÁRIO DO GESTOR</Text>
                        <View style={{ backgroundColor: '#fefce8', padding: 8, borderRadius: 2, borderLeftWidth: 2, borderLeftColor: '#ca8a04' }}>
                            <Text style={{ fontSize: 9, color: '#422006', lineHeight: 1.5 }}>
                                {conclusions}
                            </Text>
                        </View>
                    </View>
                )}

                <PDFFooter pageNumber={1} totalPages={1} />
            </Page>
        </Document>
    );
}
