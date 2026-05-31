import { z } from "zod";

const transactionTypeSchema = z.enum(["income", "expense"]);

const createTransactionBaseSchema = z.object({
	amount: z.coerce
		.number()
		.positive({ error: "Amount must be greater than 0." }),
	type: transactionTypeSchema,
	description: z.string().trim().optional(),
	date: z.coerce.date(),
	receiptUrl: z.url({ error: "Receipt URL must be valid." }).optional(),
	latitude: z.coerce
		.number({ error: "Latitude must be a number." })
		.min(-90, { error: "Latitude must be greater than or equal to -90." })
		.max(90, { error: "Latitude must be less than or equal to 90." })
		.optional(),
	longitude: z.coerce
		.number({ error: "Longitude must be a number." })
		.min(-180, { error: "Longitude must be greater than or equal to -180." })
		.max(180, { error: "Longitude must be less than or equal to 180." })
		.optional(),
	categoryId: z.coerce
		.number()
		.int()
		.positive({ error: "Category id must be a positive integer." }),
});

export const createTransactionSchema = createTransactionBaseSchema.transform(
	(payload) => ({
		...payload,
		description: payload.description === "" ? undefined : payload.description,
	}),
);

export const updateTransactionSchema = createTransactionBaseSchema
	.partial()
	.refine((payload) => Object.keys(payload).length > 0, {
		error: "At least one field is required.",
	})
	.transform((payload) => ({
		...payload,
		description: payload.description === "" ? undefined : payload.description,
	}));

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
