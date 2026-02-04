import * as ftp from 'basic-ftp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Readable } from 'stream';

/**
 * FTP Storage Service
 * Handles file uploads to Hostinger FTP server
 */
export class FTPStorageService {
    private ftpHost: string;
    private ftpUser: string;
    private ftpPassword: string;
    private ftpPort: number;
    private ftpBasePath: string;
    private publicUrlBase: string;
    private useFTP: boolean;
    private environment: string;

    constructor() {
        this.ftpHost = process.env.FTP_HOST || '';
        this.ftpUser = process.env.FTP_USER || '';
        this.ftpPassword = process.env.FTP_PASSWORD || '';
        this.ftpPort = parseInt(process.env.FTP_PORT || '21');
        this.ftpBasePath = process.env.FTP_BASE_PATH || '/';
        this.publicUrlBase = process.env.FILES_PUBLIC_URL || '';
        this.environment = process.env.NODE_ENV || 'development';

        // Use FTP only if configured
        this.useFTP = !!(this.ftpHost && this.ftpUser && this.ftpPassword);

        // DEBUG: Log configuration status (masked)
        console.log('[FTP] Initializing storage service...');
        console.log(`[FTP] HOST: ${this.ftpHost ? 'Set (' + this.ftpHost + ')' : 'MISSING'}`);
        console.log(`[FTP] USER: ${this.ftpUser ? 'Set' : 'MISSING'}`);
        console.log(`[FTP] PASS: ${this.ftpPassword ? 'Set (******)' : 'MISSING'}`);
        console.log(`[FTP] PORT: ${this.ftpPort}`);
        console.log(`[FTP] BASE PATH: ${this.ftpBasePath}`);
        console.log(`[FTP] PUBLIC URL: ${this.publicUrlBase || 'MISSING (Will return raw paths)'}`);

        if (!this.useFTP) {
            console.error('[FTP] ❌ FTP not configured! Falls back to local filesystem (BAD for distributed workers)');
        } else {
            console.log(`[FTP] ✅ FTP Configured. Environment: ${this.environment}`);
        }
    }

    /**
     * Upload file to FTP server
     */
    async uploadFile(
        buffer: Buffer,
        filename: string,
        subfolder: string = 'uploads'
    ): Promise<{ url: string; path: string }> {
        if (!this.useFTP) {
            return this.uploadToLocalFallback(buffer, filename, subfolder);
        }

        const client = new ftp.Client();
        client.ftp.verbose = false; // Set to true for debugging

        try {
            // Connect to FTP
            await client.access({
                host: this.ftpHost,
                user: this.ftpUser,
                password: this.ftpPassword,
                port: this.ftpPort,
                secure: false // Set to true for FTPS if supported
            });

            console.log(`[FTP] Connected to ${this.ftpHost}`);

            // Create remote path with environment separation
            const envFolder = this.environment === 'production' ? 'production' : this.environment;
            const remotePath = path.posix.join(this.ftpBasePath, envFolder, subfolder);

            // Ensure directory exists
            try {
                await client.ensureDir(remotePath);
            } catch (err) {
                console.warn(`[FTP] Could not create directory ${remotePath}, assuming it exists`);
            }

            // Upload file
            const remoteFilePath = path.posix.join(remotePath, filename);
            const readable = Readable.from(buffer);

            await client.uploadFrom(readable, remoteFilePath);

            console.log(`[FTP] ✅ Uploaded: ${remoteFilePath}`);

            // Generate public URL with environment
            const envFolder2 = this.environment === 'production' ? 'production' : this.environment;
            const publicUrl = this.publicUrlBase
                ? `${this.publicUrlBase}/rcm-app/${envFolder2}/${subfolder}/${filename}`
                : remoteFilePath;

            return {
                url: publicUrl,
                path: remoteFilePath
            };


        } catch (err: any) {
            console.error('[FTP] Upload error:', err.message);
            console.warn('[FTP] Falling back to local filesystem storage');

            // Fallback to local storage if FTP fails
            return this.uploadToLocalFallback(buffer, filename, subfolder);
        } finally {
            client.close();
        }
    }

    /**
     * Fallback: Save to local filesystem if FTP not configured
     */
    private async uploadToLocalFallback(
        buffer: Buffer,
        filename: string,
        subfolder: string
    ): Promise<{ url: string; path: string }> {
        const localDir = path.join(process.cwd(), 'uploads', subfolder);
        await fs.mkdir(localDir, { recursive: true });

        const filePath = path.join(localDir, filename);
        await fs.writeFile(filePath, buffer);

        console.log(`[FTP Fallback] Saved locally: ${filePath}`);

        return {
            url: `/uploads/${subfolder}/${filename}`,
            path: filePath
        };
    }

    /**
     * Delete file from FTP server
     */
    async deleteFile(remotePath: string): Promise<void> {
        if (!this.useFTP) {
            console.log('[FTP] Skipping delete (not configured)');
            return;
        }

        const client = new ftp.Client();

        try {
            await client.access({
                host: this.ftpHost,
                user: this.ftpUser,
                password: this.ftpPassword,
                port: this.ftpPort,
                secure: false
            });

            await client.remove(remotePath);
            console.log(`[FTP] ✅ Deleted: ${remotePath}`);

        } catch (err: any) {
            console.error('[FTP] Delete error:', err.message);
            // Don't throw - deletion is not critical
        } finally {
            client.close();
        }
    }
}

// Singleton instance
export const ftpStorageService = new FTPStorageService();
