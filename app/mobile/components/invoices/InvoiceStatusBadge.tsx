import { View, Text, StyleSheet } from 'react-native';
import { InvoiceStatus } from '../../types/invoice';

interface InvoiceStatusBadgeProps {
    status: InvoiceStatus;
}

export default function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
    const getStatusConfig = () => {
        switch (status) {
            case 'pending':
                return { label: 'Pendente', bg: '#f3f4f6', text: '#374151', icon: '⏳' };
            case 'processing':
                return { label: 'A Processar', bg: '#dbeafe', text: '#1d4ed8', icon: '⚙️' };
            case 'reviewing':
                return { label: 'Em Revisão', bg: '#ffedd5', text: '#c2410c', icon: 'eye' };
            case 'approved':
                return { label: 'Aprovada', bg: '#dcfce7', text: '#15803d', icon: '✅' };
            case 'approved_partial':
                return { label: 'Aprovada Parcial', bg: '#fef3c7', text: '#b45309', icon: '⚠️' };
            case 'rejected':
                return { label: 'Rejeitada', bg: '#fee2e2', text: '#b91c1c', icon: '🚫' };
            case 'error':
                return { label: 'Erro', bg: '#fee2e2', text: '#b91c1c', icon: '❌' };
            default:
                return { label: 'Desconhecido', bg: '#f3f4f6', text: '#374151', icon: '❓' };
        }
    };

    const config = getStatusConfig();

    return (
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text style={styles.icon}>{config.icon}</Text>
            <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 9999,
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        fontSize: 12,
        marginRight: 4,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    }
});
