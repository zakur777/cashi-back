import type { Context } from 'hono';
import { ZodError } from 'zod';
import { mapAppError, validationErrorResponse } from '../lib/http-errors.js';
import { transactionsRepository } from '../repositories/transactions.repository.js';
import { createTransactionSchema, updateTransactionSchema } from '../schemas/transactions.schema.js';

type TransactionWithCategory = Awaited<ReturnType<typeof transactionsRepository.findAll>>[number];

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
    date: transaction.date.toISOString()
  };
}

export async function listTransactions(c: Context) {
  try {
    const transactions = await transactionsRepository.findAll();
    return c.json(transactions.map(serializeTransaction), 200);
  } catch (error) {
    const response = mapAppError(error);
    return c.json(response.body, response.status);
  }
}

export async function getTransactionById(c: Context) {
  try {
    const id = parseId(c.req.param('id'));
    const transaction = await transactionsRepository.findById(id);

    if (!transaction) {
      return c.json({ error: 'Transaction not found.' }, 404);
    }

    return c.json(serializeTransaction(transaction), 200);
  } catch (error) {
    const response = mapAppError(error);
    return c.json(response.body, response.status);
  }
}

export async function createTransaction(c: Context) {
  try {
    const payload = createTransactionSchema.parse(await c.req.json());
    const transaction = await transactionsRepository.create(payload);
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

export async function updateTransaction(c: Context) {
  try {
    const id = parseId(c.req.param('id'));
    const payload = updateTransactionSchema.parse(await c.req.json());
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

export async function deleteTransaction(c: Context) {
  try {
    const id = parseId(c.req.param('id'));
    const transaction = await transactionsRepository.remove(id);
    return c.json(serializeTransaction(transaction), 200);
  } catch (error) {
    const response = mapAppError(error);
    return c.json(response.body, response.status);
  }
}

export async function getTransactionsBalance(c: Context) {
  try {
    const transactions = await transactionsRepository.findAllForBalance();

    const totals = transactions.reduce(
      (accumulator, transaction) => {
        const amount = toNumber(transaction.amount);

        if (transaction.type === 'income') {
          accumulator.totalIncome += amount;
        } else if (transaction.type === 'expense') {
          accumulator.totalExpense += amount;
        }

        return accumulator;
      },
      { totalIncome: 0, totalExpense: 0 }
    );

    return c.json(
      {
        totalIncome: totals.totalIncome,
        totalExpense: totals.totalExpense,
        balance: totals.totalIncome - totals.totalExpense
      },
      200
    );
  } catch (error) {
    const response = mapAppError(error);
    return c.json(response.body, response.status);
  }
}
