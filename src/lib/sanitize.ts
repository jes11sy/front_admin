/**
 * Санитизация строк для защиты от XSS
 * Использует DOMPurify для надежной защиты
 */
import DOMPurify from 'dompurify';

// Конфигурация DOMPurify для строгой санитизации
const STRICT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [], // Не разрешаем никакие теги
  ALLOWED_ATTR: [], // Не разрешаем никакие атрибуты
  KEEP_CONTENT: true, // Сохраняем текстовое содержимое
};

/**
 * Санитизация строки - удаляет все HTML теги и опасные паттерны
 * @param input - входная строка
 * @returns очищенная строка
 */
export function sanitizeString(input: string): string {
  if (!input) return ''
  
  // Используем DOMPurify для надежной санитизации
  return DOMPurify.sanitize(input, STRICT_CONFIG).trim()
}

/**
 * Экранирование HTML для безопасного отображения
 * @param input - входная строка
 * @returns экранированная строка
 */
export function escapeHtml(input: string): string {
  if (!input) return ''
  
  // DOMPurify с пустым списком тегов экранирует все HTML
  return DOMPurify.sanitize(input, STRICT_CONFIG)
}

/**
 * Санитизация URL для предотвращения open redirect
 * @param url - URL для проверки
 * @returns безопасный URL или '/'
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
