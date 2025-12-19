/**
 * RBAC Permissions System
 * 
 * Defines all roles and their associated permissions across the system.
 */

export const ROLES = {
    ADMIN: 'admin',
    GESTOR: 'gestor',
    OPERADOR: 'operador',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Permission definitions
 * Each permission maps to an array of roles that have access
 */
export const PERMISSIONS = {
    // ============================================
    // USER MANAGEMENT
    // ============================================
    USERS_VIEW: [ROLES.ADMIN],
    USERS_INVITE: [ROLES.ADMIN],
    USERS_UPDATE_ROLE: [ROLES.ADMIN],
    USERS_DELETE: [ROLES.ADMIN],

    // ============================================
    // PRODUCTS & FAMILIES
    // ============================================
    PRODUCTS_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    PRODUCTS_CREATE: [ROLES.ADMIN, ROLES.GESTOR],
    PRODUCTS_UPDATE: [ROLES.ADMIN, ROLES.GESTOR],
    PRODUCTS_DELETE: [ROLES.ADMIN, ROLES.GESTOR],
    FAMILIES_MANAGE: [ROLES.ADMIN, ROLES.GESTOR],

    // ============================================
    // PURCHASES & INVOICES
    // ============================================
    PURCHASES_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    PURCHASES_CREATE: [ROLES.ADMIN, ROLES.GESTOR],
    PURCHASES_UPDATE: [ROLES.ADMIN, ROLES.GESTOR],
    PURCHASES_DELETE: [ROLES.ADMIN, ROLES.GESTOR],
    INVOICES_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    INVOICES_IMPORT: [ROLES.ADMIN, ROLES.GESTOR],

    // ============================================
    // RECIPES (All users)
    // ============================================
    RECIPES_VIEW: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    RECIPES_CREATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    RECIPES_UPDATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    RECIPES_DELETE: [ROLES.ADMIN, ROLES.GESTOR],

    // ============================================
    // MENUS (All users)
    // ============================================
    MENUS_VIEW: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    MENUS_CREATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    MENUS_UPDATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    MENUS_DELETE: [ROLES.ADMIN, ROLES.GESTOR],

    // ============================================
    // COMBOS (All users)
    // ============================================
    COMBOS_VIEW: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    COMBOS_CREATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    COMBOS_UPDATE: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    COMBOS_DELETE: [ROLES.ADMIN, ROLES.GESTOR],

    // ============================================
    // INVENTORY (All users)
    // ============================================
    INVENTORY_VIEW: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    INVENTORY_COUNT: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    INVENTORY_CREATE_SESSION: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    INVENTORY_CLOSE_SESSION: [ROLES.ADMIN, ROLES.GESTOR],

    // ============================================
    // CALCULATOR (All users)
    // ============================================
    CALCULATOR_VIEW: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    CALCULATOR_CREATE_LIST: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],
    CALCULATOR_DELETE_LIST: [ROLES.ADMIN, ROLES.GESTOR, ROLES.OPERADOR],

    // ============================================
    // SALES & REPORTS (Admin + Gestor only)
    // ============================================
    SALES_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    SALES_CREATE: [ROLES.ADMIN, ROLES.GESTOR],
    SALES_DELETE: [ROLES.ADMIN],
    REPORTS_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    DASHBOARD_STATS: [ROLES.ADMIN, ROLES.GESTOR],

    // ============================================
    // ALERTS & NOTIFICATIONS (Admin + Gestor)
    // ============================================
    ALERTS_VIEW: [ROLES.ADMIN, ROLES.GESTOR],
    ALERTS_MANAGE: [ROLES.ADMIN, ROLES.GESTOR],

    // ============================================
    // SETTINGS (Admin only)
    // ============================================
    SETTINGS_VIEW: [ROLES.ADMIN],
    SETTINGS_UPDATE: [ROLES.ADMIN],
    TENANT_MANAGE: [ROLES.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
    const allowedRoles = PERMISSIONS[permission] as readonly string[];
    return allowedRoles.includes(role);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
    return Object.entries(PERMISSIONS)
        .filter(([_, roles]) => (roles as readonly string[]).includes(role))
        .map(([permission]) => permission as Permission);
}

/**
 * Role metadata for display
 */
export const ROLE_METADATA = {
    [ROLES.ADMIN]: {
        label: 'Administrador',
        description: 'Acesso total ao sistema, incluindo gestão de utilizadores',
        color: 'red',
        icon: 'shield',
    },
    [ROLES.GESTOR]: {
        label: 'Gestor',
        description: 'Visualização e gestão completa, exceto utilizadores',
        color: 'blue',
        icon: 'briefcase',
    },
    [ROLES.OPERADOR]: {
        label: 'Operador',
        description: 'Acesso a receitas, menus, inventário e calculadora',
        color: 'green',
        icon: 'user',
    },
} as const;
