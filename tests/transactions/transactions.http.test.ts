import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRepository } = vi.hoisted(() => ({
  mockRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    findAllForBalance: vi.fn()
  }
}));

vi.mock('../../src/repositories/transactions.repository.js', () => ({
  transactionsRepository: mockRepository
}));

import { app } from '../../src/index.js';

describe('transactions routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists transactions with category and 200', async () => {
    mockRepository.findAll.mockResolvedValueOnce([
      {
        id: 1,
        amount: 150.5,
        type: 'income',
        description: 'Salary',
        date: new Date('2026-01-10T00:00:00.000Z'),
        categoryId: 1,
        category: { id: 1, name: 'Job' }
      }
    ]);

    const response = await app.request('/transactions');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: 1,
        amount: 150.5,
        type: 'income',
        description: 'Salary',
        date: '2026-01-10T00:00:00.000Z',
        categoryId: 1,
        category: { id: 1, name: 'Job' }
      }
    ]);
  });

  it('gets transaction by id with category and 200', async () => {
    mockRepository.findById.mockResolvedValueOnce({
      id: 2,
      amount: 45,
      type: 'expense',
      description: 'Taxi',
      date: new Date('2026-01-11T00:00:00.000Z'),
      categoryId: 2,
      category: { id: 2, name: 'Transport' }
    });

    const response = await app.request('/transactions/2');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: 2,
      amount: 45,
      type: 'expense',
      description: 'Taxi',
      date: '2026-01-11T00:00:00.000Z',
      categoryId: 2,
      category: { id: 2, name: 'Transport' }
    });
  });

  it('returns 404 when transaction is missing', async () => {
    mockRepository.findById.mockResolvedValueOnce(null);

    const response = await app.request('/transactions/999');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Transaction not found.' });
  });

  it('creates transaction with 201', async () => {
    mockRepository.create.mockResolvedValueOnce({
      id: 3,
      amount: 99.99,
      type: 'expense',
      description: 'Dinner',
      date: new Date('2026-01-12T00:00:00.000Z'),
      categoryId: 1,
      category: { id: 1, name: 'Food' }
    });

    const response = await app.request('/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        amount: 99.99,
        type: 'expense',
        description: 'Dinner',
        date: '2026-01-12T00:00:00.000Z',
        categoryId: 1
      })
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: 3,
      amount: 99.99,
      type: 'expense',
      description: 'Dinner',
      date: '2026-01-12T00:00:00.000Z',
      categoryId: 1,
      category: { id: 1, name: 'Food' }
    });
  });

  it('returns 400 when create body is invalid', async () => {
    const response = await app.request('/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: -1, type: 'invalid', date: 'oops', categoryId: 0 })
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe('Validation error.');
    expect(Array.isArray(payload.errors)).toBe(true);
  });

  it('returns 422 when create category reference does not exist', async () => {
    const error = Object.assign(new Error('FK fail'), { code: 'P2003' });
    mockRepository.create.mockRejectedValueOnce(error);

    const response = await app.request('/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        amount: 10,
        type: 'expense',
        date: '2026-01-12T00:00:00.000Z',
        categoryId: 999
      })
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Referenced resource does not exist.' });
  });

  it('updates transaction with 200', async () => {
    mockRepository.update.mockResolvedValueOnce({
      id: 1,
      amount: 60,
      type: 'expense',
      description: 'Uber',
      date: new Date('2026-01-12T00:00:00.000Z'),
      categoryId: 2,
      category: { id: 2, name: 'Transport' }
    });

    const response = await app.request('/transactions/1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 60 })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: 1,
      amount: 60,
      type: 'expense',
      description: 'Uber',
      date: '2026-01-12T00:00:00.000Z',
      categoryId: 2,
      category: { id: 2, name: 'Transport' }
    });
  });

  it('returns 404 on update when transaction does not exist', async () => {
    const error = Object.assign(new Error('Missing'), { code: 'P2025' });
    mockRepository.update.mockRejectedValueOnce(error);

    const response = await app.request('/transactions/999', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 10 })
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Resource not found.' });
  });

  it('deletes transaction with 200', async () => {
    mockRepository.remove.mockResolvedValueOnce({
      id: 1,
      amount: 40,
      type: 'expense',
      description: null,
      date: new Date('2026-01-12T00:00:00.000Z'),
      categoryId: 1,
      category: { id: 1, name: 'Food' }
    });

    const response = await app.request('/transactions/1', { method: 'DELETE' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: 1,
      amount: 40,
      type: 'expense',
      description: null,
      date: '2026-01-12T00:00:00.000Z',
      categoryId: 1,
      category: { id: 1, name: 'Food' }
    });
  });

  it('returns 404 on delete when transaction does not exist', async () => {
    const error = Object.assign(new Error('Missing'), { code: 'P2025' });
    mockRepository.remove.mockRejectedValueOnce(error);

    const response = await app.request('/transactions/999', { method: 'DELETE' });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Resource not found.' });
  });

  it('returns 500 on unexpected repository error', async () => {
    mockRepository.findAll.mockRejectedValueOnce(new Error('boom'));

    const response = await app.request('/transactions');

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error.' });
  });

  it('returns balance payload with total income/expense and net', async () => {
    mockRepository.findAllForBalance.mockResolvedValueOnce([
      { amount: 100, type: 'income' },
      { amount: 60, type: 'expense' },
      { amount: 20, type: 'income' }
    ]);

    const response = await app.request('/transactions/balance');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      totalIncome: 120,
      totalExpense: 60,
      balance: 60
    });
  });

  it('resolves /transactions/balance before /transactions/:id', async () => {
    mockRepository.findAllForBalance.mockResolvedValueOnce([]);

    const response = await app.request('/transactions/balance');

    expect(response.status).toBe(200);
    expect(mockRepository.findAllForBalance).toHaveBeenCalledOnce();
    expect(mockRepository.findById).not.toHaveBeenCalled();
  });
});
