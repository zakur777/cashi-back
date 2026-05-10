import { Hono } from 'hono';
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactionsBalance,
  listTransactions,
  updateTransaction
} from '../controllers/transactions.controller.js';

export const transactionsRoutes = new Hono();

transactionsRoutes.get('/', listTransactions);
transactionsRoutes.get('/balance', getTransactionsBalance);
transactionsRoutes.get('/:id', getTransactionById);
transactionsRoutes.post('/', createTransaction);
transactionsRoutes.patch('/:id', updateTransaction);
transactionsRoutes.delete('/:id', deleteTransaction);
