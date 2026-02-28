import { MultipartFile } from '@fastify/multipart';
import * as path from 'path';

export interface UploadedFile {
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
}

/**
 * Sales File Upload Service
 * Handles file uploads for sales reports (PDF/Images) with FTP storage and local fallback
 */
export class SalesFileUploadService {
    /**
     * Validate file type
     */
    private validateFileType(mimetype: string): boolean {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp'
        ];
        return allowedTypes.includes(mimetype);
    }

    /**
     * Generate unique filename
     */
    private generateFilename(originalFilename: string): string {
        const timestamp = Date.now();
        const ext = path.extname(originalFilename);
        const basename = path.basename(originalFilename, ext)
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50);
        return `sales_${timestamp}_${basename}${ext}`;
    }

    /**
     * Upload file from buffer
     * Uses FTP storage with automatic fallback to local filesystem
     */
    async uploadFile(
        file: { filename: string; mimetype: string },
        buffer: Buffer,
        tenantId: number
    ): Promise<UploadedFile> {
        // Validate file type
        if (!this.validateFileType(file.mimetype)) {
            throw new Error(
                `Invalid file type: ${file.mimetype}. Allowed: PDF, JPG, PNG, WEBP`
            );
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (buffer.length > maxSize) {
            throw new Error(`File too large. Max size: 10MB`);
        }

        // Generate filename
        const filename = this.generateFilename(file.filename);

        // Upload to FTP (or local fallback if not configured)
        const { ftpStorageService } = await import('../../../services/ftp-storage.service');
        const result = await ftpStorageService.uploadFile(
            buffer,
            filename,
            `sales/tenant_${tenantId}`
        );

        console.log(`[SALES-UPLOAD] File uploaded: ${filename} -> ${result.url}`);

        return {
            filename,
            filepath: result.url, // Public URL (FTP or local)
            mimetype: file.mimetype,
            size: buffer.length
        };
    }

    /**
     * Get file type from mimetype
     */
    getFileType(mimetype: string): string {
        if (mimetype === 'application/pdf') return 'pdf';
        if (mimetype.startsWith('image/')) {
            return mimetype.split('/')[1]; // jpg, png, webp
        }
        return 'unknown';
    }

    /**
     * Merge multiple image buffers into a single PDF
     * Mirrors functionality from Invoices FileUploadService
     */
    async mergeImagesToPdf(files: Buffer[], tenantId: number): Promise<UploadedFile> {
        // Dynamic import to avoid build issues if dependency is missing (though it should be there)
        const { PDFDocument } = await import('pdf-lib');

        const pdfDoc = await PDFDocument.create();

        for (const fileBuffer of files) {
            try {
                let image;
                // Try embedJpg first (common for photos)
                try {
                    image = await pdfDoc.embedJpg(fileBuffer);
                } catch {
                    // Fallback to PNG
                    try {
                        image = await pdfDoc.embedPng(fileBuffer);
                    } catch (e) {
                        // WEBP not supported by pdf-lib direct embedding usually, skip or log
                        console.warn('[SalesPDFMerge] Skipping unsupported image format (must be JPG/PNG)');
                        continue;
                    }
                }

                if (image) {
                    // Add page matching image dimensions
                    const page = pdfDoc.addPage([image.width, image.height]);
                    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
                }
            } catch (e) {
                console.warn('Failed to embed image in PDF:', e);
            }
        }

        if (pdfDoc.getPageCount() === 0) {
            throw new Error('No valid images (JPG/PNG) to merge.');
        }

        const pdfBytes = await pdfDoc.save();
        const buffer = Buffer.from(pdfBytes);

        // Upload merged PDF to FTP
        const timestamp = Date.now();
        // Generate a random string for uniqueness
        const randomStr = Math.random().toString(36).substring(7);
        const filename = `merged_sales_${timestamp}_${randomStr}.pdf`;

        // Upload using our existing method
        return this.uploadFile(
            { filename, mimetype: 'application/pdf' },
            buffer,
            tenantId
        );
    }
}
