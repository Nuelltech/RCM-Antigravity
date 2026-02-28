
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // ⚠️ EDITE AQUI O EMAIL SE FOR OUTRO
    const email = 'nrmm81@gmail.com';

    console.log(`🔍 A procurar utilizador: ${email}...`);

    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
        console.error('❌ Utilizador não encontrado! Verifique o email.');
        return;
    }

    console.log(`✅ Utilizador encontrado: ${user.nome} (ID: ${user.id})`);

    // 1. Tabela USER: Garantir que o email está verificado
    if (!user.email_verificado) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                email_verificado: true,
                verification_code: null // Limpar token antigo
            }
        });
        console.log('✅ Tabela [User]: email_verificado = true');
    }

    // 2. Tabela USER_TENANT: Ativar a relação com o Restaurante
    const userTenants = await prisma.userTenant.findMany({
        where: { user_id: user.id },
        include: { tenant: true }
    });

    if (userTenants.length === 0) {
        console.log('⚠️ Este utilizador não tem nenhuma associação com restaurantes.');
        return;
    }

    for (const ut of userTenants) {
        if (!ut.ativo) {
            await prisma.userTenant.update({
                where: {
                    user_id_tenant_id: {
                        user_id: user.id,
                        tenant_id: ut.tenant_id
                    }
                },
                data: {
                    ativo: true,
                    activated_at: new Date()
                }
            });
            console.log(`✅ Tabela [UserTenant]: ativo = true para o restaurante '${ut.tenant.nome_restaurante}'`);
        } else {
            console.log(`ℹ️ Já está ativo no restaurante: '${ut.tenant.nome_restaurante}'`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
