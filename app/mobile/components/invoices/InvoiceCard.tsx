import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Invoice } from '../../types/invoice';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import { router } from 'expo-router';
import { theme } from '../../ui/theme';

// Force reload: 2026-01-13T20:23:00Z
console.log('[InvoiceCard MODULE] Loading InvoiceCard component module');

interface InvoiceCardProps {
    invoice: Invoice;
}

export default function InvoiceCard({ invoice }: InvoiceCardProps) {
    console.log('[InvoiceCard] START Rendering invoice:', invoice?.id, invoice?.status);

    try {
        const result = (
            <View style={styles.card}>
                <Text style={styles.testText}>
                    TEST INVOICE #{invoice?.id || 'N/A'} - {invoice?.status || 'N/A'}
                </Text>
            </View>
        );
        console.log('[InvoiceCard] END Successfully created JSX');
        return result;
    } catch (error) {
        console.error('[InvoiceCard] ERROR during render:', error);
        return (
            <View style={{ padding: 20, backgroundColor: 'red' }}>
                <Text style={{ color: 'white' }}>ERROR: {String(error)}</Text>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minHeight: 50,
    },
    testText: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '600',
    },
});
