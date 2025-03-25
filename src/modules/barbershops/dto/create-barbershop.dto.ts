import { z } from 'zod';
export const createBarbershopBodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export type CreateBarbershopDto = z.infer<typeof createBarbershopBodySchema>;
