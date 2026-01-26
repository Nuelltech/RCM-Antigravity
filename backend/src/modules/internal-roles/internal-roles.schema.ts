import { z } from 'zod';

// Permission Schema
export const permissionSchema = z.object({
    id: z.number(),
    slug: z.string(),
    description: z.string().nullable(),
    module: z.string()
});

// Role Schema
export const roleSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    permissions: z.array(z.object({
        permission: permissionSchema
    })),
    createdAt: z.date(),
    updatedAt: z.date()
});

// Helper for pagination
const paginationSchema = z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('20').transform(Number),
    search: z.string().optional(),
});

// Create Role
export const createInternalRoleSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    permissions: z.array(z.number()).optional(), // Array of Permission IDs
});

// Update Role
export const updateInternalRoleSchema = z.object({
    description: z.string().optional(),
    permissions: z.array(z.number()).optional(), // Array of Permission IDs (Replace all)
});

// Routes Inputs
export const listRolesQuerySchema = paginationSchema;
export const roleIdParamSchema = z.object({
    id: z.string().transform(Number),
});

// Responses
export const internalRoleListResponseSchema = z.object({
    data: z.array(roleSchema),
    meta: z.object({
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        pages: z.number(),
    }),
});

export const internalPermissionListResponseSchema = z.array(permissionSchema);


export type CreateInternalRoleInput = z.infer<typeof createInternalRoleSchema>;
export type UpdateInternalRoleInput = z.infer<typeof updateInternalRoleSchema>;
