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

export type TransactionWithCategory = Prisma.TransactionGetPayload<{
	include: typeof transactionInclude;
}>;

type TransactionBalanceInput = Prisma.TransactionGetPayload<{
	select: typeof transactionBalanceSelect;
}>;

export interface TransactionsRepository {
	findAllByUserId(userId: number): Promise<TransactionWithCategory[]>;
	findById(id: number): Promise<TransactionWithCategory | null>;
	create(
		data: CreateTransactionInput,
		userId: number,
	): Promise<TransactionWithCategory>;
	update(
		id: number,
		data: UpdateTransactionInput,
	): Promise<TransactionWithCategory>;
	remove(id: number): Promise<TransactionWithCategory>;
	findAllForBalanceByUserId(userId: number): Promise<TransactionBalanceInput[]>;
}

export const transactionsRepository: TransactionsRepository = {
	findAllByUserId(userId: number) {
		return prisma.transaction.findMany({
			where: { userId },
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
	create(data: CreateTransactionInput, userId: number) {
		return prisma.transaction.create({
			data: {
				...data,
				userId,
			},
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
	findAllForBalanceByUserId(userId: number) {
		return prisma.transaction.findMany({
			where: { userId },
			select: transactionBalanceSelect,
		});
	},
};
