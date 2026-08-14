export function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'string') return error;

  if (typeof error === 'object' && 'message' in error) {
    const message = error.message;
    return typeof message === 'string' ? message : undefined;
  }

  return String(error);
}

export function getFormErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('form' in error)) {
    return getErrorMessage(error);
  }

  return getErrorMessage(error.form);
}
