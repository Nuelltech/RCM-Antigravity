/**
 * File Service
 * Centralizes all file picking and upload logic
 * 
 * Usage:
 *   const pdf = await FileService.pickDocument('application/pdf');
 *   await FileService.uploadFile(file, '/api/invoices/upload');
 */

import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import api from '../lib/api';

export class FileService {
    /**
     * Pick a document from storage
     * @param type MIME type (e.g., 'application/pdf', 'image/*')
     */
    static async pickDocument(type: string = '*/*') {
        const result = await DocumentPicker.getDocumentAsync({
            type,
            copyToCacheDirectory: true,
        });

        if (result.canceled) {
            return null;
        }

        return result.assets[0];
    }

    /**
     * Pick a PDF file
     */
    static async pickPDF() {
        return this.pickDocument('application/pdf');
    }

    /**
     * Upload file to backend
     * @param file File object from ImagePicker or DocumentPicker
     * @param endpoint API endpoint (e.g., '/api/invoices/upload')
     */
    static async uploadFile(file: any, endpoint: string) {
        const formData = new FormData();

        if (Platform.OS === 'web') {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            formData.append('file', blob, file.name || 'document.pdf');
        } else {
            const fileToUpload = {
                uri: file.uri,
                type: file.mimeType || 'application/octet-stream',
                name: file.name || `file_${Date.now()}`,
            } as any;
            formData.append('file', fileToUpload);
        }

        try {
            const response = await api.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data;
        } catch (error: any) {
            console.error('Upload failed:', error);
            throw new Error(error.response?.data?.message || 'Falha ao enviar ficheiro');
        }
    }

    /**
     * Upload image to backend
     */
    static async uploadImage(image: any, endpoint: string) {
        const formData = new FormData();

        if (Platform.OS === 'web') {
            const response = await fetch(image.uri);
            const blob = await response.blob();
            formData.append('file', blob, 'photo.jpg');
        } else {
            const imageToUpload = {
                uri: image.uri,
                type: 'image/jpeg',
                name: `photo_${Date.now()}.jpg`,
            } as any;
            formData.append('file', imageToUpload);
        }

        try {
            const response = await api.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data;
        } catch (error: any) {
            console.error('Upload failed:', error);
            throw new Error(error.response?.data?.message || 'Falha ao enviar imagem');
        }
    }
}
