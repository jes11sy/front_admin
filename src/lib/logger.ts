/**
 * Простой логгер с поддержкой уровней и форматирования
 * В production логирует только warn и error
 */
const isDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname.includes('127.0.0.1') ||
   process.env.NODE_ENV === 'development')

class Logger {
  debug(message: string, data?: any) {
    if (isDev) {
      console.debug(`🔍 ${message}`, data || '')
    }
  }

  info(message: string, data?: any) {
    if (isDev) {
      console.info(`ℹ️ ${message}`, data || '')
    }
  }

  log(message: string, data?: any) {
    if (isDev) {
      console.log(`📝 ${message}`, data || '')
    }
  }

  warn(message: string, data?: any) {
    console.warn(`⚠️ ${message}`, data || '')
  }

  error(message: string, data?: any) {
    console.error(`❌ ${message}`, data || '')
  }
}

export const logger = new Logger()

