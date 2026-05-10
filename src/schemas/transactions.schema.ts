import { z } from 'zod';

const transactionTypeSchema = z.enum(['income', 'expense']);

const createTransactionBaseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0.'),
  type: transactionTypeSchema,
  description: z.string().trim().optional(),
  date: z.coerce.date(),
  categoryId: z.coerce.number().int().positive('Category id must be a positive integer.')
});

export const createTransactionSchema = createTransactionBaseSchema.transform((payload) => ({
  ...payload,
  description: payload.description === '' ? undefined : payload.description
}));

export const updateTransactionSchema = createTransactionBaseSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field is required.'
  })
  .transform((payload) => ({
    ...payload,
    description: payload.description === '' ? undefined : payload.description
  }));

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
