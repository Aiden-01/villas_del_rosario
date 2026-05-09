export function cleanEmptyStrings<T extends Record<string, unknown>>(payload: T, fields: string[]) {
  const cleaned: Record<string, unknown> = { ...payload }

  for (const field of fields) {
    if (cleaned[field] === '') {
      cleaned[field] = undefined
    }
  }

  return cleaned as T
}

export function isValidationError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'E_VALIDATION_ERROR'
  )
}

export function validationMessages(error: unknown) {
  if (typeof error === 'object' && error !== null && 'messages' in error) {
    return (error as { messages: unknown }).messages
  }

  return undefined
}
