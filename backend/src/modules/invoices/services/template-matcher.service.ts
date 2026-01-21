import { PrismaClient, InvoiceTemplate } from '@prisma/client';

/**
 * Template Matcher Service
 * 
 * Responsible for finding templates by supplier and extracting supplier info from OCR
 */
export class TemplateMatcherService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Find ALL templates for a given supplier
     * (Multiple templates per supplier allowed for different formats)
     */
    async findTemplatesBySupplier(
        nif: string | null,
        supplierName: string | null
    ): Promise<InvoiceTemplate[]> {
        if (!nif && !supplierName) {
            return [];
        }

        // Try to find supplier
        const supplier = await this.prisma.fornecedor.findFirst({
            where: {
                OR: [
                    ...(nif ? [{ nif }] : []),
                    ...(supplierName ? [{
                        nome_normalize: this.normalizeName(supplierName)
                    }] : [])
                ]
            }
        });

        if (!supplier) {
            return [];
        }

        // Get ALL active templates for this supplier
        return await this.prisma.invoiceTemplate.findMany({
            where: {
                fornecedor_id: supplier.id,
                is_active: true
            },
            orderBy: {
                confidence_score: 'desc'  // Best templates first
            }
        });
    }

    /**
     * Extract NIF from OCR text
     */
    extractNIF(ocrText: string): string | null {
        // Search only in header section (first 40% of text) to avoid client NIF
        const headerSection = ocrText.substring(0, Math.floor(ocrText.length * 0.4));

        // ALL possible NIF patterns (case-insensitive)
        const patterns = [
            /NIPC[:\s]*(\d{9})/i,                    // NIPC: 123456789
            /NIPC\s*n[ºo°]\.?\s*(\d{9})/i,           // NIPC nº 123456789, NIPC no 123456789
            /NIF[:\s]*(\d{9})/i,                     // NIF: 123456789
            /NIF\s*n[ºo°]\.?\s*(\d{9})/i,            // NIF nº 123456789
            /N\.?I\.?F\.?[:\s]*(\d{9})/i,            // N.I.F. or N.I.F: or NIF:
            /N\.?I\.?P\.?C\.?[:\s]*(\d{9})/i,        // N.I.P.C.
            /Contribuinte[:\s]*(\d{9})/i,            // Contribuinte: 123456789
            /N[úu]mero\s+Fiscal[:\s]*(\d{9})/i,      // Número Fiscal or Numero Fiscal
            /N\.?\s*Fiscal[:\s]*(\d{9})/i,           // N. Fiscal or N.Fiscal
            /Ident\.?\s+Fiscal[:\s]*(\d{9})/i,       // Ident. Fiscal
            /ID\s+Fiscal[:\s]*(\d{9})/i              // ID Fiscal
        ];

        // Try each pattern in order
        for (const pattern of patterns) {
            const match = headerSection.match(pattern);
            if (match && match[1]) {
                console.log(`[Matcher] ✅ Found NIF in header: ${match[1]}`);
                return match[1];
            }
        }

        console.warn('[Matcher] ⚠️  No NIF found in header section with known patterns');
        return null; // NO blind fallback to first 9-digit number!
    }

    /**
     * Extract supplier name from OCR text
     */
    extractSupplierName(ocrText: string): string | null {
        // Get first 500 characters (supplier name usually at top)
        const topSection = ocrText.substring(0, 500);

        // Look for common patterns
        const lines = topSection.split('\n').map(line => line.trim());

        // Find first non-empty line that looks like a company name
        // (usually all caps, > 3 chars, not "FATURA" or similar)
        const excludeKeywords = ['FATURA', 'INVOICE', 'NOTA', 'TALÃO', 'RECIBO', 'ORIGINAL', 'DUPLICADO'];

        for (const line of lines) {
            if (line.length > 3 &&
                line.length < 100 &&
                !excludeKeywords.some(kw => line.toUpperCase().includes(kw))) {

                // Check if it looks like a company name (has letters)
                if (/[A-Za-z]{3,}/.test(line)) {
                    return line;
                }
            }
        }

        return null;
    }

    /**
     * Find or create supplier
     */
    async findOrCreateSupplier(
        tenantId: number,
        nif: string | null,
        supplierName: string | null
    ): Promise<any> {
        if (!nif && !supplierName) {
            throw new Error('Either NIF or supplier name must be provided');
        }

        // Try to find existing supplier
        let supplier = await this.prisma.fornecedor.findFirst({
            where: {
                tenant_id: tenantId,
                OR: [
                    ...(nif ? [{ nif }] : []),
                    ...(supplierName ? [{
                        nome_normalize: this.normalizeName(supplierName)
                    }] : [])
                ]
            }
        });

        // Create if not found
        if (!supplier && supplierName) {
            supplier = await this.prisma.fornecedor.create({
                data: {
                    tenant_id: tenantId,
                    nome: supplierName,
                    nome_normalize: this.normalizeName(supplierName),
                    nif: nif || undefined,
                    ativo: true
                }
            });

            console.log(`[TemplateMatcher] Created new supplier: ${supplierName} (NIF: ${nif})`);
        }

        return supplier;
    }

    /**
     * Normalize name for matching
     */
    private normalizeName(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')  // Remove accents
            .replace(/[^a-z0-9\s]/g, '')      // Remove special chars
            .trim();
    }
}
