import { Hono } from "hono";
import {
	createTransaction,
	deleteTransaction,
	getTransactionById,
	getTransactionsBalance,
	listTransactions,
	updateTransaction,
	uploadReceipt,
} from "../controllers/transactions.controller.js";
import type { AppEnv } from "../types/app-env.js";

export const transactionsRoutes = new Hono<AppEnv>();

transactionsRoutes.get("/", listTransactions);
transactionsRoutes.get("/balance", getTransactionsBalance);
transactionsRoutes.post("/upload", uploadReceipt);
transactionsRoutes.get("/:id", getTransactionById);
transactionsRoutes.post("/", createTransaction);
transactionsRoutes.patch("/:id", updateTransaction);
transactionsRoutes.delete("/:id", deleteTransaction);
