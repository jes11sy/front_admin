/**
 * Простой логгер
 */
class Logger {
  info(message: string, data?: any) {
    // В production можно убрать
  }

  warn(message: string, data?: any) {
    // В production можно убрать
  }

  error(message: string, data?: any) {
    // В production можно убрать
  }
}

export const logger = new Logger()

