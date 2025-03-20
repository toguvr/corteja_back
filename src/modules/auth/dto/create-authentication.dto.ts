import { z } from 'zod';

export const authenticateBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type CreateAuthenticationDto = z.infer<typeof authenticateBodySchema>;
