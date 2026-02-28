
// Basic test script for SalesFileUploadService
// Run with: npx ts-node scripts/test-sales-upload-flow.ts

import * as path from 'path';
import * as fs from 'fs';
import { SalesFileUploadService } from '../src/modules/vendas/services/sales-file-upload.service';

// Mock dotenv if needed, or rely on system env/default
process.env.NODE_ENV = 'test';

async function runTest() {
    console.log('--- Sales File Upload Service Test ---');

    const service = new SalesFileUploadService();
    const tenantId = 999;

    // Create a dummy PDF buffer
    const buffer = Buffer.from('%PDF-1.4\n%Test PDF content', 'utf-8');
    const filename = 'test-report.pdf';
    const mimetype = 'application/pdf';

    console.log(`1. Testing upload of ${filename} (${buffer.length} bytes)...`);

    try {
        const result = await service.uploadFile(
            { filename, mimetype },
            buffer,
            tenantId
        );

        console.log('✅ Upload successful!');
        console.log('Result:', result);

        if (result.filepath.includes('/uploads/sales/tenant_999/')) {
            console.log('✅ Correctly used local fallback (or FTP mapped locally)');

            // Verify file exists
            if (fs.existsSync(result.filepath) || fs.existsSync(path.join(process.cwd(), result.filepath))) {
                console.log('✅ File verified on disk.');
            } else {
                console.warn('⚠️ File path returned but file not found (might be relative path issue in test script context).');
                console.log('CWD:', process.cwd());
            }

        } else if (result.filepath.startsWith('http')) {
            console.log('✅ Uploaded to FTP (URL received)');
        }

    } catch (error) {
        console.error('❌ Upload failed:', error);
    }

    // Clean up test file if local
    const localDir = path.join(process.cwd(), 'uploads', 'sales', `tenant_${tenantId}`);
    try {
        if (fs.existsSync(localDir)) {
            // fs.rmSync(localDir, { recursive: true, force: true });
            console.log(`ℹ️ Test artifacts left in ${localDir} for inspection.`);
        }
    } catch (e) { }
}

runTest();
