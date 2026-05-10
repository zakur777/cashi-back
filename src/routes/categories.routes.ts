import { Hono } from 'hono';
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory
} from '../controllers/categories.controller.js';

export const categoriesRoutes = new Hono();

categoriesRoutes.get('/', listCategories);
categoriesRoutes.get('/:id', getCategoryById);
categoriesRoutes.post('/', createCategory);
categoriesRoutes.patch('/:id', updateCategory);
categoriesRoutes.delete('/:id', deleteCategory);
