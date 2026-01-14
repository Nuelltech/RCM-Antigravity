/**
 * InvoiceUploader Component
 * Allows users to upload invoices via camera or PDF picker
 * 
 * Usage:
 *   <InvoiceUploader onUpload={handleUpload} />
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button } from '../../base';
import { CameraService, FileService } from '../../../services';
import { spacing } from '../../../ui/spacing';

interface InvoiceUploaderProps {
    onUpload: (file: any, type: 'photo' | 'pdf') => void;
    loading?: boolean;
}

export const InvoiceUploader: React.FC<InvoiceUploaderProps> = ({
    onUpload,
    loading = false,
}) => {
    const [uploading, setUploading] = useState(false);

    const handleCamera = async () => {
        try {
            setUploading(true);
            const photo = await CameraService.takePicture();

            if (photo) {
                onUpload(photo, 'photo');
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha ao tirar foto');
        } finally {
            setUploading(false);
        }
    };

    const handleGallery = async () => {
        try {
            setUploading(true);
            const photo = await CameraService.pickFromGallery();

            if (photo) {
                onUpload(photo, 'photo');
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha ao escolher imagem');
        } finally {
            setUploading(false);
        }
    };

    const handlePDF = async () => {
        try {
            setUploading(true);
            const pdf = await FileService.pickPDF();

            if (pdf) {
                onUpload(pdf, 'pdf');
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha ao escolher PDF');
        } finally {
            setUploading(false);
        }
    };

    const isLoading = loading || uploading;

    return (
        <View style={styles.container}>
            <Button
                onPress={handleCamera}
                icon="camera"
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
            >
                Tirar Foto
            </Button>

            <Button
                onPress={handleGallery}
                variant="outlined"
                icon="image"
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
            >
                Escolher Imagem
            </Button>

            <Button
                onPress={handlePDF}
                variant="outlined"
                icon="file-pdf-box"
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
            >
                Escolher PDF
            </Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: spacing.md,
    },
    button: {
        width: '100%',
    },
});
