/**
 * Camera Service
 * Centralizes all camera and image picker logic
 * 
 * Usage:
 *   const photo = await CameraService.takePicture();
 *   const image = await CameraService.pickFromGallery();
 */

import * as ImagePicker from 'expo-image-picker';

export class CameraService {
    /**
     * Request camera permissions
     */
    static async requestCameraPermissions() {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('É necessário permitir acesso à câmera para usar esta funcionalidade');
        }
        return true;
    }

    /**
     * Request media library permissions
     */
    static async requestMediaLibraryPermissions() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('É necessário permitir acesso à galeria para usar esta funcionalidade');
        }
        return true;
    }

    /**
     * Take a picture using the camera
     */
    static async takePicture() {
        await this.requestCameraPermissions();

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: false,
            base64: false,
        });

        if (result.canceled) {
            return null;
        }

        return result.assets[0];
    }

    /**
     * Pick image from gallery
     */
    static async pickFromGallery() {
        await this.requestMediaLibraryPermissions();

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsMultipleSelection: false,
            allowsEditing: false,
            base64: false,
        });

        if (result.canceled) {
            return null;
        }

        return result.assets[0];
    }

    /**
     * Pick multiple images from gallery
     */
    static async pickMultipleFromGallery() {
        await this.requestMediaLibraryPermissions();

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsMultipleSelection: true,
            allowsEditing: false,
            base64: false,
        });

        if (result.canceled) {
            return [];
        }

        return result.assets;
    }
}
