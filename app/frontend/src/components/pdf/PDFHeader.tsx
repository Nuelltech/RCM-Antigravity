/**
 * Common PDF Header Component
 * Used across all PDFs for consistent branding
 */

import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    header: {
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: '#f97316', // Orange-500
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    logoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logo: {
        width: 40,
        height: 40,
    },
    rcmText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a', // Slate-900
    },
    rcmSubtext: {
        fontSize: 8,
        color: '#64748b', // Slate-500
    },
    restaurantName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'right',
    },
    titleSection: {
        backgroundColor: '#fff7ed', // Orange-50
        padding: 8,
        borderRadius: 4,
        marginTop: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f97316', // Orange-500
        textAlign: 'center',
    },
    dateRange: {
        fontSize: 10,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 4,
    },
    generatedInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 8,
        color: '#94a3b8', // Slate-400
        marginTop: 5,
    },
});

interface PDFHeaderProps {
    restaurantName: string;
    title: string;
    dateRange?: {
        from: string;
        to: string;
    };
    generatedBy?: string;
    generatedAt?: string;
    logoUrl?: string;
}

export function PDFHeader({
    restaurantName,
    title,
    dateRange,
    generatedBy,
    generatedAt,
    logoUrl,
}: PDFHeaderProps) {
    return (
        <View style={styles.header}>
            {/* Top Section - Logo & Restaurant */}
            <View style={styles.headerTop}>
                <View style={styles.logoSection}>
                    {/* Prevent Image Load Error - Forcing Text Fallback */}
                    {/* {logoUrl ? (
                        <Image src={logoUrl} style={styles.logo} />
                    ) : ( */}
                    <View>
                        <Text style={styles.rcmText}>RCM</Text>
                        <Text style={styles.rcmSubtext}>Restaurant Cost Manager</Text>
                    </View>
                    {/* )} */}
                </View>
                <Text style={styles.restaurantName}>{restaurantName}</Text>
            </View>

            {/* Title Section */}
            <View style={styles.titleSection}>
                <Text style={styles.title}>{title}</Text>
                {dateRange && (
                    <Text style={styles.dateRange}>
                        Período: {dateRange.from} até {dateRange.to}
                    </Text>
                )}
            </View>

            {/* Generation Info */}
            {(generatedBy || generatedAt) && (
                <View style={styles.generatedInfo}>
                    {generatedBy && <Text>Gerado por: {generatedBy}</Text>}
                    {generatedAt && <Text>Data: {generatedAt}</Text>}
                </View>
            )}
        </View>
    );
}
