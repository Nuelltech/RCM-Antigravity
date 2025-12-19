import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Service to match invoices to templates based on supplier identification
 */
export class TemplateMatcherService {
    /**
     * Extract NIF (Portuguese Tax ID) from OCR text
     * Matches 9-digit patterns with various prefixes
     */
    extractNIF(ocrText: string): string | null {
        // Common NIF patterns in invoices
        const patterns = [
            /\bNIF[:\s]+(\d{9})\b/i,
            /\bNIPC[:\s]+(\d{9})\b/i,
            /\bCONTRIB[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ.]*[:\s]+(\d{9})\b/i,
            /\b(\d{9})\b/ // Fallback: any 9-digit number
        ];

        for (const pattern of patterns) {
            const match = ocrText.match(pattern);
            if (match) {
                const nif = match[1];
                // Validate NIF format (starts with valid digits)
                if (/^[1-9]\d{8}$/.test(nif)) {
                    return nif;
                }
            }
        }

        return null;
    }

    /**
     * Extract supplier name from OCR text
     * Usually appears at the top of the invoice
     */
    extractSupplierName(ocrText: string): string | null {
        // Look for common patterns
        const lines = ocrText.split('\n').filter(l => l.trim().length > 0);

        // Usually first 5 lines contain supplier info
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i].trim();

            // Skip very short lines
            if (line.length < 5) continue;

            // Skip lines that are just numbers or dates
            if (/^\d+$/.test(line) || /^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(line)) continue;

            // Skip header keywords
            if (/^(FATURA|INVOICE|RECIBO|RECEIPT|FT|FTV)/i.test(line)) continue;

            // This is likely the supplier name
            if (line.length > 3 && /[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ]/.test(line)) {
                return line;
            }
        }

        return null;
    }

    /**
     * Find template by supplier NIF
     * TEMPORARILY DISABLED: InvoiceTemplate feature not yet implemented
     */
    async findTemplateByNIF(nif: string): Promise<any | null> {
        // TODO: Re-enable when InvoiceTemplate is implemented
        return null;

        /* ORIGINAL CODE - Re-enable later
        try {
            const fornecedor = await prisma.fornecedor.findFirst({
                where: { nif, tenant_id: tenantId },
                include: { invoiceTemplate: true }
            });
            if (!fornecedor?.invoiceTemplate) return null;
            return fornecedor.invoiceTemplate;
        } catch (error) {
            console.error('Error finding template by NIF:', error);
            return null;
        }
        */
    }

    /**
     * Find template by supplier name (fuzzy match)
     * TEMPORARILY DISABLED: InvoiceTemplate feature not yet implemented
     */
    async findTemplateBySupplierName(name: string): Promise<any | null> {
        // TODO: Re-enable when InvoiceTemplate is implemented
        return null;

        /*ORIGINAL CODE - Re-enable later
        try {
            const normalizedName = name.toLowerCase().trim();
            const fornecedores = await prisma.fornecedor.findMany({
                where: {
                    nome_normalize: { contains: normalizedName },
                    ativo: true
                },
                include: { invoiceTemplate: true }
            });
            const match = fornecedores.find(f => f.invoiceTemplate !== null);
            return match?.invoiceTemplate || null;
        } catch (error) {
            console.error('Error finding template by name:', error);
            return null;
        }
        */
    }

    /**
     * Find or create supplier
     * Multi-tenant version
     */
    async findOrCreateSupplier(tenantId: number, nif: string | null, nome: string): Promise<any> {
        const nomeNormalize = nome.toLowerCase().trim();

        // Try to find existing supplier by tenant + normalized name
        let fornecedor = await prisma.fornecedor.findFirst({
            where: {
                tenant_id: tenantId,
                nome_normalize: nomeNormalize
            }
        });

        if (fornecedor) {
            // Update NIF if we have one and it's different
            if (nif && fornecedor.nif !== nif) {
                fornecedor = await prisma.fornecedor.update({
                    where: { id: fornecedor.id },
                    data: { nif }
                });
            }
            return fornecedor;
        }

        // Create new supplier
        fornecedor = await prisma.fornecedor.create({
            data: {
                tenant_id: tenantId,
                nome,
                nome_normalize: nomeNormalize,
                nif
            }
        });

        return fornecedor;
    }
}
