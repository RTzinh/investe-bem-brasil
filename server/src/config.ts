import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  SERVER_API_KEY: z
    .string()
    .min(16, { message: 'SERVER_API_KEY must be at least 16 characters long' }),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-pro'),
  FASTAPI_BASE_URL: z
    .string()
    .url()
    .default('http://localhost:8000/api/v1'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const message = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join(', ');
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const config = parsedEnv.data;
