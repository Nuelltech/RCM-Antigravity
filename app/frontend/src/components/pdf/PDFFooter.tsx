/**
 * Common PDF Footer Component
 * Used across all PDFs for pagination and branding
 */

import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0', // Slate-200
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    poweredBy: {
        fontSize: 8,
        color: '#94a3b8', // Slate-400
    },
    website: {
        fontSize: 8,
        color: '#f97316', // Orange-500
        fontWeight: 'bold',
    },
    pageNumber: {
        fontSize: 8,
        color: '#64748b', // Slate-500
    },
});

interface PDFFooterProps {
    pageNumber?: number;
    totalPages?: number;
}

export function PDFFooter({ pageNumber, totalPages }: PDFFooterProps) {
    return (
        <View style={styles.footer} fixed>
            <View>
                <Text style={styles.poweredBy}>Gerado por RCM - Restaurant Cost Manager</Text>
                <Text style={styles.website}>www.rcm-app.com</Text>
            </View>
            {pageNumber && totalPages && (
                <Text style={styles.pageNumber}>
                    Página {pageNumber} de {totalPages}
                </Text>
            )}
        </View>
    );
}
