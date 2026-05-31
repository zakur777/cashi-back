import type { MiddlewareHandler } from "hono";
import { verifyAuthToken } from "../lib/auth-token.js";
import type { AppEnv } from "../types/app-env.js";

const AUTH_SCHEME = "Bearer" as const;

function readBearerToken(authorization: string | undefined): string | null {
	if (!authorization) {
		return null;
	}

	const parts = authorization.trim().split(/\s+/);
	if (parts.length !== 2) {
		return null;
	}

	const [scheme, token] = parts;
	if (scheme !== AUTH_SCHEME || !token) {
		return null;
	}

	return token;
}

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
	const token = readBearerToken(c.req.header("authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized." }, 401);
	}

	try {
		const authUser = verifyAuthToken(token);
		c.set("authUser", authUser);
		await next();
	} catch {
		return c.json({ error: "Unauthorized." }, 401);
	}
};
