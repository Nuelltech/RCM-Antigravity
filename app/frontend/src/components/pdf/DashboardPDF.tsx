/**
 * Dashboard PDF Template - V2
 * Clean, modern layout matching the web dashboard aesthetics.
 * Includes vectorial line charts and comprehensive grids.
 */

import { Document, Page, View, Text, StyleSheet, Svg, Polyline, Polygon, Line, Circle } from '@react-pdf/renderer';
import { PDFHeader } from './PDFHeader';
import { PDFFooter } from './PDFFooter';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#0f172a',
        backgroundColor: '#ffffff',
    },
    section: {
        marginTop: 15,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    // ---- KPIs Grid ----
    kpiGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    kpiCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    kpiCardLast: {
        marginRight: 0,
    },
    kpiLabel: {
        fontSize: 8,
        color: '#64748b',
        marginBottom: 4,
    },
    kpiValue: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
        marginBottom: 2,
    },
    kpiSubtext: {
        fontSize: 6,
        color: '#94a3b8',
    },
    // ---- Hemorragia Alert ----
    hemoCard: {
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
        borderRadius: 6,
        padding: 12,
        marginTop: 4,
    },
    hemoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    hemoTitle: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#9f1239', // Rose-800
    },
    hemoSubtitle: {
        fontSize: 8,
        color: '#be123c',
        marginTop: 2,
    },
    hemoMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    hemoMetricCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderRadius: 4,
        padding: 8,
        marginRight: 8,
    },
    // ---- Chart ----
    chartContainer: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 6,
        padding: 15,
        height: 160,
        marginTop: 5,
    },
    // ---- Tables (Bottom) ----
    tablesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        gap: 15,
    },
    tableColumn: {
        flex: 1,
    },
    tableBox: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        padding: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tableHeaderCell: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#475569',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableCell: {
        fontSize: 8,
        color: '#1e293b',
    },
    // ---- Compact Alerts inside Table ----
    alertIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
});

interface DashboardStats {
    vendasMes: number;
    custoMercadoria: number;
    cmvTeorico: number;
    comprasMes: number;
    custoEstrutura: { valor: number; periodo: string };
    taxaOcupacao: number;
    lucroBruto: number;
}

