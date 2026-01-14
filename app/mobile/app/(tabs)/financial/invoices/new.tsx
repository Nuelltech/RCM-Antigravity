import { View, StyleSheet, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { InvoiceUploader } from '../../../../components/features/invoices/InvoiceUploader';
import { FileService } from '../../../../services';
import { theme } from '../../../../ui/theme';
import { spacing } from '../../../../ui/spacing';
import { typography } from '../../../../ui/typography';

export default function NewInvoiceScreen() {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (file: any, type: 'photo' | 'pdf') => {
        try {
            setUploading(true);

            if (type === 'photo') {
                await FileService.uploadImage(file, '/api/invoices/upload');
            } else {
                await FileService.uploadFile(file, '/api/invoices/upload');
            }

            Alert.alert(
                'Upload Concluído',
                'A fatura está a ser processada. Receberá uma notificação quando estiver pronta.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha no upload');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Nova Fatura</Text>
                <Text style={styles.subtitle}>Importe uma fatura para processamento</Text>
            </View>

            <View style={styles.content}>
                <InvoiceUploader onUpload={handleUpload} loading={uploading} />

                {uploading && (
                    <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.uploadingText}>A fazer upload...</Text>
                    </View>
                )}
            </View>
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
    content: {
        padding: spacing.lg,
    },
    uploadingContainer: {
        marginTop: spacing.xxl,
        alignItems: 'center',
    },
    uploadingText: {
        marginTop: spacing.md,
        color: theme.colors.textLight,
    },
});
