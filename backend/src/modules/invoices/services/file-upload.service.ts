import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { PDFDocument } from 'pdf-lib';

const pump = promisify(pipeline);

export interface UploadedFile {
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
}

export class FileUploadService {
    private uploadDir: string;

    constructor() {
        // Base upload directory
        this.uploadDir = path.join(process.cwd(), 'uploads', 'invoices');
        this.ensureUploadDir();
    }

    /**
     * Ensure upload directory exists
     */
    private ensureUploadDir(): void {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Get tenant-specific upload directory
     */
    private getTenantDir(tenantId: number): string {
        const tenantDir = path.join(this.uploadDir, `tenant_${tenantId}`);
        if (!fs.existsSync(tenantDir)) {
            fs.mkdirSync(tenantDir, { recursive: true });
        }
        return tenantDir;
    }

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
        return `${basename}_${timestamp}${ext}`;
    }

    /**
     * Upload file from multipart data
     */
    async uploadFile(
        file: MultipartFile,
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
        const buffer = await file.toBuffer();
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
            `invoices/tenant_${tenantId}`
        );

        return {
            filename,
            filepath: result.url, // Public URL
            mimetype: file.mimetype,
            size: buffer.length
        };
    }

    /**
     * Delete file
     */
    async deleteFile(filepath: string): Promise<void> {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
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
     */
    async mergeImagesToPdf(files: Buffer[], tenantId: number): Promise<UploadedFile> {
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
                        // WEBP not supported by pdf-lib, skip or log
                        console.warn('[PDFMerge] Skipping unsupported image format (must be JPG/PNG)');
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

        // Upload merged PDF to FTP
        const timestamp = Date.now();
        const filename = `merged_scan_${timestamp}_${Math.random().toString(36).substring(7)}.pdf`;

        const { ftpStorageService } = await import('../../../services/ftp-storage.service');
        const result = await ftpStorageService.uploadFile(
            Buffer.from(pdfBytes),
            filename,
            `invoices/tenant_${tenantId}`
        );

        return {
            filename,
            filepath: result.url, // Public URL
            mimetype: 'application/pdf',
            size: pdfBytes.length
        };
    }
}
