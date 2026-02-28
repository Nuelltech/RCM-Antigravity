
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Standardizing Database Roles to English ---');

    // 1. Update NavigationPermission Roles
    console.log('\n1. Updating NavigationPermission...');
    const npOperador = await prisma.navigationPermission.updateMany({
        where: { role: 'operador' },
        data: { role: 'operator' }
    });
    console.log(`   - Updated ${npOperador.count} 'operador' -> 'operator'`);

    const npVisualizador = await prisma.navigationPermission.updateMany({
        where: { role: 'visualizador' },
        data: { role: 'viewer' }
    });
    console.log(`   - Updated ${npVisualizador.count} 'visualizador' -> 'viewer'`);

    const npGestor = await prisma.navigationPermission.updateMany({
        where: { role: 'gestor' },
        data: { role: 'manager' }
    });
    console.log(`   - Updated ${npGestor.count} 'gestor' -> 'manager'`);


    // 2. Update UserTenant Roles
    console.log('\n2. Updating UserTenant...');
    const utOperador = await prisma.userTenant.updateMany({
        where: { role: 'operador' },
        data: { role: 'operator' }
    });
    console.log(`   - Updated ${utOperador.count} 'operador' -> 'operator'`);

    const utVisualizador = await prisma.userTenant.updateMany({
        where: { role: 'visualizador' },
        data: { role: 'viewer' }
    });
    console.log(`   - Updated ${utVisualizador.count} 'visualizador' -> 'viewer'`);

    const utGestor = await prisma.userTenant.updateMany({
        where: { role: 'gestor' },
        data: { role: 'manager' }
    });
    console.log(`   - Updated ${utGestor.count} 'gestor' -> 'manager'`);

    // 3. Update User Roles (Legacy field, but good to clean up if used)
    // Assuming User model doesn't have role, skip. 
    // If it did, we would update it here.
    // console.log('\n3. Updating User (legacy)...');
    // const uGestor = await prisma.user.updateMany({ where: { role: 'gestor' }, data: { role: 'manager' } });

    console.log('\n--- Migration Complete ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
