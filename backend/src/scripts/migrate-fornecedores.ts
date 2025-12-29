import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Normalize supplier name for matching
 * Converts to lowercase, trims, removes accents, normalizes spaces
 */
function normalizeName(name: string | null): string {
    if (!name) return '';

    return name
        .toLowerCase()
        .trim()
        .normalize("NFD")  // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, "")  // Remove diacritics
        .replace(/\s+/g, " ");  // Multiple spaces → single space
}

async function migrateSuppliers() {
    console.log('🔄 Starting supplier migration...\n');

    try {
        // Get all tenants
        const tenants = await prisma.tenant.findMany({
            select: { id: true, nome_restaurante: true }
        });

        console.log(`📊 Found ${tenants.length} tenants\n`);

        for (const tenant of tenants) {
            console.log(`\n🏢 Processing tenant: ${tenant.nome_restaurante} (ID: ${tenant.id})`);

            // Step 1: Extract unique suppliers from faturas_importacao
            const faturas = await prisma.faturaImportacao.findMany({
                where: { tenant_id: tenant.id },
                select: {
                    fornecedor_nome: true,
                    fornecedor_nif: true
                }
            });

            // Step 2: Extract unique suppliers from compras (old string field)
            const compras = await prisma.compra.findMany({
                where: {
                    tenant_id: tenant.id,
                    fornecedor: { not: null }  // Only where fornecedor string exists
                },
                select: {
                    fornecedor: true
                },
                distinct: ['fornecedor']
            });

            // Step 3: Build unique supplier map (by normalized name)
            const supplierMap = new Map<string, {
                nome: string;
                nome_normalize: string;
                nif?: string | null;
                tenant_id: number;
            }>();

            // Process faturas
            for (const fatura of faturas) {
                if (!fatura.fornecedor_nome) continue;

                const normalized = normalizeName(fatura.fornecedor_nome);
                if (!normalized) continue;

                if (!supplierMap.has(normalized)) {
                    supplierMap.set(normalized, {
                        nome: fatura.fornecedor_nome,  // Use first occurrence as canonical name
                        nome_normalize: normalized,
                        nif: fatura.fornecedor_nif,
                        tenant_id: tenant.id
                    });
                } else {
                    // Update NIF if we found one
                    const existing = supplierMap.get(normalized)!;
                    if (!existing.nif && fatura.fornecedor_nif) {
                        existing.nif = fatura.fornecedor_nif;
                    }
                }
            }

            // Process compras
            for (const compra of compras) {
                if (!compra.fornecedor) continue;

                const normalized = normalizeName(compra.fornecedor);
                if (!normalized) continue;

                if (!supplierMap.has(normalized)) {
                    supplierMap.set(normalized, {
                        nome: compra.fornecedor,
                        nome_normalize: normalized,
                        tenant_id: tenant.id
                    });
                }
            }

            console.log(`   Found ${supplierMap.size} unique suppliers`);

            // Step 4: Create fornecedor records
            let created = 0;
            for (const supplierData of supplierMap.values()) {
                try {
                    await prisma.fornecedor.create({
                        data: {
                            nome: supplierData.nome,
                            nome_normalize: supplierData.nome_normalize,
                            nif: supplierData.nif,
                            tenant_id: supplierData.tenant_id
                        }
                    });
                    created++;
                } catch (error: any) {
                    // Ignore duplicate errors (already exists)
                    if (!error.message?.includes('Unique constraint')) {
                        console.error(`   ⚠️  Error creating supplier "${supplierData.nome}":`, error.message);
                    }
                }
            }

            console.log(`   ✅ Created ${created} supplier records`);

            // Step 5: Update FaturaImportacao foreign keys
            console.log(`   🔗 Updating fatura importacao FKs...`);

            const faturasToUpdate = await prisma.faturaImportacao.findMany({
                where: {
                    tenant_id: tenant.id,
                    fornecedor_nome: { not: null }
                },
                select: {
                    id: true,
                    fornecedor_nome: true,
                    fornecedor_id: true
                }
            });

            let faturas_updated = 0;
            for (const fatura of faturasToUpdate) {
                if (fatura.fornecedor_id) continue; // Already linked

                const normalized = normalizeName(fatura.fornecedor_nome);
                if (!normalized) continue;

                const fornecedor = await prisma.fornecedor.findFirst({
                    where: {
                        tenant_id: tenant.id,
                        nome_normalize: normalized
                    }
                });

                if (fornecedor) {
                    await prisma.faturaImportacao.update({
                        where: { id: fatura.id },
                        data: { fornecedor_id: fornecedor.id }
                    });
                    faturas_updated++;
                }
            }
            console.log(`   ✅ Updated ${faturas_updated} faturas`);

            // Step 6: Update Compra foreign keys
            console.log(`   🔗 Updating compra FKs...`);

            const comprasToUpdate = await prisma.compra.findMany({
                where: {
                    tenant_id: tenant.id,
                    fornecedor: { not: null }
                },
                select: {
                    id: true,
                    fornecedor: true,
                    fornecedor_id: true
                }
            });

            let compras_updated = 0;
            for (const compra of comprasToUpdate) {
                if (compra.fornecedor_id) continue; // Already linked

                const normalized = normalizeName(compra.fornecedor);
                if (!normalized) continue;

                const fornecedor = await prisma.fornecedor.findFirst({
                    where: {
                        tenant_id: tenant.id,
                        nome_normalize: normalized
                    }
                });

                if (fornecedor) {
                    await prisma.compra.update({
                        where: { id: compra.id },
                        data: { fornecedor_id: fornecedor.id }
                    });
                    compras_updated++;
                }
            }
            console.log(`   ✅ Updated ${compras_updated} compras`);
            console.log(`   ✅ Tenant ${tenant.nome_restaurante} completed!`);
        }

        console.log('\n🎉 Supplier migration completed successfully!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
migrateSuppliers()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
