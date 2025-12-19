/**
 * Frontend Permissions System
 * Mirrors backend permissions for UI control
 */

export const ROLES = {
    ADMIN: 'admin',
    GESTOR: 'gestor',
    OPERADOR: 'operador',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
    // User Management
    USERS_VIEW: [ROLES.ADMIN],
    USERS_INVITE: [ROLES.ADMIN],
    USERS_UPDATE_ROLE: [ROLES.ADMIN],
    USERS_DELETE: [ROLES.ADMIN],

    // Products & Families
    PRODUCTS_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    PRODUCTS_CREATE: [ROLES.ADMIN, ROLES.GESTOR],
    PRODUCTS_UPDATE: [ROLES.ADMIN, ROLES.GESTOR],
    PRODUCTS_DELETE: [ROLES.ADMIN, ROLES.GESTOR],

    // Purchases & Invoices
    PURCHASES_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    PURCHASES_CREATE: [ROLES.ADMIN, ROLES.GESTOR],
    INVOICES_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    INVOICES_IMPORT: [ROLES.ADMIN, ROLES.GESTOR],

    // Recipes (All users)
    RECIPES_VIEW: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    RECIPES_CREATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    RECIPES_UPDATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    RECIPES_DELETE: [ROLES.ADMIN, ROLES.GESTOR],

    // Menus (All users)
    MENUS_VIEW: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    MENUS_CREATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    MENUS_UPDATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    MENUS_DELETE: [ROLES.ADMIN, ROLES.GESTOR],

    // Combos (All users)
    COMBOS_VIEW: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    COMBOS_CREATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],

    // Inventory (All users)
    INVENTORY_VIEW: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    INVENTORY_COUNT: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],

    // Calculator (All users)
    CALCULATOR_VIEW: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],

    // Sales & Reports
    SALES_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    SALES_CREATE: [ROLES.ADMIN, ROLES.GESTOR],
    REPORTS_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    DASHBOARD_STATS: [ROLES.ADMIN, ROLES.GESTOR],

    // Alerts
    ALERTS_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    ALERTS_MANAGE: [ROLES.ADMIN, ROLES.GESTOR],

    // Settings
    SETTINGS_VIEW: [ROLES.ADMIN],
    SETTINGS_UPDATE: [ROLES.ADMIN],
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
    [ROLES.ADMIN]: {
        label: 'Administrador',
        description: 'Acesso total ao sistema',
        color: 'red',
    },
    [ROLES.GESTOR]: {
        label: 'Gestor',
        description: 'Gestão completa exceto utilizadores',
        color: 'blue',
    },
    [ROLES.OPERADOR]: {
        label: 'Operador',
        description: 'Acesso a receitas, menus e inventário',
        color: 'green',
    },
} as const;
