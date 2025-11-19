import { PrismaClient } from '@prisma/client';
import { prisma } from './database';

export class TenantDB {
    private tenantId: number;
    private db: PrismaClient;

    constructor(tenantId: number) {
        if (!tenantId) {
            throw new Error('Tenant ID is required for TenantDB');
        }
        this.tenantId = tenantId;
        this.db = prisma;
    }

    // Generic findById with tenant isolation
    async findById<T>(model: string, id: number | bigint): Promise<T | null> {
        // @ts-ignore - Dynamic model access
        return this.db[model].findFirst({
            where: {
                id: id,
                tenant_id: this.tenantId,
            },
        });
    }

    // Generic findMany with tenant isolation
    async findMany<T>(model: string, args: any = {}): Promise<T[]> {
        // @ts-ignore
        return this.db[model].findMany({
            ...args,
            where: {
                ...args.where,
                tenant_id: this.tenantId,
            },
        });
    }

    // Generic create with tenant injection
    async create<T>(model: string, data: any): Promise<T> {
        // @ts-ignore
        return this.db[model].create({
            data: {
                ...data,
                tenant_id: this.tenantId,
            },
        });
    }

    // Generic update with tenant isolation
    async update<T>(model: string, id: number | bigint, data: any): Promise<T> {
        // @ts-ignore
        return this.db[model].update({
            where: {
                id: id,
                tenant_id: this.tenantId, // Prisma doesn't support composite PK in update directly for id, but we can use updateMany or ensure ID is unique globally. 
                // However, for safety, we should verify tenant ownership first or use updateMany.
                // Since our IDs are auto-increment global, we can just use ID, but to be strict:
            },
            data: data,
        });
        // Note: Prisma update requires a unique input. If ID is unique, it's fine. 
        // But to strictly enforce tenant, we might want to use updateMany or a check before.
        // For this implementation, we'll assume ID is globally unique (which it is in MySQL AI)
        // BUT we should check if the record belongs to the tenant first.
    }

    // Safer update ensuring tenant ownership
    async safeUpdate<T>(model: string, id: number, data: any): Promise<T> {
        const record = await this.findById(model, id);
        if (!record) {
            throw new Error('Record not found or access denied');
        }
        // @ts-ignore
        return this.db[model].update({
            where: { id },
            data,
        });
    }

    async delete(model: string, id: number) {
        const record = await this.findById(model, id);
        if (!record) {
            throw new Error('Record not found or access denied');
        }
        // @ts-ignore
        return this.db[model].delete({
            where: { id },
        });
    }
}
