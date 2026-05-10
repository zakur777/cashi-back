import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.')
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: 'At least one field is required.' }
);

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
