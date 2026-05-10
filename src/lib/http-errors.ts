import { ZodError } from 'zod';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { parsePrismaError } from './prisma-errors.js';

export type HttpErrorResponse<TBody> = {
  status: ContentfulStatusCode;
  body: TBody;
};

export function validationErrorResponse(error: ZodError): HttpErrorResponse<{
  error: string;
  errors: ZodError['issues'];
}> {
  return {
    status: 400,
    body: {
      error: 'Validation error.',
      errors: error.issues
    }
  };
}

export function mapAppError(error: unknown): HttpErrorResponse<{ error: string }> {
  const prismaError = parsePrismaError(error);
  return {
    status: prismaError.status as ContentfulStatusCode,
    body: {
      error: prismaError.message
    }
  };
}
