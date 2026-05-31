import { compare, hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUsersRepository } = vi.hoisted(() => ({
	mockUsersRepository: {
		findByEmail: vi.fn(),
		findById: vi.fn(),
		create: vi.fn(),
	},
}));

vi.mock("../../src/repositories/users.repository.js", () => ({
	usersRepository: mockUsersRepository,
}));

import { app } from "../../src/index.js";

const authSecret = "test-auth-secret";
const validPassword = "Password123";

interface CreateUserCall {
	email: string;
	passwordHash: string;
}

const existingUser = {
	id: 1,
	email: "ada@example.com",
	passwordHash: "$2b$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu",
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("auth routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.JWT_SECRET = authSecret;
	});

	it("registers a user with normalized email and returns a token without password fields", async () => {
		mockUsersRepository.findByEmail.mockResolvedValueOnce(null);
		mockUsersRepository.create.mockResolvedValueOnce({
			...existingUser,
			email: "ada@example.com",
			passwordHash: "hashed-password",
		});

		const response = await app.request("/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "ADA@EXAMPLE.COM",
				password: validPassword,
			}),
		});

		expect(response.status).toBe(201);
		expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(
			"ada@example.com",
		);
		expect(mockUsersRepository.create).toHaveBeenCalledWith({
			email: "ada@example.com",
			passwordHash: expect.any(String),
		});
		const createPayload = mockUsersRepository.create.mock.calls[0]?.[0] as
			| CreateUserCall
			| undefined;
		expect(createPayload).toBeDefined();
		if (!createPayload) {
			throw new Error("Expected user creation payload.");
		}
		expect(createPayload.passwordHash).not.toBe(validPassword);
		expect(await compare(validPassword, createPayload.passwordHash)).toBe(true);

		const payload = await response.json();
		expect(payload.token).toEqual(expect.any(String));
		expect(payload.user).toEqual({ id: 1, email: "ada@example.com" });
		expect(payload).not.toHaveProperty("password");
		expect(payload).not.toHaveProperty("passwordHash");
		expect(payload.user).not.toHaveProperty("password");
		expect(payload.user).not.toHaveProperty("passwordHash");
	});

	it("rejects duplicate email with 409", async () => {
		mockUsersRepository.findByEmail.mockResolvedValueOnce(existingUser);

		const response = await app.request("/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "ada@example.com",
				password: validPassword,
			}),
		});

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: "Email already registered.",
		});
		expect(mockUsersRepository.create).not.toHaveBeenCalled();
	});

	it("rejects invalid register payload with 400", async () => {
		const response = await app.request("/auth/register", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "invalid", password: "short" }),
		});

		expect(response.status).toBe(400);
		const payload = await response.json();
		expect(payload.error).toBe("Validation error.");
		expect(Array.isArray(payload.errors)).toBe(true);
		expect(mockUsersRepository.create).not.toHaveBeenCalled();
	});

	it("logs in a registered user and returns a token without password fields", async () => {
		const passwordHash = await hash(validPassword, 10);
		mockUsersRepository.findByEmail.mockResolvedValueOnce({
			...existingUser,
			passwordHash,
		});

		const response = await app.request("/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "ADA@EXAMPLE.COM",
				password: validPassword,
			}),
		});

		expect(response.status).toBe(200);
		expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(
			"ada@example.com",
		);

		const payload = await response.json();
		expect(payload.token).toEqual(expect.any(String));
		expect(payload.user).toEqual({ id: 1, email: "ada@example.com" });
		expect(payload).not.toHaveProperty("password");
		expect(payload).not.toHaveProperty("passwordHash");
		expect(payload.user).not.toHaveProperty("password");
		expect(payload.user).not.toHaveProperty("passwordHash");
	});

	it("rejects invalid login credentials with 401 and generic error", async () => {
		const passwordHash = await hash(validPassword, 10);
		mockUsersRepository.findByEmail.mockResolvedValueOnce({
			...existingUser,
			passwordHash,
		});

		const response = await app.request("/auth/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				email: "ada@example.com",
				password: "WrongPassword123",
			}),
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Invalid credentials." });
	});
});
