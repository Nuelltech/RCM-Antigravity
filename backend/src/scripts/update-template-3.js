/**
 * Simple JS script to update template #3 fingerprint
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTemplate3() {
    console.log('[Update] Updating template #3 fingerprint...\n');

    const newFingerprint = {
        required_keywords: ["M.CUNHA, S.A.", "M.CUNHA", "S.A", "255712647"],
        optional_keywords: ["FATURA FT", "Designação", "Penafiel"],
        structure_markers: {
            header_pattern: "",
            table_start_marker: "QUANTIDADE",
            table_columns: 11,
            column_order: ["DESCRIÇÃO", "QTD", "PREÇO"]
        },
        layout_hints: {
            multipage: false,
            has_logo: true,
            nif_position: "header",
            date_format: "DD/MM/YYYY"
        }
    };

    console.log('NEW fingerprint:', JSON.stringify(newFingerprint, null, 2));

    await prisma.invoiceTemplate.update({
        where: { id: 3 },
        data: {
            fingerprint_config: newFingerprint,
            updatedAt: new Date()
        }
    });

    console.log('\n✅ Template #3 updated successfully!');

    // Verify
    const updated = await prisma.invoiceTemplate.findUnique({
        where: { id: 3 },
        select: { id: true, template_name: true, fingerprint_config: true }
    });

    console.log('\nVerified:', JSON.stringify(updated, null, 2));
}

updateTemplate3()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
