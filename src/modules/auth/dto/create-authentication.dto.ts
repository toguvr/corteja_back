import { z } from 'zod';

export const authenticateBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.string().optional(),
});

export type CreateAuthenticationDto = z.infer<typeof authenticateBodySchema>;
