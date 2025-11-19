import z from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    JWT_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);
