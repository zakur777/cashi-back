import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signAuthToken } from '../../src/lib/auth-token.js';

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

const foodCategory = { id: 1, name: 'Food', type: 'expense', color: '#EDF7BD' };

const transportCategory = { id: 2, name: 'Transport', type: 'expense', color: '#4E8D9C' };
const authSecret = 'test-auth-secret';

function authHeaders(userId = 1) {
  return { authorization: `Bearer ${signAuthToken(userId)}` };
}

describe('categories routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = authSecret;
  });

  it('lists categories with type and color and 200', async () => {
    mockRepository.findAll.mockResolvedValueOnce([foodCategory]);

    const response = await app.request('/categories', { headers: authHeaders() });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([foodCategory]);
  });

  it('gets a category by id with 200', async () => {
    mockRepository.findById.mockResolvedValueOnce(foodCategory);

    const response = await app.request('/categories/1', { headers: authHeaders() });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(foodCategory);
  });

  it('returns 404 when category is missing', async () => {
    mockRepository.findById.mockResolvedValueOnce(null);

    const response = await app.request('/categories/999', { headers: authHeaders() });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Category not found.' });
  });

  it('creates a category with 201', async () => {
    mockRepository.create.mockResolvedValueOnce(transportCategory);

    const response = await app.request('/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: 'Transport', type: 'expense', color: '#4E8D9C' })
    });

    expect(response.status).toBe(201);
    expect(mockRepository.create).toHaveBeenCalledWith({ name: 'Transport', type: 'expense', color: '#4E8D9C' });
    expect(await response.json()).toEqual(transportCategory);
  });

  it('accepts expanded mobile palette colors', async () => {
    const blueCategory = { id: 3, name: 'Travel', type: 'expense', color: '#60A5FA' };
    mockRepository.create.mockResolvedValueOnce(blueCategory);

    const response = await app.request('/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: 'Travel', type: 'expense', color: '#60A5FA' })
    });

    expect(response.status).toBe(201);
    expect(mockRepository.create).toHaveBeenCalledWith({ name: 'Travel', type: 'expense', color: '#60A5FA' });
    expect(await response.json()).toEqual(blueCategory);
  });

  it('defaults category type and color when omitted', async () => {
    mockRepository.create.mockResolvedValueOnce(foodCategory);

    const response = await app.request('/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: 'Food' })
    });

    expect(response.status).toBe(201);
    expect(mockRepository.create).toHaveBeenCalledWith({ name: 'Food', type: 'expense', color: '#EDF7BD' });
    expect(await response.json()).toEqual(foodCategory);
  });

  it('returns 400 when create body is invalid', async () => {
    const response = await app.request('/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: '', type: 'invalid', color: '#123456' })
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
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: 'Food', type: 'expense', color: '#EDF7BD' })
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Resource already exists.' });
  });

  it('updates a category with 200', async () => {
    const billsCategory = { id: 1, name: 'Bills', type: 'expense', color: '#281C59' };
    mockRepository.update.mockResolvedValueOnce(billsCategory);

    const response = await app.request('/categories/1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: 'Bills', color: '#281C59' })
    });

    expect(response.status).toBe(200);
    expect(mockRepository.update).toHaveBeenCalledWith(1, { name: 'Bills', color: '#281C59' });
    expect(await response.json()).toEqual(billsCategory);
  });

  it('returns 400 when update body is invalid', async () => {
    const response = await app.request('/categories/1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: '', type: 'invalid' })
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
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: 'Bills' })
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Resource not found.' });
  });

  it('deletes a category with 200', async () => {
    mockRepository.remove.mockResolvedValueOnce(foodCategory);

    const response = await app.request('/categories/1', {
      method: 'DELETE',
      headers: authHeaders()
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(foodCategory);
  });

  it('returns 404 when delete target is missing', async () => {
    const error = Object.assign(new Error('Missing'), { code: 'P2025' });
    mockRepository.remove.mockRejectedValueOnce(error);

    const response = await app.request('/categories/999', {
      method: 'DELETE',
      headers: authHeaders()
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Resource not found.' });
  });

  it('rejects missing and invalid tokens with 401 before reaching category repository', async () => {
    const missingResponse = await app.request('/categories');
    const malformedResponse = await app.request('/categories', {
      headers: { authorization: 'Token abc' }
    });
    const invalidResponse = await app.request('/categories', {
      headers: { authorization: 'Bearer invalid-token' }
    });

    expect(missingResponse.status).toBe(401);
    expect(await missingResponse.json()).toEqual({ error: 'Unauthorized.' });
    expect(malformedResponse.status).toBe(401);
    expect(await malformedResponse.json()).toEqual({ error: 'Unauthorized.' });
    expect(invalidResponse.status).toBe(401);
    expect(await invalidResponse.json()).toEqual({ error: 'Unauthorized.' });
    expect(mockRepository.findAll).not.toHaveBeenCalled();
  });

  it('keeps categories global for different authenticated users', async () => {
    mockRepository.findAll
      .mockResolvedValueOnce([foodCategory, transportCategory])
      .mockResolvedValueOnce([foodCategory, transportCategory]);

    const firstUserResponse = await app.request('/categories', { headers: authHeaders(1) });
    const secondUserResponse = await app.request('/categories', { headers: authHeaders(2) });

    expect(firstUserResponse.status).toBe(200);
    expect(secondUserResponse.status).toBe(200);
    expect(await firstUserResponse.json()).toEqual([foodCategory, transportCategory]);
    expect(await secondUserResponse.json()).toEqual([foodCategory, transportCategory]);
    expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
  });
});
