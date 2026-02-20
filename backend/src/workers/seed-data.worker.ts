import { Worker, Job } from 'bullmq';
import { prisma } from '../core/database';
import { redisOptions } from '../core/redis';
import { env } from '../core/env';
import { SeedDataJobData } from '../core/queue';
import { DEFAULT_FAMILIES, DEFAULT_SUBFAMILIES } from '../core/constants/seedData';
import Redis from 'ioredis';

console.log('[WORKER] 🛠️  Seed Data Worker Initialized');

const worker = new Worker<SeedDataJobData>(
    'seed-data',
    async (job: Job<SeedDataJobData>) => {
        const { tenantId, userId, options } = job.data;
        console.log(`[SEED] 🚀 Starting seed for Tenant ${tenantId} (Job ${job.id})`);

        try {
            await job.updateProgress(10);

            // Transaction to ensure atomicity of the seed structure
            await prisma.$transaction(async (tx) => {
                // 1. Seed Families
                console.log(`[SEED] Creating families for Tenant ${tenantId}...`);
                const familyMap = new Map<string, number>();

                for (const family of DEFAULT_FAMILIES) {
                    const existingFamily = await tx.familia.findFirst({
                        where: { tenant_id: tenantId, codigo: family.codigo }
                    });

                    if (existingFamily) {
                        familyMap.set(family.codigo, existingFamily.id);
                        continue;
                    }

                    const newFamily = await tx.familia.create({
                        data: {
                            tenant_id: tenantId,
                            nome: family.nome,
                            codigo: family.codigo,
                        },
                    });
                    familyMap.set(family.codigo, newFamily.id);
                }

                await job.updateProgress(50);

                // 2. Seed Subfamilies
                console.log(`[SEED] Creating subfamilies for Tenant ${tenantId}...`);
                const subFamilyMap = new Map<string, number>();

                for (const sub of DEFAULT_SUBFAMILIES) {
                    const familyId = familyMap.get(sub.familia_codigo);
                    if (familyId) {
                        const existingSub = await tx.subfamilia.findFirst({
                            where: { tenant_id: tenantId, codigo: sub.codigo }
                        });

                        if (existingSub) {
                            subFamilyMap.set(sub.codigo, existingSub.id);
                        } else {
                            const newSub = await tx.subfamilia.create({
                                data: {
                                    tenant_id: tenantId,
                                    familia_id: familyId,
                                    nome: sub.nome,
                                    codigo: sub.codigo,
                                },
                            });
                            subFamilyMap.set(sub.codigo, newSub.id);
                        }
                    }
                }

                await job.updateProgress(80);

                // 3. Seed Products (if requested)
                if (options?.includeProducts && options.productIds && options.productIds.length > 0) {
                    console.log(`[SEED] Creating ${options.productIds.length} products for Tenant ${tenantId}...`);

                    // We need to import DEFAULT_PRODUCTS here. Ideally it should be passed in job data or imported.
                    // Importing it directly:
                    const { DEFAULT_PRODUCTS } = await import('../core/constants/seedData');

                    // The productIds passed from frontend likely correspond to the INDEX in DEFAULT_PRODUCTS array 
                    // or we need a way to identify them. 
                    // Let's assume the frontend sends the INDEXES of DEFAULT_PRODUCTS for now, or we match by name.
                    // A safer bet for the wizard is to pass the FULL product objects, but that bloats the job.
                    // Let's stick to indexes for MVP efficiency since both FE and BE share the same constant source (conceptually).
                    // OR better: we filter DEFAULT_PRODUCTS by the ids passed.
                    // Wait, DEFAULT_PRODUCTS doesn't have IDs. 
                    // Let's assume options.productIds contains the INDICES of the DEFAULT_PRODUCTS array.

                    const totalProducts = options.productIds.length;

                    for (let i = 0; i < totalProducts; i++) {
                        const index = options.productIds[i];
                        const productTemplate = DEFAULT_PRODUCTS[index];
                        if (!productTemplate) continue;

                        const subId = subFamilyMap.get(productTemplate.subfamilia_codigo);
                        if (!subId) continue;

                        // Create Product
                        // Check if exists first to avoid dupes on retry
                        const existingProduct = await tx.produto.findFirst({
                            where: {
                                tenant_id: tenantId,
                                nome: productTemplate.nome,
                                subfamilia_id: subId
                            }
                        });

                        if (!existingProduct) {
                            // Generate code
                            const sub = DEFAULT_SUBFAMILIES.find(s => s.codigo === productTemplate.subfamilia_codigo);
                            const famCode = sub?.familia_codigo || 'XXX';
                            const subCode = productTemplate.subfamilia_codigo;
                            const randomSeq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                            const codigo_interno = `${famCode}-${subCode}-${randomSeq}`;

                            const newProduct = await tx.produto.create({
                                data: {
                                    tenant_id: tenantId,
                                    nome: productTemplate.nome,
                                    subfamilia_id: subId,
                                    unidade_medida: productTemplate.unidade,
                                    codigo_interno: codigo_interno,
                                    vendavel: false,
                                    ativo: true
                                }
                            });

                            // Use dummy price or the one from seed data
                            // Check if preco_compra exists in template (we added it recently)
                            const purchasePrice = (productTemplate as any).preco_compra || 0;

                            // Create Default Variation
                            await tx.variacaoProduto.create({
                                data: {
                                    tenant_id: tenantId,
                                    produto_id: newProduct.id,
                                    tipo_unidade_compra: productTemplate.unidade,
                                    unidades_por_compra: 1,
                                    preco_compra: purchasePrice,
                                    preco_unitario: purchasePrice, // Set unit price same as purchase for base unit
                                    ativo: true
                                }
                            });
                        }

                        // Update progress every 5 items or at the end
                        if (i % 5 === 0 || i === totalProducts - 1) {
                            // Scale progress from 80 to 99 based on items processed
                            const progress = 80 + Math.floor((i / totalProducts) * 19);
                            await job.updateProgress(progress);
                        }
                    }
                }
            }, {
                maxWait: 5000,
                timeout: 60000 // Give it plenty of time
            });

            await job.updateProgress(100);
            console.log(`[SEED] ✅ Seed completed for Tenant ${tenantId}`);

            return { success: true, familiesCreated: true };
        } catch (error: any) {
            console.error(`[SEED] ❌ Failed to seed data for Tenant ${tenantId}:`, error);
            throw error;
        }
    },
    {
        connection: new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: null,
        }) as any,
        concurrency: 5, // Allow multiple setups at once
    }
);

worker.on('failed', (job, err) => {
    console.error(`[WORKER] ❌ Seed job ${job?.id} failed:`, err);
});

export default worker;
