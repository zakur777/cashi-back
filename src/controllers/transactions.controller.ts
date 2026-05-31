import { randomUUID } from "node:crypto";
import type { Context } from "hono";
import { ZodError } from "zod";
import { mapAppError, validationErrorResponse } from "../lib/http-errors.js";
import {
	getReceiptExtension,
	isAllowedReceiptMimeType,
	MAX_RECEIPT_BYTES,
	uploadReceiptToR2,
} from "../lib/r2.js";
import {
	transactionsRepository,
	type TransactionWithCategory,
} from "../repositories/transactions.repository.js";
import {
	createTransactionSchema,
	updateTransactionSchema,
} from "../schemas/transactions.schema.js";
import type { AppEnv } from "../types/app-env.js";

function parseId(rawId: string | undefined): number {
	return Number(rawId);
}

function toNumber(value: unknown): number {
	return Number(value);
}

function serializeTransaction(transaction: TransactionWithCategory) {
	return {
		...transaction,
		amount: toNumber(transaction.amount),
		date: transaction.date.toISOString(),
	};
}

function getAuthenticatedUserId(c: Context<AppEnv>): number {
	return c.get("authUser").userId;
}

function isTransactionOwner(
	transaction: TransactionWithCategory,
	userId: number,
): boolean {
	return transaction.userId === userId;
}

function isReceiptFile(value: unknown): value is File {
	return value instanceof File;
}

function readReceiptFile(value: unknown): File | null {
	if (Array.isArray(value)) {
		const [firstValue] = value;
		return isReceiptFile(firstValue) ? firstValue : null;
	}

	return isReceiptFile(value) ? value : null;
}

async function findOwnedTransaction(c: Context<AppEnv>, id: number) {
	const transaction = await transactionsRepository.findById(id);

	if (!transaction) {
		return { response: c.json({ error: "Transaction not found." }, 404) };
	}

	if (!isTransactionOwner(transaction, getAuthenticatedUserId(c))) {
		return { response: c.json({ error: "Forbidden." }, 403) };
	}

	return { transaction };
}

export async function listTransactions(c: Context<AppEnv>) {
	try {
		const userId = getAuthenticatedUserId(c);
		const transactions = await transactionsRepository.findAllByUserId(userId);
		return c.json(transactions.map(serializeTransaction), 200);
	} catch (error) {
		const response = mapAppError(error);
		return c.json(response.body, response.status);
	}
}

export async function getTransactionById(c: Context<AppEnv>) {
	try {
		const id = parseId(c.req.param("id"));
		const ownership = await findOwnedTransaction(c, id);

		if ("response" in ownership) {
			return ownership.response;
		}

		return c.json(serializeTransaction(ownership.transaction), 200);
	} catch (error) {
		const response = mapAppError(error);
		return c.json(response.body, response.status);
	}
}

export async function uploadReceipt(c: Context<AppEnv>) {
	try {
		const userId = getAuthenticatedUserId(c);
		const body = await c.req.parseBody();
		const receipt = readReceiptFile(body.receipt);

		if (!receipt) {
			return c.json({ error: "Receipt file is required." }, 400);
		}

		if (!isAllowedReceiptMimeType(receipt.type)) {
			return c.json(
				{ error: "Receipt must be a JPEG, PNG, or WebP image." },
				400,
			);
		}

		if (receipt.size > MAX_RECEIPT_BYTES) {
			return c.json({ error: "Receipt must be 5 MB or smaller." }, 400);
		}

		const extension = getReceiptExtension(receipt.type);
		const key = `receipts/${userId}/${randomUUID()}.${extension}`;
		const receiptUrl = await uploadReceiptToR2({
			key,
			body: new Uint8Array(await receipt.arrayBuffer()),
			contentType: receipt.type,
		});

		return c.json({ receiptUrl }, 201);
	} catch {
		return c.json({ error: "Receipt upload failed." }, 500);
	}
}

export async function createTransaction(c: Context<AppEnv>) {
	try {
		const userId = getAuthenticatedUserId(c);
		const payload = createTransactionSchema.parse(await c.req.json());
		const transaction = await transactionsRepository.create(payload, userId);
		return c.json(serializeTransaction(transaction), 201);
	} catch (error) {
		if (error instanceof ZodError) {
			const response = validationErrorResponse(error);
			return c.json(response.body, response.status);
		}

		const response = mapAppError(error);
		return c.json(response.body, response.status);
	}
}

export async function updateTransaction(c: Context<AppEnv>) {
	try {
		const id = parseId(c.req.param("id"));
		const payload = updateTransactionSchema.parse(await c.req.json());
		const ownership = await findOwnedTransaction(c, id);

		if ("response" in ownership) {
			return ownership.response;
		}

		const transaction = await transactionsRepository.update(id, payload);
		return c.json(serializeTransaction(transaction), 200);
	} catch (error) {
		if (error instanceof ZodError) {
			const response = validationErrorResponse(error);
			return c.json(response.body, response.status);
		}

		const response = mapAppError(error);
		return c.json(response.body, response.status);
	}
}

export async function deleteTransaction(c: Context<AppEnv>) {
	try {
		const id = parseId(c.req.param("id"));
		const ownership = await findOwnedTransaction(c, id);

		if ("response" in ownership) {
			return ownership.response;
		}

		const transaction = await transactionsRepository.remove(id);
		return c.json(serializeTransaction(transaction), 200);
	} catch (error) {
		const response = mapAppError(error);
		return c.json(response.body, response.status);
	}
}

export async function getTransactionsBalance(c: Context<AppEnv>) {
	try {
		const userId = getAuthenticatedUserId(c);
		const transactions =
			await transactionsRepository.findAllForBalanceByUserId(userId);

		const totals = transactions.reduce(
			(accumulator, transaction) => {
				const amount = toNumber(transaction.amount);

				if (transaction.type === "income") {
					accumulator.totalIncome += amount;
				} else if (transaction.type === "expense") {
					accumulator.totalExpense += amount;
				}

				return accumulator;
			},
			{ totalIncome: 0, totalExpense: 0 },
		);

		return c.json(
			{
				totalIncome: totals.totalIncome,
				totalExpense: totals.totalExpense,
				balance: totals.totalIncome - totals.totalExpense,
			},
			200,
		);
	} catch (error) {
		const response = mapAppError(error);
		return c.json(response.body, response.status);
	}
}
