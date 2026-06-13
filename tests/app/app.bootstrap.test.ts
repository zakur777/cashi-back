import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/index.js";
import { signAuthToken } from "../../src/lib/auth-token.js";
import { authMiddleware } from "../../src/middlewares/auth.middleware.js";
import type { AppEnv } from "../../src/types/app-env.js";

const authSecret = "test-auth-secret";
const originalNodeEnv = process.env.NODE_ENV;
const originalDatabaseUrl = process.env.DATABASE_URL;

function restoreRuntimeEnv() {
	if (originalNodeEnv === undefined) {
		delete process.env.NODE_ENV;
	} else {
		process.env.NODE_ENV = originalNodeEnv;
	}

	if (originalDatabaseUrl === undefined) {
		delete process.env.DATABASE_URL;
	} else {
		process.env.DATABASE_URL = originalDatabaseUrl;
	}
}

describe("app bootstrap", () => {
	beforeEach(() => {
		process.env.JWT_SECRET = authSecret;
	});

	afterEach(() => {
		restoreRuntimeEnv();
	});

	it("keeps root and health public", async () => {
		const rootResponse = await app.request("/");
		const healthResponse = await app.request("/health");

		expect(rootResponse.status).toBe(200);
		expect(await rootResponse.json()).toEqual({
			name: "cashi-api",
			status: "running",
		});
		expect(healthResponse.status).toBe(200);
		expect(await healthResponse.json()).toEqual({ status: "ok" });
	});

	it("makes production health unhealthy when DATABASE_URL is missing", async () => {
		process.env.NODE_ENV = "production";
		delete process.env.DATABASE_URL;

		const response = await app.request("/health");

		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			status: "unhealthy",
			checks: { database: "unconfigured" },
			error: "DATABASE_URL is required in production.",
		});
	});

	it("keeps auth endpoints public", async () => {
		const registerResponse = await app.request("/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "invalid", password: "short" }),
		});
		const loginResponse = await app.request("/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "invalid", password: "short" }),
		});

		expect(registerResponse.status).toBe(400);
		expect(loginResponse.status).toBe(400);
	});

	it("rejects protected routes without a token", async () => {
		const categoriesResponse = await app.request("/categories");
		const transactionsResponse = await app.request("/transactions");

		expect(categoriesResponse.status).toBe(401);
		expect(await categoriesResponse.json()).toEqual({ error: "Unauthorized." });
		expect(transactionsResponse.status).toBe(401);
		expect(await transactionsResponse.json()).toEqual({
			error: "Unauthorized.",
		});
	});

	it("accepts a valid token on protected routes", async () => {
		const token = signAuthToken(1);
		const response = await app.request("/categories", {
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.status).not.toBe(401);
	});

	it("makes the authenticated user available to protected handlers", async () => {
		const protectedApp = new Hono<AppEnv>();
		protectedApp.use("/probe", authMiddleware);
		protectedApp.get("/probe", (c) => c.json(c.get("authUser"), 200));

		const response = await protectedApp.request("/probe", {
			headers: { authorization: `Bearer ${signAuthToken(42)}` },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ userId: 42 });
	});
});
