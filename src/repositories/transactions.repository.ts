import { prisma } from '../lib/prisma.js';
import type { CreateTransactionInput, UpdateTransactionInput } from '../schemas/transactions.schema.js';

const transactionInclude = {
  category: true
} as const;

export const transactionsRepository = {
  findAll() {
    return prisma.transaction.findMany({
      orderBy: { id: 'asc' },
      include: transactionInclude
    });
  },
  findById(id: number) {
    return prisma.transaction.findUnique({
      where: { id },
      include: transactionInclude
    });
  },
  create(data: CreateTransactionInput) {
    return prisma.transaction.create({
      data,
      include: transactionInclude
    });
  },
  update(id: number, data: UpdateTransactionInput) {
    return prisma.transaction.update({
      where: { id },
      data,
      include: transactionInclude
    });
  },
  remove(id: number) {
    return prisma.transaction.delete({
      where: { id },
      include: transactionInclude
    });
  },
  findAllForBalance() {
    return prisma.transaction.findMany({
      select: {
        amount: true,
        type: true
      }
    });
  }
};
