import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it } from "vitest";
import { signAuthToken, verifyAuthToken } from "../../src/lib/auth-token.js";

const authSecret = "test-auth-secret";

describe("auth token helper", () => {
	afterEach(() => {
		process.env.JWT_SECRET = authSecret;
	});

	it("signs and verifies a token for a user id", () => {
		process.env.JWT_SECRET = authSecret;

		const token = signAuthToken(42);

		expect(verifyAuthToken(token)).toEqual({ userId: 42 });
	});

	it("fails with a controlled error when JWT_SECRET is missing", () => {
		delete process.env.JWT_SECRET;

		expect(() => signAuthToken(42)).toThrow("JWT_SECRET is required.");
		expect(() => verifyAuthToken("token")).toThrow("JWT_SECRET is required.");
	});

	it("rejects a token with an invalid auth payload", () => {
		process.env.JWT_SECRET = authSecret;
		const token = jwt.sign({ userId: "not-a-number" }, authSecret);

		expect(() => verifyAuthToken(token)).toThrow("Invalid auth token payload.");
	});
});
