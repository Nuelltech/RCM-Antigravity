import { prisma } from '../src/core/database';
import bcrypt from 'bcryptjs';

import { DEFAULT_FAMILIES, DEFAULT_SUBFAMILIES } from '../src/core/constants/seed-data';

const families = DEFAULT_FAMILIES;
const subfamilies = DEFAULT_SUBFAMILIES;

async function main() {
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Tenant (Upsert)
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'demo-restaurant' },
        update: {},
        create: {
            nome_restaurante: 'Demo Restaurant',
            slug: 'demo-restaurant',
            plano: 'enterprise',
        },
    });

    // 2. User (Upsert)
    await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: tenant.id, email: 'owner@demo.com' } },
        update: {},
        create: {
            tenant_id: tenant.id,
            nome: 'Demo Owner',
            email: 'owner@demo.com',
            password_hash: passwordHash,
            role: 'owner',
        },
    });

    console.log(`Seeding families for tenant: ${tenant.nome_restaurante} (${tenant.id})`);

    // 3. Families
    const familyMap = new Map<string, number>();

    for (const family of families) {
        const exists = await prisma.familia.findFirst({
            where: {
                tenant_id: tenant.id,
                nome: family.nome,
            },
        });

        let familyId: number;

        if (!exists) {
            const newFamily = await prisma.familia.create({
                data: {
                    tenant_id: tenant.id,
                    nome: family.nome,
                    codigo: family.codigo,
                },
            });
            familyId = newFamily.id;
            console.log(`Created family: ${family.nome} (${family.codigo})`);
        } else {
            familyId = exists.id;
            if (!exists.codigo) {
                await prisma.familia.update({
                    where: { id: exists.id },
                    data: { codigo: family.codigo },
                });
                console.log(`Updated family code: ${family.nome} -> ${family.codigo}`);
            }
        }
        familyMap.set(family.codigo, familyId);
    }

    // 4. Subfamilies
    console.log('Seeding subfamilies...');
    for (const sub of subfamilies) {
        const familyId = familyMap.get(sub.familia_codigo);
        if (!familyId) {
            console.warn(`Family not found for subfamily: ${sub.nome} (Family Code: ${sub.familia_codigo})`);
            continue;
        }

        const exists = await prisma.subfamilia.findFirst({
            where: {
                tenant_id: tenant.id,
                familia_id: familyId,
                nome: sub.nome,
            },
        });

        if (!exists) {
            await prisma.subfamilia.create({
                data: {
                    tenant_id: tenant.id,
                    familia_id: familyId,
                    nome: sub.nome,
                    codigo: sub.codigo,
                },
            });
            console.log(`Created subfamily: ${sub.nome} (${sub.codigo})`);
        } else {
            if (!exists.codigo) {
                await prisma.subfamilia.update({
                    where: { id: exists.id },
                    data: { codigo: sub.codigo },
                });
                console.log(`Updated subfamily code: ${sub.nome} -> ${sub.codigo}`);
            }
        }
    }

    console.log('Seed completed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
