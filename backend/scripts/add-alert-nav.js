const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Inserting Alertas Erosao menu item...');
    
    // Check if it already exists
    const existing = await prisma.navigationMenuItem.findUnique({
        where: { key: 'alertas-erosao' }
    });
    
    if (existing) {
        console.log('Already exists!', existing);
        return;
    }
    
    const navItem = await prisma.navigationMenuItem.create({
        data: {
            key: 'alertas-erosao',
            name: 'Radar de Risco',
            href: '/alertas-erosao',
            icon: 'Flame',
            sort_order: 25,
            required_feature: 'dashboard',
            group: 'analytics',
            active: true
        }
    });
    
    console.log('Created NavItem', navItem);
    
    const roles = ['owner', 'admin', 'manager'];
    
    for (const role of roles) {
        await prisma.navigationPermission.create({
            data: {
                navigation_menu_item_id: navItem.id,
                role: role
            }
        });
    }
    
    console.log('Permissions added!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
