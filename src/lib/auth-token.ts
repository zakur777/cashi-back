import jwt from "jsonwebtoken";

const AUTH_TOKEN_EXPIRES_IN = "1d" as const;

export interface AuthTokenPayload {
	userId: number;
}

interface JwtAuthPayload {
	sub?: string;
	userId?: unknown;
}

function getJwtSecret(): string {
	const secret = process.env.JWT_SECRET;

	if (!secret) {
		throw new Error("JWT_SECRET is required.");
	}

	return secret;
}

function isJwtPayload(value: unknown): value is JwtAuthPayload {
	return typeof value === "object" && value !== null;
}

function readUserId(payload: JwtAuthPayload): number | null {
	if (typeof payload.userId === "number" && Number.isInteger(payload.userId)) {
		return payload.userId;
	}

	if (typeof payload.sub === "string") {
		const parsedSub = Number(payload.sub);
		return Number.isInteger(parsedSub) ? parsedSub : null;
	}

	return null;
}

export function signAuthToken(userId: number): string {
	return jwt.sign({ userId }, getJwtSecret(), {
		subject: String(userId),
		expiresIn: AUTH_TOKEN_EXPIRES_IN,
	});
}

export function verifyAuthToken(token: string): AuthTokenPayload {
	const decoded = jwt.verify(token, getJwtSecret());

	if (!isJwtPayload(decoded)) {
		throw new Error("Invalid auth token payload.");
	}

	const userId = readUserId(decoded);

	if (userId === null) {
		throw new Error("Invalid auth token payload.");
	}

	return { userId };
}
