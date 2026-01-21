/**
 * Regenerate fingerprints for existing templates
 * Run this after improving the fingerprint generation algorithm
 */
import { PrismaClient } from '@prisma/client';
import { TemplateFingerprintService } from '../modules/invoices/services/template-fingerprinter.service';

const prisma = new PrismaClient();
const fingerprinter = new TemplateFingerprintService();

async function regenerateFingerprints() {
    console.log('[Regenerate] Starting fingerprint regeneration...\n');

    // Get all templates that have a fingerprint
    const templates = await prisma.invoiceTemplate.findMany({
        where: {
            NOT: {
                fingerprint_config: null
            }
        }
    });

    console.log(`[Regenerate] Found ${templates.length} templates with fingerprints\n`);

    for (const template of templates) {
        // Get supplier info separately
        const supplier = await prisma.fornecedor.findUnique({
            where: { id: template.fornecedor_id }
        });

        if (!supplier) {
            console.log(`⚠️  Template #${template.id} has no supplier, skipping`);
            continue;
        }

        console.log(`\n[Regenerate] Processing template #${template.id}: ${template.template_name}`);
        console.log(`  Supplier: ${supplier.nome} (NIF: ${supplier.nif})`);

        // Show old fingerprint
        const oldFingerprint = template.fingerprint_config as any;
        console.log(`  OLD fingerprint:`, JSON.stringify(oldFingerprint, null, 2));

        // Create mock parsed invoice with supplier info
        const mockParsedInvoice = {
            header: {
                fornecedorNome: supplier.nome,
                fornecedorNIF: supplier.nif
            },
            lineItems: []
        };

        // Generate mock OCR text (we don't have the original, so use supplier info)
        const mockOcrText = `
            ${supplier.nome}
            NIF: ${supplier.nif}
            FATURA FT
            Designação Quantidade Preço
        `;

        // Generate new fingerprint
        const newFingerprint = fingerprinter.generateFingerprint(mockOcrText, mockParsedInvoice);

        console.log(`  NEW fingerprint:`, JSON.stringify(newFingerprint, null, 2));

        // Update template
        await prisma.invoiceTemplate.update({
            where: { id: template.id },
            data: {
                fingerprint_config: newFingerprint as any,
                updatedAt: new Date()
            }
        });

        console.log(`  ✅ Updated template #${template.id}`);
    }

    console.log('\n[Regenerate] ✅ Fingerprint regeneration complete!');
}

regenerateFingerprints()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
