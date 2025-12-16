import vision from '@google-cloud/vision';
import * as fs from 'fs';

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
    private client: any; // vision.ImageAnnotatorClient - using any to avoid namespace issues

    constructor() {
        // Initialize Vision API client
        // Will use GOOGLE_APPLICATION_CREDENTIALS env var or default credentials
        const keyPath = process.env.GOOGLE_VISION_API_KEY_PATH;

        if (keyPath && fs.existsSync(keyPath)) {
            this.client = new vision.ImageAnnotatorClient({
                keyFilename: keyPath
            });
        } else {
            // Try default credentials
            this.client = new vision.ImageAnnotatorClient();
        }
    }

    /**
     * Extract text from image or PDF file
     */
    async extractText(filepath: string): Promise<OCRResult> {
        try {
            // Read file
            const fileBuffer = fs.readFileSync(filepath);

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

            return {
                fullText,
                pages,
                confidence
            };
        } catch (error: any) {
            console.error('OCR Error:', error);
            throw new Error(`OCR failed: ${error?.message || 'Unknown error'}`);
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
        try {
            // Just verify client is initialized
            return !!this.client;
        } catch (error) {
            console.error('OCR Service Test Failed:', error);
            return false;
        }
    }
}
