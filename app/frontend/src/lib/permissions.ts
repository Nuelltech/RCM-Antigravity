/**
 * Frontend Permissions System
 * Mirrors backend permissions for UI control
 */

export const ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MANAGER: 'manager',
    OPERATOR: 'operator',
    VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
    // User Management
    USERS_VIEW: [ROLES.OWNER, ROLES.ADMIN],
    USERS_INVITE: [ROLES.OWNER, ROLES.ADMIN],
    USERS_UPDATE_ROLE: [ROLES.OWNER, ROLES.ADMIN],
    USERS_DELETE: [ROLES.OWNER, ROLES.ADMIN],

    // Products & Families
    PRODUCTS_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.VIEWER],
    PRODUCTS_CREATE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
    PRODUCTS_UPDATE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
    PRODUCTS_DELETE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],

    // Purchases & Invoices
    PURCHASES_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.VIEWER],
    PURCHASES_CREATE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
    INVOICES_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.VIEWER],
    INVOICES_IMPORT: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],

    // Recipes (All users)
    RECIPES_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.VIEWER],
    RECIPES_CREATE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR],
    RECIPES_UPDATE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR],
    RECIPES_DELETE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],

    // Menus (All users)
    MENUS_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.VIEWER],
    MENUS_CREATE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR],
    MENUS_UPDATE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR],
    MENUS_DELETE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],

    // Combos (All users)
    COMBOS_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.VIEWER],
    COMBOS_CREATE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR],

    // Inventory (All users)
    INVENTORY_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.VIEWER],
    INVENTORY_COUNT: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR],

    // Calculator (All users)
    CALCULATOR_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.VIEWER],

    // Sales & Reports
    SALES_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
    SALES_CREATE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR], // Operators make sales
    REPORTS_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],
    DASHBOARD_STATS: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.VIEWER],

    // Alerts
    ALERTS_VIEW: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.VIEWER],
    ALERTS_MANAGE: [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER],

    // Settings
    SETTINGS_VIEW: [ROLES.OWNER, ROLES.ADMIN],
    SETTINGS_UPDATE: [ROLES.OWNER, ROLES.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string | null, permission: Permission): boolean {
    if (!role) return false;
    const allowedRoles = PERMISSIONS[permission] as readonly string[];
    return allowedRoles.includes(role);
}

/**
 * Check if user has any of the given permissions
 */
export function hasAnyPermission(role: string | null, permissions: Permission[]): boolean {
    return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if user has all of the given permissions
 */
export function hasAllPermissions(role: string | null, permissions: Permission[]): boolean {
    return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get current user role from localStorage
 */
export function getCurrentUserRole(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('userRole');
}

/**
 * Role metadata for display
 */
export const ROLE_METADATA = {
    [ROLES.OWNER]: {
        label: 'Proprietário',
        description: 'Acesso total e gestão de pagamentos',
        color: 'purple',
    },
    [ROLES.ADMIN]: {
        label: 'Administrador',
        description: 'Acesso total ao sistema',
        color: 'red',
    },
    [ROLES.MANAGER]: {
        label: 'Gestor',
        description: 'Gestão completa exceto utilizadores',
        color: 'blue',
    },
    [ROLES.OPERATOR]: {
        label: 'Operador',
        description: 'Acesso a receitas, menus e inventário',
        color: 'green',
    },
    [ROLES.VIEWER]: {
        label: 'Visualizador',
        description: 'Acesso de apenas leitura',
        color: 'gray',
    }
} as const;
