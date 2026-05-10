import { Prisma } from '@prisma/client';

export type PrismaHttpError = {
  status: number;
  message: string;
};

export function toPrismaHttpError(error: unknown): PrismaHttpError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return { status: 409, message: 'Resource already exists.' };
      case 'P2003':
        return { status: 422, message: 'Referenced resource does not exist.' };
      case 'P2025':
        return { status: 404, message: 'Resource not found.' };
      default:
        return { status: 500, message: 'Unexpected database error.' };
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { status: 500, message: 'Database unavailable.' };
  }

  return { status: 500, message: 'Internal server error.' };
}
