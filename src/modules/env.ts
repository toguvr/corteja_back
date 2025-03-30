import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string(),
  PORT: z.coerce.number().optional().default(3333),
  PAGARME_API: z.string(),
  PAGARME_RECEIVER_ID: z.string(),
});

export type Env = z.infer<typeof envSchema>;
