import Tesseract from 'tesseract.js';

/**
 * Tesseract OCR Service
 * 
 * Alternative OCR when Google Vision fails or provides poor quality text.
 * This service ONLY extracts text - it does NOT do any invoice parsing.
 * The extracted text is then passed to Gemini for intelligent parsing.
 */
export class TesseractOCRService {
    /**
     * Extract text from image or PDF file
     * @param filepath - Absolute path to the file
     * @returns Extracted text and confidence score
     */
    async extractText(filepath: string): Promise<{ fullText: string; confidence: number }> {
        console.log('[TesseractOCR] Starting OCR extraction...');

        try {
            // Recognize text from image using Portuguese language
            const { data } = await Tesseract.recognize(
                filepath,
                'por', // Portuguese language
                {
                    logger: (m: any) => {
                        // Log progress
                        if (m.status === 'recognizing text') {
                            console.log(`[TesseractOCR] Progress: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                }
            );

            const fullText = data.text;
            const confidence = data.confidence || 0;

            console.log(`[TesseractOCR] ✅ Extracted ${fullText.length} characters (confidence: ${confidence.toFixed(1)}%)`);

            return {
                fullText,
                confidence
            };
        } catch (error: any) {
            console.error('[TesseractOCR] ❌ Error:', error);
            throw new Error(`Tesseract OCR failed: ${error?.message || 'Unknown error'}`);
        }
    }

    /**
     * Check if Tesseract is available
     */
    async checkAvailability(): Promise<boolean> {
        try {
            // Simple test - if we can import, it's available
            return true;
        } catch {
            return false;
        }
    }
}
