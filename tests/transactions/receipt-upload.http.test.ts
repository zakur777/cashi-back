import { beforeEach, describe, expect, it, vi } from "vitest";
import { signAuthToken } from "../../src/lib/auth-token.js";

const { mockRepository, uploadReceiptToR2 } = vi.hoisted(() => ({
	mockRepository: {
		findAllByUserId: vi.fn(),
		findById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		remove: vi.fn(),
		findAllForBalanceByUserId: vi.fn(),
	},
	uploadReceiptToR2: vi.fn(),
}));

vi.mock("../../src/repositories/transactions.repository.js", () => ({
	transactionsRepository: mockRepository,
}));

vi.mock("../../src/lib/r2.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../src/lib/r2.js")>()),
	uploadReceiptToR2,
}));

import { app } from "../../src/index.js";
import { buildR2PublicUrl } from "../../src/lib/r2.js";

const authSecret = "test-auth-secret";
const maxReceiptBytes = 5 * 1024 * 1024;

function authHeaders(userId = 1) {
	return { authorization: `Bearer ${signAuthToken(userId)}` };
}

function makeReceiptForm(file: File) {
	const form = new FormData();
	form.set("receipt", file);
	return form;
}

function makeReceiptFile(type: string, name: string, bytes = 3) {
	return new File([new Uint8Array(bytes)], name, { type });
}

function baseTransaction(overrides: Record<string, unknown> = {}) {
	return {
		id: 1,
		amount: 120,
		type: "expense",
		description: "Groceries",
		date: new Date("2026-01-13T00:00:00.000Z"),
		receiptUrl: "https://pub-example.r2.dev/receipts/1/test.jpg",
		latitude: null,
		longitude: null,
		categoryId: 1,
		userId: 1,
		category: { id: 1, name: "Food", type: "expense", color: "#EDF7BD" },
		...overrides,
	};
}

describe("receipt upload route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.JWT_SECRET = authSecret;
	});

	it("returns 401 without token", async () => {
		const response = await app.request("/transactions/upload", {
			method: "POST",
			body: makeReceiptForm(makeReceiptFile("image/jpeg", "receipt.jpg")),
		});

		expect(response.status).toBe(401);
		expect(uploadReceiptToR2).not.toHaveBeenCalled();
	});

	it("returns 400 without receipt field and does not upload", async () => {
		const response = await app.request("/transactions/upload", {
			method: "POST",
			headers: authHeaders(1),
			body: new FormData(),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "Receipt file is required.",
		});
		expect(uploadReceiptToR2).not.toHaveBeenCalled();
	});

	it("returns 400 for unsupported MIME type and does not upload", async () => {
		const response = await app.request("/transactions/upload", {
			method: "POST",
			headers: authHeaders(1),
			body: makeReceiptForm(makeReceiptFile("text/plain", "receipt.txt")),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "Receipt must be a JPEG, PNG, or WebP image.",
		});
		expect(uploadReceiptToR2).not.toHaveBeenCalled();
	});

	it("returns 400 for files larger than 5 MB and does not upload", async () => {
		const response = await app.request("/transactions/upload", {
			method: "POST",
			headers: authHeaders(1),
			body: makeReceiptForm(
				makeReceiptFile("image/png", "large.png", maxReceiptBytes + 1),
			),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "Receipt must be 5 MB or smaller.",
		});
		expect(uploadReceiptToR2).not.toHaveBeenCalled();
	});

	it.each([
		{ mimeType: "image/jpeg", extension: "jpg", fileName: "receipt.jpg" },
		{ mimeType: "image/png", extension: "png", fileName: "receipt.png" },
		{ mimeType: "image/webp", extension: "webp", fileName: "receipt.webp" },
	])("uploads a valid $mimeType receipt to R2 and returns its URL", async ({
		mimeType,
		extension,
		fileName,
	}) => {
		uploadReceiptToR2.mockResolvedValueOnce(
			`https://pub-example.r2.dev/receipts/7/uploaded.${extension}`,
		);

		const response = await app.request("/transactions/upload", {
			method: "POST",
			headers: authHeaders(7),
			body: makeReceiptForm(makeReceiptFile(mimeType, fileName)),
		});

		expect(response.status).toBe(201);
		expect(uploadReceiptToR2).toHaveBeenCalledOnce();
		const uploadInput = uploadReceiptToR2.mock.calls[0][0];
		expect(uploadInput).toMatchObject({
			contentType: mimeType,
			key: expect.stringMatching(
				new RegExp(`^receipts/7/[0-9a-f-]+\\.${extension}$`),
			),
		});
		expect(uploadInput.body).toBeInstanceOf(Uint8Array);
		expect(await response.json()).toEqual({
			receiptUrl: `https://pub-example.r2.dev/receipts/7/uploaded.${extension}`,
		});
	});

	it("returns a controlled error when R2 upload fails", async () => {
		uploadReceiptToR2.mockRejectedValueOnce(
			new Error("R2_SECRET_ACCESS_KEY missing"),
		);

		const response = await app.request("/transactions/upload", {
			method: "POST",
			headers: authHeaders(1),
			body: makeReceiptForm(makeReceiptFile("image/jpeg", "receipt.jpg")),
		});

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: "Receipt upload failed." });
	});

	it("builds public receipt URLs when R2_PUBLIC_URL has a trailing slash", () => {
		expect(
			buildR2PublicUrl("https://pub-example.r2.dev/", "/receipts/1/test.jpg"),
		).toBe("https://pub-example.r2.dev/receipts/1/test.jpg");
	});

	it("allows the returned receiptUrl to be persisted on a transaction", async () => {
		const receiptUrl = "https://pub-example.r2.dev/receipts/1/persisted.webp";
		uploadReceiptToR2.mockResolvedValueOnce(receiptUrl);
		mockRepository.create.mockResolvedValueOnce(
			baseTransaction({ receiptUrl }),
		);

		const uploadResponse = await app.request("/transactions/upload", {
			method: "POST",
			headers: authHeaders(1),
			body: makeReceiptForm(makeReceiptFile("image/webp", "receipt.webp")),
		});

		expect(uploadResponse.status).toBe(201);
		const uploadPayload = await uploadResponse.json();

		const createResponse = await app.request("/transactions", {
			method: "POST",
			headers: { "content-type": "application/json", ...authHeaders(1) },
			body: JSON.stringify({
				amount: 120,
				type: "expense",
				description: "Groceries",
				date: "2026-01-13T00:00:00.000Z",
				receiptUrl: uploadPayload.receiptUrl,
				categoryId: 1,
			}),
		});

		expect(createResponse.status).toBe(201);
		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ receiptUrl }),
			1,
		);
		expect(await createResponse.json()).toMatchObject({ receiptUrl });
	});
});
