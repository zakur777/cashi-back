import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRepository } = vi.hoisted(() => ({
  mockRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock('../../src/repositories/categories.repository.js', () => ({
  categoriesRepository: mockRepository
}));

import { app } from '../../src/index.js';

describe('categories routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists categories with 200', async () => {
    mockRepository.findAll.mockResolvedValueOnce([{ id: 1, name: 'Food' }]);

    const response = await app.request('/categories');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 1, name: 'Food' }]);
  });

  it('gets a category by id with 200', async () => {
    mockRepository.findById.mockResolvedValueOnce({ id: 1, name: 'Food' });

    const response = await app.request('/categories/1');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 1, name: 'Food' });
  });

  it('returns 404 when category is missing', async () => {
    mockRepository.findById.mockResolvedValueOnce(null);

    const response = await app.request('/categories/999');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Category not found.' });
  });

  it('creates a category with 201', async () => {
    mockRepository.create.mockResolvedValueOnce({ id: 2, name: 'Transport' });

    const response = await app.request('/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Transport' })
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 2, name: 'Transport' });
  });

  it('returns 400 when create body is invalid', async () => {
    const response = await app.request('/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' })
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe('Validation error.');
    expect(Array.isArray(payload.errors)).toBe(true);
  });

  it('returns 409 when category name is duplicate', async () => {
    const error = Object.assign(new Error('Duplicate'), { code: 'P2002' });
    mockRepository.create.mockRejectedValueOnce(error);

    const response = await app.request('/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Food' })
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Resource already exists.' });
  });

  it('updates a category with 200', async () => {
    mockRepository.update.mockResolvedValueOnce({ id: 1, name: 'Bills' });

    const response = await app.request('/categories/1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Bills' })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 1, name: 'Bills' });
  });

  it('returns 400 when update body is invalid', async () => {
    const response = await app.request('/categories/1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' })
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe('Validation error.');
    expect(Array.isArray(payload.errors)).toBe(true);
  });

  it('returns 404 when update target is missing', async () => {
    const error = Object.assign(new Error('Missing'), { code: 'P2025' });
    mockRepository.update.mockRejectedValueOnce(error);

    const response = await app.request('/categories/999', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Bills' })
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Resource not found.' });
  });

  it('deletes a category with 200', async () => {
    mockRepository.remove.mockResolvedValueOnce({ id: 1, name: 'Food' });

    const response = await app.request('/categories/1', {
      method: 'DELETE'
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 1, name: 'Food' });
  });

  it('returns 404 when delete target is missing', async () => {
    const error = Object.assign(new Error('Missing'), { code: 'P2025' });
    mockRepository.remove.mockRejectedValueOnce(error);

    const response = await app.request('/categories/999', {
      method: 'DELETE'
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Resource not found.' });
  });
});
