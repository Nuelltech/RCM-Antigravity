export enum UserRole {
    ADMIN = 'ADMIN',
    SALES_SUPPORT = 'SALES_SUPPORT',
    SALES = 'SALES' // "Vendas"
}

export const ROLE_LABELS = {
    [UserRole.ADMIN]: 'Admin',
    [UserRole.SALES_SUPPORT]: 'Sales Support',
    [UserRole.SALES]: 'Vendas'
};

export const ROLE_PERMISSIONS = {
    [UserRole.ADMIN]: ['*'],
    [UserRole.SALES_SUPPORT]: ['system', 'tenants', 'billing'],
    [UserRole.SALES]: ['leads']
};

export type Permission = keyof typeof ROLE_PERMISSIONS | string;
