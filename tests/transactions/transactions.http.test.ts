import { beforeEach, describe, expect, it, vi } from "vitest";
import { signAuthToken } from "../../src/lib/auth-token.js";

const { mockRepository } = vi.hoisted(() => ({
	mockRepository: {
		findAllByUserId: vi.fn(),
		findById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		remove: vi.fn(),
		findAllForBalanceByUserId: vi.fn(),
	},
}));

vi.mock("../../src/repositories/transactions.repository.js", () => ({
	transactionsRepository: mockRepository,
}));

import { app } from "../../src/index.js";

const authSecret = "test-auth-secret";

function authHeaders(userId = 1) {
	return { authorization: `Bearer ${signAuthToken(userId)}` };
}

function baseTransaction(overrides: Record<string, unknown> = {}) {
	return {
		id: 1,
		amount: 150.5,
		type: "income",
		description: "Salary",
		date: new Date("2026-01-10T00:00:00.000Z"),
		receiptUrl: null,
		latitude: null,
		longitude: null,
		categoryId: 1,
		userId: 1,
		category: { id: 1, name: "Job", type: "income", color: "#85C79A" },
		...overrides,
	};
}

describe("transactions routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.JWT_SECRET = authSecret;
	});

	it("lists only transactions for the authenticated user", async () => {
		mockRepository.findAllByUserId.mockResolvedValueOnce([
			baseTransaction({ id: 1, userId: 1 }),
		]);

		const response = await app.request("/transactions", {
			headers: authHeaders(1),
		});

		expect(response.status).toBe(200);
		expect(mockRepository.findAllByUserId).toHaveBeenCalledWith(1);
		expect(await response.json()).toEqual([
			{
				id: 1,
				amount: 150.5,
				type: "income",
				description: "Salary",
				date: "2026-01-10T00:00:00.000Z",
				receiptUrl: null,
				latitude: null,
				longitude: null,
				categoryId: 1,
				userId: 1,
				category: { id: 1, name: "Job", type: "income", color: "#85C79A" },
			},
		]);
	});

	it("gets an owned transaction by id with category and 200", async () => {
		mockRepository.findById.mockResolvedValueOnce(
			baseTransaction({
				id: 2,
				amount: 45,
				type: "expense",
				description: "Taxi",
				date: new Date("2026-01-11T00:00:00.000Z"),
				categoryId: 2,
				category: {
					id: 2,
					name: "Transport",
					type: "expense",
					color: "#4E8D9C",
				},
			}),
		);

		const response = await app.request("/transactions/2", {
			headers: authHeaders(1),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			id: 2,
			amount: 45,
			type: "expense",
			description: "Taxi",
			date: "2026-01-11T00:00:00.000Z",
			receiptUrl: null,
			latitude: null,
			longitude: null,
			categoryId: 2,
			userId: 1,
			category: { id: 2, name: "Transport", type: "expense", color: "#4E8D9C" },
		});
	});

	it("returns 404 when transaction detail is missing", async () => {
		mockRepository.findById.mockResolvedValueOnce(null);

		const response = await app.request("/transactions/999", {
			headers: authHeaders(1),
		});

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Transaction not found." });
	});

	it("returns 403 when transaction detail belongs to another user", async () => {
		mockRepository.findById.mockResolvedValueOnce(
			baseTransaction({ id: 7, userId: 2 }),
		);

		const response = await app.request("/transactions/7", {
			headers: authHeaders(1),
		});

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: "Forbidden." });
	});

	it("creates transaction for the authenticated user and ignores body userId", async () => {
		mockRepository.create.mockResolvedValueOnce(
			baseTransaction({
				id: 3,
				amount: 99.99,
				type: "expense",
				description: "Dinner",
				date: new Date("2026-01-12T00:00:00.000Z"),
				category: { id: 1, name: "Food", type: "expense", color: "#EDF7BD" },
			}),
		);

		const response = await app.request("/transactions", {
			method: "POST",
			headers: { "content-type": "application/json", ...authHeaders(1) },
			body: JSON.stringify({
				amount: 99.99,
				type: "expense",
				description: "Dinner",
				date: "2026-01-12T00:00:00.000Z",
				categoryId: 1,
				userId: 999,
			}),
		});

		expect(response.status).toBe(201);
		expect(mockRepository.create).toHaveBeenCalledWith(
			{
				amount: 99.99,
				type: "expense",
				description: "Dinner",
				date: new Date("2026-01-12T00:00:00.000Z"),
				categoryId: 1,
			},
			1,
		);
		expect(await response.json()).toMatchObject({ id: 3, userId: 1 });
	});

	it("creates transaction with optional receipt and GPS metadata", async () => {
		mockRepository.create.mockResolvedValueOnce(
			baseTransaction({
				id: 4,
				amount: 120,
				type: "expense",
				description: "Groceries",
				date: new Date("2026-01-13T00:00:00.000Z"),
				receiptUrl: "https://pub-example.r2.dev/receipts/1/test.webp",
				latitude: -33.4489,
				longitude: -70.6693,
				category: { id: 1, name: "Food", type: "expense", color: "#EDF7BD" },
			}),
		);

		const response = await app.request("/transactions", {
			method: "POST",
			headers: { "content-type": "application/json", ...authHeaders(1) },
			body: JSON.stringify({
				amount: 120,
				type: "expense",
				description: "Groceries",
				date: "2026-01-13T00:00:00.000Z",
				receiptUrl: "https://pub-example.r2.dev/receipts/1/test.webp",
				latitude: -33.4489,
				longitude: -70.6693,
				categoryId: 1,
			}),
		});

		expect(response.status).toBe(201);
		expect(mockRepository.create).toHaveBeenCalledWith(
			{
				amount: 120,
				type: "expense",
				description: "Groceries",
				date: new Date("2026-01-13T00:00:00.000Z"),
				receiptUrl: "https://pub-example.r2.dev/receipts/1/test.webp",
				latitude: -33.4489,
				longitude: -70.6693,
				categoryId: 1,
			},
			1,
		);
		expect(await response.json()).toMatchObject({
			receiptUrl: "https://pub-example.r2.dev/receipts/1/test.webp",
			latitude: -33.4489,
			longitude: -70.6693,
		});
	});

	it("returns stable validation errors for invalid receipt and GPS metadata", async () => {
		const response = await app.request("/transactions", {
			method: "POST",
			headers: { "content-type": "application/json", ...authHeaders(1) },
			body: JSON.stringify({
				amount: 25,
				type: "expense",
				date: "2026-01-12T00:00:00.000Z",
				receiptUrl: "not-a-url",
				latitude: "north",
				longitude: "west",
				categoryId: 1,
			}),
		});

		expect(response.status).toBe(400);
		const payload = await response.json();
		expect(payload.error).toBe("Validation error.");
		expect(payload.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: ["receiptUrl"] }),
				expect.objectContaining({ path: ["latitude"] }),
				expect.objectContaining({ path: ["longitude"] }),
			]),
		);
	});

	it("returns 400 when create body is invalid", async () => {
		const response = await app.request("/transactions", {
			method: "POST",
			headers: { "content-type": "application/json", ...authHeaders(1) },
			body: JSON.stringify({
				amount: -1,
				type: "invalid",
				date: "oops",
				categoryId: 0,
			}),
		});

		expect(response.status).toBe(400);
		const payload = await response.json();
		expect(payload.error).toBe("Validation error.");
		expect(Array.isArray(payload.errors)).toBe(true);
	});

	it("returns 422 when create category reference does not exist", async () => {
		const error = Object.assign(new Error("FK fail"), { code: "P2003" });
		mockRepository.create.mockRejectedValueOnce(error);

		const response = await app.request("/transactions", {
			method: "POST",
			headers: { "content-type": "application/json", ...authHeaders(1) },
			body: JSON.stringify({
				amount: 10,
				type: "expense",
				date: "2026-01-12T00:00:00.000Z",
				categoryId: 999,
			}),
		});

		expect(response.status).toBe(422);
		expect(await response.json()).toEqual({
			error: "Referenced resource does not exist.",
		});
	});

	it("updates an owned transaction with 200", async () => {
		mockRepository.findById.mockResolvedValueOnce(
			baseTransaction({ id: 1, userId: 1 }),
		);
		mockRepository.update.mockResolvedValueOnce(
			baseTransaction({
				id: 1,
				amount: 60,
				type: "expense",
				description: "Uber",
				date: new Date("2026-01-12T00:00:00.000Z"),
				categoryId: 2,
				category: {
					id: 2,
					name: "Transport",
					type: "expense",
					color: "#4E8D9C",
				},
			}),
		);

		const response = await app.request("/transactions/1", {
			method: "PATCH",
			headers: { "content-type": "application/json", ...authHeaders(1) },
			body: JSON.stringify({ amount: 60 }),
		});

		expect(response.status).toBe(200);
		expect(mockRepository.update).toHaveBeenCalledWith(1, { amount: 60 });
		expect(await response.json()).toMatchObject({
			id: 1,
			amount: 60,
			userId: 1,
		});
	});

	it("updates optional receipt and GPS metadata on an owned transaction", async () => {
		mockRepository.findById.mockResolvedValueOnce(
			baseTransaction({ id: 1, userId: 1 }),
		);
		mockRepository.update.mockResolvedValueOnce(
			baseTransaction({
				id: 1,
				receiptUrl: "https://pub-example.r2.dev/receipts/1/updated.png",
				latitude: -30,
				longitude: -71,
			}),
		);

		const response = await app.request("/transactions/1", {
			method: "PATCH",
			headers: { "content-type": "application/json", ...authHeaders(1) },
			body: JSON.stringify({
				receiptUrl: "https://pub-example.r2.dev/receipts/1/updated.png",
				latitude: -30,
				longitude: -71,
			}),
		});

		expect(response.status).toBe(200);
		expect(mockRepository.update).toHaveBeenCalledWith(1, {
			receiptUrl: "https://pub-example.r2.dev/receipts/1/updated.png",
			latitude: -30,
			longitude: -71,
		});
		expect(await response.json()).toMatchObject({
			receiptUrl: "https://pub-example.r2.dev/receipts/1/updated.png",
			latitude: -30,
			longitude: -71,
		});
	});

	it("returns 404 on update when transaction does not exist", async () => {
		mockRepository.findById.mockResolvedValueOnce(null);

		const response = await app.request("/transactions/999", {
			method: "PATCH",
			headers: { "content-type": "application/json", ...authHeaders(1) },
			body: JSON.stringify({ amount: 10 }),
		});

		expect(response.status).toBe(404);
		expect(mockRepository.update).not.toHaveBeenCalled();
		expect(await response.json()).toEqual({ error: "Transaction not found." });
	});

	it("returns 403 on update when transaction belongs to another user", async () => {
		mockRepository.findById.mockResolvedValueOnce(
			baseTransaction({ id: 9, userId: 2 }),
		);

		const response = await app.request("/transactions/9", {
			method: "PATCH",
			headers: { "content-type": "application/json", ...authHeaders(1) },
			body: JSON.stringify({ amount: 10 }),
		});

		expect(response.status).toBe(403);
		expect(mockRepository.update).not.toHaveBeenCalled();
		expect(await response.json()).toEqual({ error: "Forbidden." });
	});

	it("deletes an owned transaction with 200", async () => {
		mockRepository.findById.mockResolvedValueOnce(
			baseTransaction({ id: 1, userId: 1 }),
		);
		mockRepository.remove.mockResolvedValueOnce(
			baseTransaction({
				id: 1,
				amount: 40,
				type: "expense",
				description: null,
				category: { id: 1, name: "Food", type: "expense", color: "#EDF7BD" },
			}),
		);

		const response = await app.request("/transactions/1", {
			method: "DELETE",
			headers: authHeaders(1),
		});

		expect(response.status).toBe(200);
		expect(mockRepository.remove).toHaveBeenCalledWith(1);
		expect(await response.json()).toMatchObject({ id: 1, userId: 1 });
	});

	it("returns 404 on delete when transaction does not exist", async () => {
		mockRepository.findById.mockResolvedValueOnce(null);

		const response = await app.request("/transactions/999", {
			method: "DELETE",
			headers: authHeaders(1),
		});

		expect(response.status).toBe(404);
		expect(mockRepository.remove).not.toHaveBeenCalled();
		expect(await response.json()).toEqual({ error: "Transaction not found." });
	});

	it("returns 403 on delete when transaction belongs to another user", async () => {
		mockRepository.findById.mockResolvedValueOnce(
			baseTransaction({ id: 9, userId: 2 }),
		);

		const response = await app.request("/transactions/9", {
			method: "DELETE",
			headers: authHeaders(1),
		});

		expect(response.status).toBe(403);
		expect(mockRepository.remove).not.toHaveBeenCalled();
		expect(await response.json()).toEqual({ error: "Forbidden." });
	});

	it("returns 500 on unexpected repository error", async () => {
		mockRepository.findAllByUserId.mockRejectedValueOnce(new Error("boom"));

		const response = await app.request("/transactions", {
			headers: authHeaders(1),
		});

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: "Internal server error." });
	});

	it("returns balance payload using only authenticated user transactions", async () => {
		mockRepository.findAllForBalanceByUserId.mockResolvedValueOnce([
			{ amount: 100, type: "income" },
			{ amount: 60, type: "expense" },
			{ amount: 20, type: "income" },
		]);

		const response = await app.request("/transactions/balance", {
			headers: authHeaders(1),
		});

		expect(response.status).toBe(200);
		expect(mockRepository.findAllForBalanceByUserId).toHaveBeenCalledWith(1);
		expect(await response.json()).toEqual({
			totalIncome: 120,
			totalExpense: 60,
			balance: 60,
		});
	});

	it("resolves /transactions/balance before /transactions/:id", async () => {
		mockRepository.findAllForBalanceByUserId.mockResolvedValueOnce([]);

		const response = await app.request("/transactions/balance", {
			headers: authHeaders(1),
		});

		expect(response.status).toBe(200);
		expect(mockRepository.findAllForBalanceByUserId).toHaveBeenCalledOnce();
		expect(mockRepository.findById).not.toHaveBeenCalled();
	});
});
