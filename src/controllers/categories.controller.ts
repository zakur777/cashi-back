import type { Context } from 'hono';
import { ZodError } from 'zod';
import { mapAppError, validationErrorResponse } from '../lib/http-errors.js';
import { categoriesRepository } from '../repositories/categories.repository.js';
import { createCategorySchema, updateCategorySchema } from '../schemas/categories.schema.js';

function parseId(rawId: string | undefined): number {
  return Number(rawId);
}

export async function listCategories(c: Context) {
  const categories = await categoriesRepository.findAll();
  return c.json(categories, 200);
}

export async function getCategoryById(c: Context) {
  const id = parseId(c.req.param('id'));
  const category = await categoriesRepository.findById(id);

  if (!category) {
    return c.json({ error: 'Category not found.' }, 404);
  }

  return c.json(category, 200);
}

export async function createCategory(c: Context) {
  try {
    const payload = createCategorySchema.parse(await c.req.json());
    const category = await categoriesRepository.create(payload);
    return c.json(category, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      const response = validationErrorResponse(error);
      return c.json(response.body, response.status);
    }

    const response = mapAppError(error);
    return c.json(response.body, response.status);
  }
}

export async function updateCategory(c: Context) {
  try {
    const id = parseId(c.req.param('id'));
    const payload = updateCategorySchema.parse(await c.req.json());
    const category = await categoriesRepository.update(id, payload);
    return c.json(category, 200);
  } catch (error) {
    if (error instanceof ZodError) {
      const response = validationErrorResponse(error);
      return c.json(response.body, response.status);
    }

    const response = mapAppError(error);
    return c.json(response.body, response.status);
  }
}

export async function deleteCategory(c: Context) {
  try {
    const id = parseId(c.req.param('id'));
    const category = await categoriesRepository.remove(id);
    return c.json(category, 200);
  } catch (error) {
    const response = mapAppError(error);
    return c.json(response.body, response.status);
  }
}
