import { z } from "zod";

const passwordSchema = z
	.string()
	.min(8, { error: "Password must be at least 8 characters." });

const emailSchema = z
	.email({ error: "Invalid email." })
	.transform((email) => email.toLowerCase());

export const registerSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
