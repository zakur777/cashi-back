import { compare, hash } from "bcryptjs";
import type { Context } from "hono";
import { ZodError } from "zod";
import { signAuthToken } from "../lib/auth-token.js";
import { mapAppError, validationErrorResponse } from "../lib/http-errors.js";
import { usersRepository } from "../repositories/users.repository.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";

const BCRYPT_SALT_ROUNDS = 10 as const;

interface PublicUserResponse {
	id: number;
	email: string;
}

function toPublicUser(user: PublicUserResponse): PublicUserResponse {
	return {
		id: user.id,
		email: user.email,
	};
}

function isUniqueConstraintError(error: unknown): boolean {
	if (typeof error !== "object" || error === null || !("code" in error)) {
		return false;
	}

	return error.code === "P2002";
}

export async function register(c: Context) {
	try {
		const payload = registerSchema.parse(await c.req.json());
		const existingUser = await usersRepository.findByEmail(payload.email);

		if (existingUser) {
			return c.json({ error: "Email already registered." }, 409);
		}

		const passwordHash = await hash(payload.password, BCRYPT_SALT_ROUNDS);
		const user = await usersRepository.create({
			email: payload.email,
			passwordHash,
		});

		return c.json(
			{
				token: signAuthToken(user.id),
				user: toPublicUser(user),
			},
			201,
		);
	} catch (error) {
		if (error instanceof ZodError) {
			const response = validationErrorResponse(error);
			return c.json(response.body, response.status);
		}

		if (isUniqueConstraintError(error)) {
			return c.json({ error: "Email already registered." }, 409);
		}

		const response = mapAppError(error);
		return c.json(response.body, response.status);
	}
}

export async function login(c: Context) {
	try {
		const payload = loginSchema.parse(await c.req.json());
		const user = await usersRepository.findByEmail(payload.email);

		if (!user) {
			return c.json({ error: "Invalid credentials." }, 401);
		}

		const isPasswordValid = await compare(payload.password, user.passwordHash);

		if (!isPasswordValid) {
			return c.json({ error: "Invalid credentials." }, 401);
		}

		return c.json(
			{
				token: signAuthToken(user.id),
				user: toPublicUser(user),
			},
			200,
		);
	} catch (error) {
		if (error instanceof ZodError) {
			const response = validationErrorResponse(error);
			return c.json(response.body, response.status);
		}

		const response = mapAppError(error);
		return c.json(response.body, response.status);
	}
}
