import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';

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

        // Generate filename and path
        const filename = this.generateFilename(file.filename);
        const tenantDir = this.getTenantDir(tenantId);
        const filepath = path.join(tenantDir, filename);

        // Save file
        fs.writeFileSync(filepath, buffer);

        return {
            filename,
            filepath,
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
}
