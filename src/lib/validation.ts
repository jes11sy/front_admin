/**
 * Валидация полей
 */

type Validator = (value: string) => string | null

export const validators = {
  required: (message: string): Validator => {
    return (value: string) => {
      return value.trim() ? null : message
    }
  },
  
  minLength: (length: number, message: string): Validator => {
    return (value: string) => {
      return value.length >= length ? null : message
    }
  },
  
  maxLength: (length: number, message: string): Validator => {
    return (value: string) => {
      return value.length <= length ? null : message
    }
  },
}

export function validateField(value: string, validatorsList: Validator[]): string | null {
  for (const validator of validatorsList) {
    const error = validator(value)
    if (error) return error
  }
  return null
}

