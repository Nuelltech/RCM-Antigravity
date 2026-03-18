import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Script de validação pós-migração
 * Verifica integridade dos dados após migração multi-tenant
 */
async function validateMigration() {
    console.log('🔍 Validando migração Multi-Tenant...\n');

    let hasErrors = false;

    try {
        // 1. Contar registos
        console.log('1️⃣  Verificando contagens...');
        const usersCount = await prisma.user.count();
        const userTenantsCount = await prisma.userTenant.count();

        console.log(`   Users: ${usersCount}`);
        console.log(`   UserTenants: ${userTenantsCount}`);

        if (usersCount !== userTenantsCount) {
            console.error('   ❌ ERRO: Contagens não batem!');
            console.error('   Esperado: todas as contas user devem ter relação em user_tenants');
            hasErrors = true;
        } else {
            console.log('   ✅ Contagens OK\n');
        }

        // 2. Verificar integridade referencial
        console.log('2️⃣  Verificando integridade referencial...');
        const orphanRelations = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count 
      FROM user_tenants ut
      LEFT JOIN users u ON ut.user_id = u.id
      LEFT JOIN tenants t ON ut.tenant_id = t.id
      WHERE u.id IS NULL OR t.id IS NULL
    `;

        if (orphanRelations[0].count > 0) {
            console.error(`   ❌ ERRO: ${orphanRelations[0].count} relações órfãs encontradas!`);
            hasErrors = true;
        } else {
            console.log('   ✅ Sem relações órfãs\n');
        }

        // 3. Verificar emails únicos
        console.log('3️⃣  Verificando unicidade de emails...');
        const duplicateEmails = await prisma.$queryRaw<Array<{ email: string; count: number }>>`
      SELECT email, COUNT(*) as count
      FROM users
      GROUP BY email
      HAVING count > 1
    `;

        if (duplicateEmails.length > 0) {
            console.error('   ❌ ERRO: Emails duplicados encontrados:');
            duplicateEmails.forEach(d => {
                console.error(`      - ${d.email} (${d.count}x)`);
            });
            hasErrors = true;
        } else {
            console.log('   ✅ Todos os emails são únicos\n');
        }

        // 4. Verificar consistência de roles
        console.log('4️⃣  Verificando roles...');
        const invalidRoles = await prisma.$queryRaw<Array<{ role: string }>>`
      SELECT DISTINCT role
      FROM user_tenants
      WHERE role NOT IN ('admin', 'manager', 'operador', 'visualizador')
    `;

        if (invalidRoles.length > 0) {
            console.error('   ❌ ERRO: Roles inválidos encontrados:');
            invalidRoles.forEach(r => {
                console.error(`      - ${r.role}`);
            });
            hasErrors = true;
        } else {
            console.log('   ✅ Todos os roles são válidos\n');
        }

        // 5. Verificar users sem tenant
        console.log('5️⃣  Verificando users sem relação...');
        const usersWithoutTenant = await prisma.$queryRaw<Array<{ id: number; email: string }>>`
      SELECT u.id, u.email
      FROM users u
      LEFT JOIN user_tenants ut ON u.id = ut.user_id
      WHERE ut.user_id IS NULL
    `;

        if (usersWithoutTenant.length > 0) {
            console.warn('   ⚠️  AVISO: Users sem tenant encontrados:');
            usersWithoutTenant.forEach(u => {
                console.warn(`      - ${u.email} (ID: ${u.id})`);
            });
        } else {
            console.log('   ✅ Todos os users têm tenant\n');
        }

        // 6. Gerar relatório
        console.log('📊 Estatísticas:');
        const stats = await prisma.$queryRaw<Array<{
            total_users: number;
            total_relations: number;
            active_relations: number;
            inactive_relations: number;
        }>>`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM user_tenants) as total_relations,
        (SELECT COUNT(*) FROM user_tenants WHERE ativo = 1) as active_relations,
        (SELECT COUNT(*) FROM user_tenants WHERE ativo = 0) as inactive_relations
    `;

        console.log(`   Total Users: ${stats[0].total_users}`);
        console.log(`   Total Relações: ${stats[0].total_relations}`);
        console.log(`   Relações Ativas: ${stats[0].active_relations}`);
        console.log(`   Relações Inativas: ${stats[0].inactive_relations}\n`);

        // Resultado final
        if (hasErrors) {
            console.error('❌ VALIDAÇÃO FALHOU!');
            console.error('   NÃO prossiga com a migração!');
            console.error('   Execute rollback e corrija os erros.');
            process.exit(1);
        } else {
            console.log('✅ VALIDAÇÃO COMPLETA COM SUCESSO!');
            console.log('   A migração está correta.');
            console.log('   Pode prosseguir com confiança.\n');

            // Guardar relatório
            const reportPath = path.join(__dirname, '../backups', `validation_report_${Date.now()}.json`);
            fs.writeFileSync(reportPath, JSON.stringify({
                timestamp: new Date().toISOString(),
                success: true,
                stats: stats[0],
            }, null, 2));
            console.log(`📄 Relatório guardado: ${reportPath}`);
        }

    } catch (error) {
        console.error('❌ ERRO durante validação:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Executar
validateMigration();
