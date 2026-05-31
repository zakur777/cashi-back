import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type {
	CreateTransactionInput,
	UpdateTransactionInput,
} from "../schemas/transactions.schema.js";

const transactionInclude = {
	category: true,
} as const;

const transactionBalanceSelect = {
	amount: true,
	type: true,
} as const;

type TransactionWithCategory = Prisma.TransactionGetPayload<{
	include: typeof transactionInclude;
}>;

type TransactionBalanceInput = Prisma.TransactionGetPayload<{
	select: typeof transactionBalanceSelect;
}>;

export interface TransactionsRepository {
	findAll(): Promise<TransactionWithCategory[]>;
	findById(id: number): Promise<TransactionWithCategory | null>;
	create(data: CreateTransactionInput): Promise<TransactionWithCategory>;
	update(
		id: number,
		data: UpdateTransactionInput,
	): Promise<TransactionWithCategory>;
	remove(id: number): Promise<TransactionWithCategory>;
	findAllForBalance(): Promise<TransactionBalanceInput[]>;
}

export const transactionsRepository: TransactionsRepository = {
	findAll() {
		return prisma.transaction.findMany({
			orderBy: { id: "asc" },
			include: transactionInclude,
		});
	},
	findById(id: number) {
		return prisma.transaction.findUnique({
			where: { id },
			include: transactionInclude,
		});
	},
	create(data: CreateTransactionInput) {
		return prisma.transaction.create({
			data,
			include: transactionInclude,
		});
	},
	update(id: number, data: UpdateTransactionInput) {
		return prisma.transaction.update({
			where: { id },
			data,
			include: transactionInclude,
		});
	},
	remove(id: number) {
		return prisma.transaction.delete({
			where: { id },
			include: transactionInclude,
		});
	},
	findAllForBalance() {
		return prisma.transaction.findMany({
			select: transactionBalanceSelect,
		});
	},
};
