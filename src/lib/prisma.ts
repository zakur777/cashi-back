import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __cashiPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__cashiPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__cashiPrisma = prisma;
}
