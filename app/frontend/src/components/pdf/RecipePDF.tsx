/**
 * Recipe PDF Template
 * Generates technical sheet for recipes with ingredients and preparation steps
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
        marginTop: 15,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 4,
    },
    infoItem: {
        width: '48%',
    },
    infoLabel: {
        fontSize: 8,
        color: '#64748b',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    costHighlight: {
        backgroundColor: '#fff7ed', // Orange-50
        padding: 10,
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#f97316',
        marginTop: 10,
    },
    costRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    costLabel: {
        fontSize: 10,
        color: '#0f172a',
    },
    costValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#f97316',
    },
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
    stepsList: {
        paddingLeft: 10,
    },
    stepItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    stepNumber: {
        width: 20,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#f97316',
    },
    stepText: {
        flex: 1,
        fontSize: 9,
        color: '#475569',
        lineHeight: 1.4,
    },
    notes: {
        backgroundColor: '#fef3c7', // Amber-100
        padding: 10,
        borderRadius: 4,
        marginTop: 5,
    },
    notesText: {
        fontSize: 8,
        color: '#78350f', // Amber-900
        lineHeight: 1.4,
    },
});

interface Ingredient {
    produto_codigo: string;
    produto_nome: string;
    quantidade_bruta: number;
    quantidade_liquida: number;
    rentabilidade: number;
    unidade_medida: string;
    preco_unitario: number;
    custo_total: number;
    notas?: string;
}

interface RecipePDFProps {
    restaurantName: string;
    recipe: {
        codigo: string;
        nome: string;
        categoria: string;
        tipo?: string;
        dificuldade?: string;
        porcoes: number;
        tempo_preparo?: number;
        quantidade_produzida?: number;
        unidade_produzida?: string;
        custo_total: number;
        custo_por_porcao?: number;
        pvp_sugerido?: number;
        cmv_percentual?: number;
        margem?: number;
        ingredientes: Ingredient[];
        prePreparos?: PrePreparo[];
        modo_preparo?: string;
        alergenos?: string[];
        notas?: string;
    };
    generatedBy?: string;
    logoUrl?: string;
    imageUrl?: string;
}

interface PrePreparo {
    nome: string;
    quantidade: number;
    unidade: string;
    custo_porcao: number;
    custo_total: number;
}

export function RecipePDF({ restaurantName, recipe, generatedBy, logoUrl, imageUrl }: RecipePDFProps) {
    const now = new Date();
    const generatedAt = `${now.toLocaleDateString('pt-PT')} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;

    // Parse preparation steps
    const steps = recipe.modo_preparo
        ? recipe.modo_preparo.split('\n').filter(step => step.trim())
        : [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <PDFHeader
                    restaurantName={restaurantName}
                    title="FICHA TÉCNICA"
                    generatedBy={generatedBy}
                    generatedAt={generatedAt}
                    logoUrl={logoUrl}
                />

                {/* Recipe Title & Basic Info */}
                <View style={{ marginBottom: 15 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 5 }}>
                                {recipe.nome}
                            </Text>
                            <Text style={{ fontSize: 10, color: '#64748b' }}>
                                Código: {recipe.codigo} • Categoria: {recipe.categoria}
                            </Text>
                        </View>
                        {!!recipe.tipo && (
                            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#475569' }}>{recipe.tipo}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Recipe Image */}
                {imageUrl && (
                    <View style={{ marginBottom: 15, height: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 4 }}>
                        <Image
                            src={imageUrl}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </View>
                )}

                {/* General Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>INFORMAÇÃO GERAL</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Porções</Text>
                            <Text style={styles.infoValue}>{recipe.porcoes} dose{recipe.porcoes > 1 ? 's' : ''}</Text>
                        </View>
                        {!!recipe.tempo_preparo && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Tempo de Preparação</Text>
                                <Text style={styles.infoValue}>{recipe.tempo_preparo} min</Text>
                            </View>
                        )}
                        {!!recipe.quantidade_produzida && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Qtd. Produzida</Text>
                                <Text style={styles.infoValue}>{recipe.quantidade_produzida} {recipe.unidade_produzida || ''}</Text>
                            </View>
                        )}
                        {!!recipe.dificuldade && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Dificuldade</Text>
                                <Text style={styles.infoValue}>{recipe.dificuldade}</Text>
                            </View>
                        )}
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Custo Total</Text>
                            <Text style={styles.infoValue}>€ {(recipe.custo_total || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Custo por Dose</Text>
                            <Text style={styles.infoValue}>€ {(recipe.custo_por_porcao || 0).toFixed(2)}</Text>
                        </View>
                    </View>

                    {/* Cost Highlight */}
                    {recipe.cmv_percentual !== undefined && recipe.margem !== undefined && (
                        <View style={styles.costHighlight}>
                            <View style={styles.costRow}>
                                <Text style={styles.costLabel}>CMV %</Text>
                                <Text style={styles.costValue}>{(recipe.cmv_percentual || 0).toFixed(1)}%</Text>
                            </View>
                            <View style={styles.costRow}>
                                <Text style={styles.costLabel}>Margem</Text>
                                <Text style={styles.costValue}>€ {(recipe.margem || 0).toFixed(2)} ({(100 - (recipe.cmv_percentual || 0)).toFixed(1)}%)</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Ingredients Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>INGREDIENTES</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableCellHeader, { width: '25%' }]}>Produto</Text>
                            <Text style={[styles.tableCellHeader, { width: '9%', textAlign: 'right' }]}>Qtd Bruta</Text>
                            <Text style={[styles.tableCellHeader, { width: '9%', textAlign: 'right' }]}>Qtd Líq.</Text>
                            <Text style={[styles.tableCellHeader, { width: '9%', textAlign: 'right' }]}>Rent.</Text>
                            <Text style={[styles.tableCellHeader, { width: '6%', textAlign: 'center' }]}>Unid.</Text>
                            <Text style={[styles.tableCellHeader, { width: '10%', textAlign: 'right' }]}>Custo</Text>
                            <Text style={[styles.tableCellHeader, { width: '32%', paddingLeft: 5 }]}>Notas</Text>
                        </View>
                        {recipe.ingredientes.map((ing, index) => (
                            <View key={index} style={styles.tableRow} wrap={false}>
                                <Text style={[styles.tableCell, { width: '25%' }]}>{ing.produto_nome || 'N/A'}</Text>
                                <Text style={[styles.tableCell, { width: '9%', textAlign: 'right' }]}>
                                    {Number(ing.quantidade_bruta).toFixed(3)}
                                </Text>
                                <Text style={[styles.tableCell, { width: '9%', textAlign: 'right' }]}>
                                    {Number(ing.quantidade_liquida).toFixed(3)}
                                </Text>
                                <Text style={[styles.tableCell, { width: '9%', textAlign: 'right' }]}>
                                    {ing.rentabilidade > 0 ? `${ing.rentabilidade.toFixed(1)}%` : '-'}
                                </Text>
                                <Text style={[styles.tableCell, { width: '6%', textAlign: 'center' }]}>
                                    {ing.unidade_medida || 'un'}
                                </Text>
                                <Text style={[styles.tableCell, { width: '10%', textAlign: 'right', fontWeight: 'medium' }]}>
                                    €{(ing.custo_total || 0).toFixed(2)}
                                </Text>
                                <Text style={[styles.tableCell, { width: '32%', color: '#64748b', fontSize: 8, paddingLeft: 5 }]}>
                                    {ing.notas || '-'}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Pre-Preparations Table */}
                {!!recipe.prePreparos && recipe.prePreparos.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>PRÉ-PREPAROS</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCellHeader, { width: '45%' }]}>Nome</Text>
                                <Text style={[styles.tableCellHeader, { width: '15%', textAlign: 'right' }]}>Qtd</Text>
                                <Text style={[styles.tableCellHeader, { width: '10%', textAlign: 'center' }]}>Unid.</Text>
                                <Text style={[styles.tableCellHeader, { width: '15%', textAlign: 'right' }]}>Custo Porção</Text>
                                <Text style={[styles.tableCellHeader, { width: '15%', textAlign: 'right' }]}>Custo Total</Text>
                            </View>
                            {recipe.prePreparos.map((pp, index) => (
                                <View key={index} style={styles.tableRow} wrap={false}>
                                    <Text style={[styles.tableCell, { width: '45%' }]}>{pp.nome}</Text>
                                    <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                                        {pp.quantidade}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{pp.unidade}</Text>
                                    <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                                        €{(pp.custo_porcao || 0).toFixed(2)}
                                    </Text>
                                    <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                                        €{(pp.custo_total || 0).toFixed(2)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Total Cost Summary */}
                <View style={[styles.section, { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5 }]} wrap={false}>
                    <View style={{ width: '40%', backgroundColor: '#f1f5f9', padding: 10, borderRadius: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>CUSTO TOTAL DA RECEITA</Text>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#f97316' }}>
                                €{(recipe.custo_total || 0).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Preparation Method */}
                {steps.length > 0 && (
                    <View style={styles.section} break={steps.length > 5}>
                        <Text style={styles.sectionTitle}>MODO DE PREPARAÇÃO</Text>
                        <View style={styles.stepsList}>
                            {steps.map((step, index) => (
                                <View key={index} style={styles.stepItem} wrap={false}>
                                    <Text style={styles.stepNumber}>{index + 1}.</Text>
                                    <Text style={styles.stepText}>{step}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Allergens */}
                {!!recipe.alergenos && recipe.alergenos.length > 0 && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>ALERGÉNIOS</Text>
                        <Text style={{ fontSize: 10, color: '#0f172a' }}>
                            {recipe.alergenos.join(' • ')}
                        </Text>
                    </View>
                )}

                {/* Notes */}
                {!!recipe.notas && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>NOTAS</Text>
                        <View style={styles.notes}>
                            <Text style={styles.notesText}>{recipe.notas}</Text>
                        </View>
                    </View>
                )}

                <PDFFooter pageNumber={1} totalPages={1} />
            </Page>
        </Document>
    );
}
