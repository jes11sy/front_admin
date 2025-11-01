/**
 * Санитизация строк для защиты от XSS
 */
export function sanitizeString(input: string): string {
  if (!input) return ''
  
  return input
    .replace(/[<>]/g, '') // Удаляем < и >
    .trim()
}

