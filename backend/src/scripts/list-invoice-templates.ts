/**
 * Script to list all invoice templates with statistics
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listTemplates() {
    try {
        console.log('\n📋 INVOICE TEMPLATES - Status Report\n');
        console.log('='.repeat(120));

        const templates = await prisma.invoiceTemplate.findMany({
            include: {
                fornecedor: {
                    select: {
                        id: true,
                        nome: true,
                        nif: true
                    }
                }
            },
            orderBy: {
                times_used: 'desc'
            }
        });

        if (templates.length === 0) {
            console.log('\n❌ Nenhum template encontrado na base de dados.\n');
            return;
        }

        console.log(`\n✅ Encontrados ${templates.length} templates:\n`);

        for (const template of templates) {
            const taxaSucesso = template.times_used > 0
                ? ((template.times_successful / template.times_used) * 100).toFixed(1)
                : '0.0';

            const status = template.is_active ? '✅ Ativo' : '❌ Inativo';
            const aiCreated = template.created_from_ai ? '🤖 AI-Generated' : '👤 Manual';

            console.log(`\n📄 Template #${template.id}: ${template.template_name}`);
            console.log(`   Fornecedor: ${template.fornecedor.nome} (NIF: ${template.fornecedor.nif})`);
            console.log(`   Status: ${status} | ${aiCreated}`);
            console.log(`   Confidence: ${template.confidence_score.toFixed(1)}%`);
            console.log(`   Uso: ${template.times_successful}/${template.times_used} sucessos (${taxaSucesso}%)`);
            console.log(`   Versão: ${template.template_version}`);
            console.log(`   Criado: ${template.createdAt.toISOString().split('T')[0]}`);
            console.log(`   Atualizado: ${template.updatedAt.toISOString().split('T')[0]}`);

            // Show a sample of the config
            const headerConfig = template.header_config as any;
            if (headerConfig && Object.keys(headerConfig).length > 0) {
                console.log(`   Header patterns: ${Object.keys(headerConfig).slice(0, 3).join(', ')}...`);
            }
        }

        console.log('\n' + '='.repeat(120));
        console.log('\n📊 SUMMARY:');
        const activeCount = templates.filter(t => t.is_active).length;
        const aiGeneratedCount = templates.filter(t => t.created_from_ai).length;
        const avgConfidence = templates.reduce((sum, t) => sum + t.confidence_score, 0) / templates.length;
        const totalUsage = templates.reduce((sum, t) => sum + t.times_used, 0);

        console.log(`   Total Templates: ${templates.length}`);
        console.log(`   Active: ${activeCount} | Inactive: ${templates.length - activeCount}`);
        console.log(`   AI-Generated: ${aiGeneratedCount} | Manual: ${templates.length - aiGeneratedCount}`);
        console.log(`   Average Confidence: ${avgConfidence.toFixed(1)}%`);
        console.log(`   Total Usage: ${totalUsage} times`);
        console.log('');

    } catch (error) {
        console.error('❌ Error querying templates:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

listTemplates()
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
