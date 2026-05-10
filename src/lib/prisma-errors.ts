export type PrismaHttpError = {
  status: number;
  message: string;
};

const prismaErrorMessages: Record<string, PrismaHttpError> = {
  P2002: { status: 409, message: 'Resource already exists.' },
  P2003: { status: 422, message: 'Referenced resource does not exist.' },
  P2025: { status: 404, message: 'Resource not found.' }
};

function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const { code } = error;
  return typeof code === 'string' ? code : null;
}

function getPrismaErrorName(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return null;
  }

  const { name } = error;
  return typeof name === 'string' ? name : null;
}

export function parsePrismaError(error: unknown): PrismaHttpError {
  const code = getPrismaErrorCode(error);

  if (code && code in prismaErrorMessages) {
    return prismaErrorMessages[code];
  }

  if (code?.startsWith('P')) {
    return { status: 500, message: 'Unexpected database error.' };
  }

  if (getPrismaErrorName(error) === 'PrismaClientInitializationError') {
    return { status: 500, message: 'Database unavailable.' };
  }

  return { status: 500, message: 'Internal server error.' };
}

export const toPrismaHttpError = parsePrismaError;
