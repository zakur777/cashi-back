import { prisma } from '../lib/prisma.js';
import type { CreateCategoryInput, UpdateCategoryInput } from '../schemas/categories.schema.js';

export const categoriesRepository = {
  findAll() {
    return prisma.category.findMany({ orderBy: { id: 'asc' } });
  },
  findById(id: number) {
    return prisma.category.findUnique({ where: { id } });
  },
  create(data: CreateCategoryInput) {
    return prisma.category.create({ data });
  },
  update(id: number, data: UpdateCategoryInput) {
    return prisma.category.update({ where: { id }, data });
  },
  remove(id: number) {
    return prisma.category.delete({ where: { id } });
  }
};
