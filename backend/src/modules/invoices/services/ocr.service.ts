import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';

export interface OCRResult {
    fullText: string;
    pages: OCRPage[];
    confidence: number;
}

export interface OCRPage {
    pageNumber: number;
    text: string;
    blocks: OCRBlock[];
}

export interface OCRBlock {
    text: string;
    confidence: number;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export class OCRService {
    private client: ImageAnnotatorClient;
    private isAvailable: boolean = false;

    constructor() {
        // Initialize Vision API client
        const keyPath = process.env.GOOGLE_VISION_API_KEY_PATH;

        try {
            if (keyPath && fs.existsSync(keyPath)) {
                this.client = new ImageAnnotatorClient({
                    keyFilename: keyPath
                });
                this.isAvailable = true;
                console.log('[OCR] Google Vision initialized with key file.');
            } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                this.client = new ImageAnnotatorClient();
                this.isAvailable = true;
                console.log('[OCR] Google Vision initialized with default credentials.');
            } else {
                console.warn('[OCR] Google Vision API not configured. OCR will not be available.');
                console.warn('[OCR] Set GOOGLE_VISION_API_KEY_PATH or GOOGLE_APPLICATION_CREDENTIALS to enable OCR.');
                // @ts-ignore - Valid initialization for optional/conditional client usage but ensures types elsewhere
                this.client = new ImageAnnotatorClient();
                this.isAvailable = false;
            }
        } catch (error) {
            console.error('[OCR] Failed to initialize Google Vision:', error);
            // @ts-ignore
            this.client = null;
            this.isAvailable = false;
        }
    }

