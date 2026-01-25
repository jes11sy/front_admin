/**
 * Санитизация строк для защиты от XSS
 * Удаляет опасные символы и паттерны
 */
export function sanitizeString(input: string): string {
  if (!input) return ''
  
  return input
    // Удаляем HTML теги
    .replace(/<[^>]*>/g, '')
    // Удаляем javascript: и data: протоколы
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    // Удаляем on* обработчики событий
    .replace(/on\w+\s*=/gi, '')
    // Удаляем опасные символы
    .replace(/[<>"'`]/g, '')
    .trim()
}

/**
 * Экранирование HTML для безопасного отображения
 */
export function escapeHtml(input: string): string {
  if (!input) return ''
  
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
  }
  
  return input.replace(/[&<>"'`/]/g, (char) => htmlEscapes[char] || char)
}

/**
 * Санитизация URL для предотвращения open redirect
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '/'
  
  // Должен начинаться с /
  if (!url.startsWith('/')) return '/'
  
  // Не должен начинаться с // (protocol-relative)
  if (url.startsWith('//')) return '/'
  
  // Не должен содержать опасные протоколы
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const lowerUrl = url.toLowerCase()
  if (dangerousProtocols.some(protocol => lowerUrl.includes(protocol))) {
    return '/'
  }
  
  return url
}

