import { z } from 'zod';

const categoryTypeSchema = z.enum(['income', 'expense']);
const categoryColorSchema = z.enum([
  '#281C59',
  '#4E8D9C',
  '#85C79A',
  '#EDF7BD',
  '#FF8A7A',
  '#FFD166',
  '#7DD3FC',
  '#A7F3D0',
  '#C9C4FF',
  '#F9A8D4',
  '#FDBA74',
  '#60A5FA'
]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  type: categoryTypeSchema.default('expense'),
  color: categoryColorSchema.default('#EDF7BD')
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: 'At least one field is required.' }
);

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
