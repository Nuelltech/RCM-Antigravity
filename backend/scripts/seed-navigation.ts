
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Navigation Seeding...');

    // Define the menu structure matching user screenshot (18 items)
    // Localization: Portuguese
    const menuItems = [
        { key: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', sort_order: 10, required_feature: 'dashboard', group: 'analytics', roles: ['owner', 'admin', 'manager'] },
        { key: 'alerts', name: 'Alertas', href: '/alerts', icon: 'Bell', sort_order: 20, required_feature: 'dashboard', group: 'analytics', roles: ['owner', 'admin', 'manager'] },
        { key: 'sales', name: 'Vendas', href: '/sales', icon: 'BarChart3', sort_order: 30, required_feature: 'sales', group: 'sales', roles: ['owner', 'admin', 'manager', 'operador'] },
        { key: 'sales-import', name: 'Importar Vendas', href: '/sales/importacoes', icon: 'BarChart3', sort_order: 40, required_feature: 'sales', group: 'sales', roles: ['owner', 'admin', 'manager'] },
        { key: 'menu-engineering', name: 'Menu Engineering', href: '/menu-analysis', icon: 'TrendingUp', sort_order: 90, required_feature: 'sales', group: 'sales', roles: ['owner', 'admin', 'manager'] },
        { key: 'products', name: 'Produtos', href: '/products', icon: 'Package', sort_order: 50, required_feature: 'products_recipes', group: 'products', roles: ['owner', 'admin', 'manager', 'operador'] },
        { key: 'recipes', name: 'Receitas', href: '/recipes', icon: 'ChefHat', sort_order: 60, required_feature: 'products_recipes', group: 'products', roles: ['owner', 'admin', 'manager', 'operador', 'visualizador'] },
        { key: 'combos', name: 'Combos', href: '/combos', icon: 'Package2', sort_order: 70, required_feature: 'products_recipes', group: 'products', roles: ['owner', 'admin', 'manager'] },
        { key: 'formats', name: 'Formatos de Venda', href: '/template-formatos-venda', icon: 'PackageOpen', sort_order: 75, required_feature: 'products_recipes', group: 'products', roles: ['owner', 'admin', 'manager'] },
        { key: 'menu', name: 'Menu', href: '/menu', icon: 'MenuSquare', sort_order: 80, required_feature: 'products_recipes', group: 'products', roles: ['owner', 'admin', 'manager'] },
        { key: 'calculator', name: 'Calculadora', href: '/purchases/calculator', icon: 'Calculator', sort_order: 120, required_feature: 'products_recipes', group: 'products', roles: ['owner', 'admin', 'manager'] },
        { key: 'purchases', name: 'Compras', href: '/purchases', icon: 'ShoppingCart', sort_order: 100, required_feature: 'invoices', group: 'purchases', roles: ['owner', 'admin', 'manager'] },
        { key: 'invoices', name: 'Importar Faturas', href: '/invoices', icon: 'FileText', sort_order: 110, required_feature: 'invoices', group: 'purchases', roles: ['owner', 'admin', 'manager'] },
        { key: 'inventory', name: 'Inventário', href: '/inventory', icon: 'Warehouse', sort_order: 130, required_feature: 'inventory', group: 'inventory', roles: ['owner', 'admin', 'manager'] },
        { key: 'consumos', name: 'Consumos', href: '/consumos', icon: 'PieChart', sort_order: 140, required_feature: 'inventory', group: 'inventory', roles: ['owner', 'admin', 'manager'] },
        { key: 'restaurant-data', name: 'Dados do Restaurante', href: '/dados-restaurante', icon: 'Building2', sort_order: 150, required_feature: null, group: 'settings', roles: ['owner', 'admin'] },
        { key: 'subscription', name: 'Subscrição', href: '/settings/subscription', icon: 'CreditCard', sort_order: 160, required_feature: null, group: 'settings', roles: ['owner', 'admin'] },
        { key: 'users', name: 'Utilizadores', href: '/users', icon: 'Users', sort_order: 170, required_feature: null, group: 'settings', roles: ['owner', 'admin'] },
    ];

    console.log(`📋 Found ${menuItems.length} menu items to seed.`);

    // Add 'settings' route if it was intended to be separate, but based on screenshot it seems 'subscription', 'users', 'restaurant-data' replaced it or are under it.
    // However, screenshot shows 18 items. The list above has 18 items.

    for (const item of menuItems) {
        console.log(`   Processing: ${item.name} (${item.key})`);

        // 1. Upsert Navigation Item
        const navItem = await prisma.navigationMenuItem.upsert({
            where: { key: item.key },
            update: {
                name: item.name,
                href: item.href,
                icon: item.icon,
                sort_order: item.sort_order,
                required_feature: item.required_feature,
                group: item.group,
                active: true,
            },
            create: {
                key: item.key,
                name: item.name,
                href: item.href,
                icon: item.icon,
                sort_order: item.sort_order,
                required_feature: item.required_feature,
                group: item.group,
                active: true,
            },
        });

        // 2. Sync Permissions (Delete existing and re-add to ensure exact match)
        await prisma.navigationPermission.deleteMany({
            where: { navigation_menu_item_id: navItem.id },
        });

        if (item.roles.length > 0) {
            await prisma.navigationPermission.createMany({
                data: item.roles.map((role) => ({
                    navigation_menu_item_id: navItem.id,
                    role: role,
                })),
            });
        }
    }

    console.log('✅ Navigation Seeding Completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
