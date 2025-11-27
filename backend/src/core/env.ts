import z from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Trim all environment variables to handle Windows CRLF line endings
const trimmedEnv = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => [key, value?.trim()])
);

const envSchema = z.object({
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    JWT_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
});

export const env = envSchema.parse(trimmedEnv);
