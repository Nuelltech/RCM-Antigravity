import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const menuItemsData = [
    // Analytics Group (2 items)
    {
        key: 'dashboard',
        name: 'Dashboard',
        href: '/dashboard',
        icon: 'LayoutDashboard',
        sortOrder: 10,
        requiredFeature: 'dashboard',
        group: 'analytics',
        permissions: ['owner', 'admin', 'gestor']
    },
    {
        key: 'alerts',
        name: 'Alertas',
        href: '/alerts',
        icon: 'Bell',
        sortOrder: 20,
        requiredFeature: 'dashboard',
        group: 'analytics',
        permissions: ['owner', 'admin', 'gestor']
    },

    // Sales Group (3 items)
    {
        key: 'sales',
        name: 'Vendas',
        href: '/sales',
        icon: 'BarChart3',
        sortOrder: 30,
        requiredFeature: 'sales',
        group: 'sales',
        permissions: ['owner', 'admin', 'gestor']
    },
    {
        key: 'sales-import',
        name: 'Importar Vendas',
        href: '/sales/importacoes',
        icon: 'BarChart3',
        sortOrder: 40,
        requiredFeature: 'sales',
        group: 'sales',
        permissions: ['owner', 'admin', 'gestor']
    },
    {
        key: 'menu-engineering',
        name: 'Menu Engineering',
        href: '/menu-analysis',
        icon: 'TrendingUp',
        sortOrder: 90,
        requiredFeature: 'sales',
        group: 'sales',
        permissions: ['owner', 'admin', 'gestor', 'operador']
    },

    // Products & Recipes Group (6 items)
    {
        key: 'products',
        name: 'Produtos',
        href: '/products',
        icon: 'Package',
        sortOrder: 50,
        requiredFeature: 'products_recipes',
        group: 'products',
        permissions: ['owner', 'admin', 'gestor']
    },
    {
        key: 'recipes',
        name: 'Receitas',
        href: '/recipes',
        icon: 'ChefHat',
        sortOrder: 60,
        requiredFeature: 'products_recipes',
        group: 'products',
        permissions: ['owner', 'admin', 'gestor', 'operador']
    },
    {
        key: 'combos',
        name: 'Combos',
        href: '/combos',
        icon: 'Package2',
        sortOrder: 70,
        requiredFeature: 'products_recipes',
        group: 'products',
        permissions: ['owner', 'admin', 'gestor', 'operador']
    },
    {
        key: 'formats',
        name: 'Formatos de Venda',
        href: '/template-formatos-venda',
        icon: 'PackageOpen',
        sortOrder: 75,
        requiredFeature: 'products_recipes',
        group: 'products',
        permissions: ['owner', 'admin', 'gestor']
    },
    {
        key: 'menu',
        name: 'Menu',
        href: '/menu',
        icon: 'MenuSquare',
        sortOrder: 80,
        requiredFeature: 'products_recipes',
        group: 'products',
        permissions: ['owner', 'admin', 'gestor', 'operador']
    },
    {
        key: 'calculator',
        name: 'Calculadora',
        href: '/purchases/calculator',
        icon: 'Calculator',
        sortOrder: 120,
        requiredFeature: 'products_recipes',
        group: 'products',
        permissions: ['owner', 'admin', 'gestor', 'operador']
    },

    // Purchases Group (2 items)
    {
        key: 'purchases',
        name: 'Compras',
        href: '/purchases',
        icon: 'ShoppingCart',
        sortOrder: 100,
        requiredFeature: 'invoices',
        group: 'purchases',
        permissions: ['owner', 'admin', 'gestor']
    },
    {
        key: 'invoices',
        name: 'Importar Faturas',
        href: '/invoices',
        icon: 'FileText',
        sortOrder: 110,
        requiredFeature: 'invoices',
        group: 'purchases',
        permissions: ['owner', 'admin', 'gestor']
    },

    // Inventory Group (2 items)
    {
        key: 'inventory',
        name: 'Inventário',
        href: '/inventory',
        icon: 'Warehouse',
        sortOrder: 130,
        requiredFeature: 'inventory',
        group: 'inventory',
        permissions: ['owner', 'admin', 'gestor', 'operador']
    },
    {
        key: 'consumos',
        name: 'Consumos',
        href: '/consumos',
        icon: 'PieChart',
        sortOrder: 140,
        requiredFeature: 'inventory',
        group: 'inventory',
        permissions: ['owner', 'admin', 'gestor', 'operador']
    },

    // Settings Group (3 items - no feature requirement)
    {
        key: 'restaurant-data',
        name: 'Dados do Restaurante',
        href: '/dados-restaurante',
        icon: 'Building2',
        sortOrder: 150,
        requiredFeature: null,
        group: 'settings',
        permissions: ['owner', 'admin']
    },
    {
        key: 'subscription',
        name: 'Subscrição',
        href: '/settings/subscription',
        icon: 'CreditCard',
        sortOrder: 160,
        requiredFeature: null,
        group: 'settings',
        permissions: ['owner', 'admin']
    },
    {
        key: 'users',
        name: 'Utilizadores',
        href: '/users',
        icon: 'Users',
        sortOrder: 170,
        requiredFeature: null,
        group: 'settings',
        permissions: ['owner', 'admin']
    },
];

async function seedMenuItems() {
    console.log('🌱 Seeding navigation menu items...');

    for (const item of menuItemsData) {
        try {
            // Create navigation menu item
            const menuItem = await prisma.navigationMenuItem.upsert({
                where: { key: item.key },
                update: {
                    name: item.name,
                    href: item.href,
                    icon: item.icon,
                    sort_order: item.sortOrder,
                    required_feature: item.requiredFeature,
                    group: item.group,
                    active: true,
                },
                create: {
                    key: item.key,
                    name: item.name,
                    href: item.href,
                    icon: item.icon,
                    sort_order: item.sortOrder,
                    required_feature: item.requiredFeature,
                    group: item.group,
                    active: true,
                }
            });

            // Create permissions
            for (const role of item.permissions) {
                await prisma.navigationPermission.upsert({
                    where: {
                        navigation_menu_item_id_role: {
                            navigation_menu_item_id: menuItem.id,
                            role: role
                        }
                    },
                    update: {},
                    create: {
                        navigation_menu_item_id: menuItem.id,
                        role: role,
                    }
                });
            }

            console.log(`   ✓ Processed: ${menuItem.name}`);
        } catch (error) {
            console.error(`✗ Failed to process ${item.name}:`, error);
        }
    }

    console.log('\n✅ Navigation menu items seeding completed!');
}

seedMenuItems()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