interface SalesDataPoint {
    date: string;
    value: number;    // vendas
    custos?: number;  // custos totais
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

interface CmvResumo {
    totalPerdido: number;
    totalGanho: number;
    saldoLiquido: number;
    numItensPerda: number;
    numItensCritico: number;
    numItensCatastrofe: number;
    cmvTarget: number;
}

interface DashboardPDFProps {
    restaurantName: string;
    dateRange: { from: string; to: string };
    stats: DashboardStats;
    activeAlerts: number;
    salesData?: SalesDataPoint[];
    topMenuItems?: TopMenuItem[];
    alerts?: Alert[];
    hemorragiaData?: CmvResumo;
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
    hemorragiaData,
    generatedBy,
    logoUrl,
    conclusions,
}: DashboardPDFProps) {
    const now = new Date();
    const generatedAt = `${now.toLocaleDateString('pt-PT')} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;

    // Fallbacks
    const s = stats || {
        vendasMes: 0, custoMercadoria: 0, cmvTeorico: 0, comprasMes: 0,
        custoEstrutura: { valor: 0, periodo: 'mês' }, taxaOcupacao: 0, lucroBruto: 0
    };

    // Chart Vectorial Math
    const chartHeight = 100;
    const chartWidth = 470; // Printable width approx
    const maxScale = salesData.length > 0
        ? Math.max(...salesData.map(d => d.value || 0), ...salesData.map(d => d.custos || 0), 10)
        : 100;

    let polylinePoints = "";
    let polygonPoints = `0,${chartHeight} `;
    let costPolylinePoints = "";

    if (salesData.length > 0) {
        const stepX = chartWidth / Math.max(salesData.length - 1, 1);
        salesData.forEach((d, i) => {
            const x = i * stepX;
            const y = chartHeight - (((d.value || 0) / maxScale) * chartHeight);
            const yCost = chartHeight - (((d.custos || 0) / maxScale) * chartHeight);
            const point = `${x.toFixed(1)},${y.toFixed(1)} `;
            polylinePoints += point;
            polygonPoints += point;
            costPolylinePoints += `${x.toFixed(1)},${yCost.toFixed(1)} `;
        });
        polygonPoints += `${chartWidth},${chartHeight}`;
    }

    // Identify Hemorragia Severity
    const isCriticalHemo = hemorragiaData && (hemorragiaData.numItensCritico + hemorragiaData.numItensCatastrofe) > 0;

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

                {/* --- SECT: KPIs ROW 1 --- */}
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Vendas</Text>
                        <Text style={styles.kpiValue}>€ {(s.vendasMes || 0).toFixed(2)}</Text>
                        <Text style={styles.kpiSubtext}>No período selecionado</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>CMV Atual</Text>
                        <Text style={styles.kpiValue}>€ {(s.custoMercadoria || 0).toFixed(2)}</Text>
                        <Text style={styles.kpiSubtext}>Custo de mercadorias</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>CMV %</Text>
                        <Text style={styles.kpiValue}>{(s.cmvTeorico || 0).toFixed(1)}%</Text>
                        <Text style={styles.kpiSubtext}>Da receita total</Text>
                    </View>
                    <View style={[styles.kpiCard, styles.kpiCardLast]}>
                        <Text style={styles.kpiLabel}>Compras</Text>
                        <Text style={styles.kpiValue}>€ {(s.comprasMes || 0).toFixed(2)}</Text>
                        <Text style={styles.kpiSubtext}>Gasto total em janela</Text>
                    </View>
                </View>

                {/* --- SECT: KPIs ROW 2 --- */}
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Custo de Estrutura</Text>
                        <Text style={styles.kpiValue}>€ {(s.custoEstrutura?.valor || 0).toFixed(2)}</Text>
                        <Text style={styles.kpiSubtext}>Proporcional</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Taxa de Ocupação</Text>
                        <Text style={styles.kpiValue}>{(s.taxaOcupacao || 0).toFixed(1)}%</Text>
                        <Text style={styles.kpiSubtext}>Eficiência sala</Text>
                    </View>
                    <View style={[styles.kpiCard, styles.kpiCardLast]}>
                        <Text style={styles.kpiLabel}>Lucro Bruto</Text>
                        <Text style={[styles.kpiValue, { color: (s.lucroBruto || 0) >= 0 ? '#16a34a' : '#dc2626' }]}>
                            € {(s.lucroBruto || 0).toFixed(2)}
                        </Text>
                        <Text style={styles.kpiSubtext}>Vendas - CMV - Estrutura</Text>
                    </View>
                </View>

                {/* --- SECT: HEMORRAGIA FINANCEIRA --- */}
                {hemorragiaData && (
                    <View style={[styles.hemoCard, { backgroundColor: isCriticalHemo ? '#fef2f2' : '#fffbeb', borderColor: isCriticalHemo ? '#fecaca' : '#fef08a' }]}>
                        <View style={styles.hemoHeader}>
                            <View>
                                <Text style={[styles.hemoTitle, { color: isCriticalHemo ? '#991b1b' : '#b45309' }]}>
                                    Hemorragia Financeira
                                </Text>
                                <Text style={[styles.hemoSubtitle, { color: isCriticalHemo ? '#b91c1c' : '#d97706' }]}>
                                    Impacto dos pratos acima do CMV target ({hemorragiaData.cmvTarget || 30}%)
                                </Text>
                            </View>
                        </View>

                        <View style={styles.hemoMetricsRow}>
                            <View style={[styles.hemoMetricCard, { borderColor: '#fecaca' }]}>
                                <Text style={styles.kpiLabel}>A perder</Text>
                                <Text style={[styles.kpiValue, { color: '#dc2626' }]}>-{(hemorragiaData.totalPerdido || 0).toFixed(2)}€</Text>
                                <Text style={styles.kpiSubtext}>no período</Text>
                            </View>
                            <View style={[styles.hemoMetricCard, { borderColor: '#fed7aa' }]}>
                                <Text style={styles.kpiLabel}>Pratos críticos</Text>
                                <Text style={[styles.kpiValue, { color: '#ea580c' }]}>{hemorragiaData.numItensPerda || 0}</Text>
                                <Text style={styles.kpiSubtext}>acima do target</Text>
                            </View>
                            <View style={[styles.hemoMetricCard, { borderColor: '#bbf7d0' }]}>
                                <Text style={styles.kpiLabel}>A ganhar</Text>
                                <Text style={[styles.kpiValue, { color: '#16a34a' }]}>+{(hemorragiaData.totalGanho || 0).toFixed(2)}€</Text>
                                <Text style={styles.kpiSubtext}>no período</Text>
                            </View>
                            <View style={[styles.hemoMetricCard, styles.kpiCardLast, { borderColor: (hemorragiaData.saldoLiquido || 0) >= 0 ? '#bbf7d0' : '#fecaca' }]}>
                                <Text style={styles.kpiLabel}>Saldo líquido</Text>
                                <Text style={[styles.kpiValue, { color: (hemorragiaData.saldoLiquido || 0) >= 0 ? '#16a34a' : '#dc2626' }]}>
                                    {(hemorragiaData.saldoLiquido || 0) >= 0 ? '+' : ''}{(hemorragiaData.saldoLiquido || 0).toFixed(2)}€
                                </Text>
                                <Text style={styles.kpiSubtext}>ganho - perda</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* --- SECT: CHART --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Evolução de Vendas vs Custos</Text>
                    <View style={styles.chartContainer}>
                        {salesData.length > 0 ? (
                            <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                                {/* Grid Lines */}
                                <Line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#cbd5e1" strokeWidth="1" />
                                <Line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#f1f5f9" strokeWidth="1" />
                                <Line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#f1f5f9" strokeWidth="1" />

                                {/* Vendas Area Fill */}
                                <Polygon points={polygonPoints} fill="#dbeafe" opacity={0.5} />

                                {/* Vendas Line (blue) */}
                                <Polyline points={polylinePoints} stroke="#2563eb" strokeWidth="2" fill="none" />

                                {/* Custos Line (red) */}
                                {costPolylinePoints.length > 0 && (
                                    <Polyline points={costPolylinePoints} stroke="#ef4444" strokeWidth="1.5" fill="none" />
                                )}

                                {/* Data Points - sparse circles for vendas */}
                                {salesData
                                    .filter((_, i) => i === 0 || i === salesData.length - 1 || i % Math.max(1, Math.floor(salesData.length / 8)) === 0)
                                    .map((d, i) => {
                                        const origIdx = salesData.indexOf(d);
                                        const x = origIdx * (chartWidth / Math.max(salesData.length - 1, 1));
                                        const y = chartHeight - (((d.value || 0) / maxScale) * chartHeight);
                                        return <Circle key={i} cx={x} cy={y} r="2" fill="#1d4ed8" />;
                                    })
                                }
                            </Svg>
                        ) : (
                            <Text style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>Sem dados de vendas para o período.</Text>
                        )}
                        {/* X axis labels + legend */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingHorizontal: 2 }}>
                            {salesData.length > 0 && (
                                <>
                                    <Text style={{ fontSize: 6, color: '#94a3b8' }}>{salesData[0]?.date?.split('-').slice(1).reverse().join('/') || ''}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 8, height: 2, backgroundColor: '#2563eb', marginRight: 2 }} />
                                        <Text style={{ fontSize: 6, color: '#94a3b8', marginRight: 8 }}>Vendas</Text>
                                        <View style={{ width: 8, height: 2, backgroundColor: '#ef4444', marginRight: 2 }} />
                                        <Text style={{ fontSize: 6, color: '#94a3b8' }}>Custos</Text>
                                    </View>
                                    <Text style={{ fontSize: 6, color: '#94a3b8' }}>{salesData[salesData.length - 1]?.date?.split('-').slice(1).reverse().join('/') || ''}</Text>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* --- SECT: ALERTAS --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Alertas do Sistema ({activeAlerts})</Text>
                    <View style={styles.tableBox}>
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.tableHeaderCell, { width: '80%' }]}>Descrição</Text>
                            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'center' }]}>Nível</Text>
                        </View>
                        {alerts.length === 0 ? (
                            <View style={styles.tableRow}><Text style={styles.tableCell}>Sem alertas críticos.</Text></View>
                        ) : (
                            alerts.slice(0, 8).map((alert, i) => {
                                const isRed = alert.severidade === 'alta' || alert.severidade === 'high';
                                return (
                                    <View key={i} style={styles.tableRow}>
                                        <View style={{ width: '80%', flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={[styles.alertIndicator, { backgroundColor: isRed ? '#ef4444' : '#f59e0b' }]} />
                                            <Text style={[styles.tableCell, { width: '90%' }]}>
                                                {alert.titulo || alert.item || alert.mensagem || 'Alerta'}
                                            </Text>
                                        </View>
                                        <Text style={[styles.tableCell, { width: '20%', textAlign: 'center', color: isRed ? '#ef4444' : '#f59e0b' }]}>
                                            {isRed ? 'Alto' : 'Médio'}
                                        </Text>
                                    </View>
                                )
                            })
                        )}
                    </View>
                </View>

                {/* --- SECT: TOP PRODUTOS --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top 5 Produtos Menu</Text>
                    <View style={styles.tableBox}>
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Produto</Text>
                            <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Qtd</Text>
                            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Receita</Text>
                            <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>CMV</Text>
                        </View>
                        {topMenuItems.length === 0 ? (
                            <View style={styles.tableRow}><Text style={styles.tableCell}>Sem dados de vendas.</Text></View>
                        ) : (
                            topMenuItems.slice(0, 5).map((item, i) => (
                                <View key={i} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, { width: '50%', fontFamily: 'Helvetica-Bold' }]}>
                                        {item.nome}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>{item.quantidade}</Text>
                                    <Text style={[styles.tableCell, { width: '20%', textAlign: 'right', color: '#16a34a' }]}>
                                        €{(item.vendas || 0).toFixed(0)}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '15%', textAlign: 'right', color: '#dc2626' }]}>
                                        {(item.cmv || 0).toFixed(1)}%
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {conclusions && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Conclusões e Notas do Gestor</Text>
                        <View style={[styles.tableBox, { padding: 10, backgroundColor: '#f8fafc' }]}>
                            <Text style={{ fontSize: 9, color: '#334155', lineHeight: 1.4 }}>
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