    /**
     * Extract text from image or PDF file
     * For PDFs: tries native text extraction first, falls back to OCR if needed
     */
    async extractText(filepath: string): Promise<OCRResult> {
        // Check if OCR is available
        if (!this.isAvailable) {
            console.warn('[OCR] Service not available. Returning empty result.');
            return {
                fullText: '',
                pages: [],
                confidence: 0
            };
        }

        const isPDF = filepath.toLowerCase().endsWith('.pdf');

        try {
            // DUAL APPROACH FOR PDFs
            if (isPDF) {
                console.log('[OCR] PDF detected, attempting native text extraction first...');

                try {
                    // Try native PDF text extraction (fast, no OCR needed)
                    const pdfText = await this.extractPDFTextNative(filepath);

                    // If we got meaningful text (>100 chars), use it!
                    if (pdfText && pdfText.trim().length > 100) {
                        console.log(`[OCR] ✅ PDF native text extraction successful (${pdfText.length} chars)`);
                        return {
                            fullText: pdfText,
                            pages: [{ pageNumber: 1, text: pdfText, blocks: [] }],
                            confidence: 1.0 // Native text = 100% confidence
                        };
                    } else {
                        console.log('[OCR] ⚠️ PDF native text extraction returned little/no text, falling back to OCR...');
                    }
                } catch (nativeError) {
                    console.warn('[OCR] ⚠️ PDF native extraction failed, falling back to OCR:', nativeError);
                }
            }

            // STANDARD OCR APPROACH (for images OR PDF fallback)
            console.log(`[OCR] Running Google Vision OCR on ${isPDF ? 'PDF (fallback)' : 'image'}...`);

            // Check if filepath is a URL
            let fileBuffer: Buffer;
            if (filepath.startsWith('http://') || filepath.startsWith('https://')) {
                console.log(`[OCR] Detected HTTPS URL, downloading file first: ${filepath}`);

                try {
                    const response = await fetch(filepath);
                    if (!response.ok) {
                        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    fileBuffer = Buffer.from(arrayBuffer);
                    console.log(`[OCR] ✅ Downloaded file from URL (${fileBuffer.length} bytes)`);
                } catch (downloadError: any) {
                    throw new Error(`Failed to download file from URL: ${downloadError.message}`);
                }
            } else {
                // Local file path
                fileBuffer = fs.readFileSync(filepath);
            }

            // Perform OCR
            const [result] = await this.client.documentTextDetection({
                image: { content: fileBuffer }
            });

            const fullTextAnnotation = result.fullTextAnnotation;

            if (!fullTextAnnotation) {
                throw new Error('No text detected in document');
            }

            // Extract full text
            const fullText = fullTextAnnotation.text || '';

            // Extract pages
            const pages: OCRPage[] = (fullTextAnnotation.pages || []).map((page: any, index: number) => {
                const blocks: OCRBlock[] = (page.blocks || []).map((block: any) => {
                    const text = this.extractBlockText(block);
                    const confidence = this.calculateBlockConfidence(block);
                    const boundingBox = this.extractBoundingBox(block);

                    return {
                        text,
                        confidence,
                        boundingBox
                    };
                });

                return {
                    pageNumber: index + 1,
                    text: blocks.map(b => b.text).join('\n'),
                    blocks
                };
            });

            // Calculate overall confidence
            const confidence = this.calculateOverallConfidence(pages);

            console.log(`[OCR] ✅ OCR completed successfully (${fullText.length} chars, ${pages.length} pages)`);

            return {
                fullText,
                pages,
                confidence
            };
        } catch (error: any) {
            console.error('[OCR] Error:', error);
            throw new Error(`OCR failed: ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Extract native text from PDF (no OCR needed)
     * Uses pdf-parse library for fast text extraction
     */
    private async extractPDFTextNative(filepath: string): Promise<string> {
        try {
            // Use require for CommonJS module (pdf-parse)
            const pdfParseModule = require('pdf-parse');

            // The main function is exported as 'PDFParse', not 'default'
            const pdfParse = pdfParseModule.PDFParse || pdfParseModule.default || pdfParseModule;
            const dataBuffer = fs.readFileSync(filepath);

            const data = await pdfParse(dataBuffer);

            return data.text;
        } catch (error: any) {
            // If pdf-parse is not installed, throw error to trigger fallback
            throw new Error(`PDF native extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from a block
     */
    private extractBlockText(block: any): string {
        if (!block.paragraphs) return '';

        return block.paragraphs
            .map((paragraph: any) => {
                if (!paragraph.words) return '';
                return paragraph.words
                    .map((word: any) => {
                        if (!word.symbols) return '';
                        return word.symbols
                            .map((symbol: any) => symbol.text)
                            .join('');
                    })
                    .join(' ');
            })
            .join('\n');
    }

    /**
     * Calculate block confidence
     */
    private calculateBlockConfidence(block: any): number {
        if (!block.paragraphs) return 0;

        let totalConfidence = 0;
        let count = 0;

        block.paragraphs.forEach((paragraph: any) => {
            if (!paragraph.words) return;
            paragraph.words.forEach((word: any) => {
                if (word.confidence !== undefined) {
                    totalConfidence += word.confidence;
                    count++;
                }
            });
        });

        return count > 0 ? totalConfidence / count : 0;
    }

    /**
     * Extract bounding box from block
     */
    private extractBoundingBox(block: any): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        if (!block.boundingBox || !block.boundingBox.vertices) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        const vertices = block.boundingBox.vertices;
        const xs = vertices.map((v: any) => v.x || 0);
        const ys = vertices.map((v: any) => v.y || 0);

        const x = Math.min(...xs);
        const y = Math.min(...ys);
        const width = Math.max(...xs) - x;
        const height = Math.max(...ys) - y;

        return { x, y, width, height };
    }

    /**
     * Calculate overall confidence
     */
    private calculateOverallConfidence(pages: OCRPage[]): number {
        if (pages.length === 0) return 0;

        let totalConfidence = 0;
        let count = 0;

        pages.forEach(page => {
            page.blocks.forEach(block => {
                totalConfidence += block.confidence;
                count++;
            });
        });

        return count > 0 ? totalConfidence / count : 0;
    }

    /**
     * Test OCR service
     */
    async testConnection(): Promise<boolean> {
        return this.isAvailable;
    }

    /**
     * Check if OCR is available
     */
    public checkAvailability(): boolean {
        return this.isAvailable;
    }
}
