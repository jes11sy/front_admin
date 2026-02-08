'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { CustomInput } from "@/components/ui/custom-input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api"
import { sanitizeString } from "@/lib/sanitize"
import { logger } from "@/lib/logger"
import { toast } from "@/components/ui/toast"
import { getErrorMessage } from "@/lib/utils"
import { validators, validateField } from "@/lib/validation"
import { useAuthStore } from "@/store/auth.store"
import { Sun, Moon, Eye, EyeOff } from 'lucide-react'

// Компонент формы логина (использует useSearchParams)
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAuthStore((state) => state.setUser)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({})
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true)
  
  // Тема
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  // Rate Limiting: защита от брутфорс атак
  const [attemptCount, setAttemptCount] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null)
  const MAX_ATTEMPTS = 10 // Максимум попыток
  const BLOCK_DURATION = 5 * 60 * 1000 // 5 минут в миллисекундах
  
  // Загружаем тему из localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('admin-theme', newTheme)
  }
  
  /**
   * Безопасная валидация redirect URL
   * Защита от Open Redirect атаки
   */
  const getSafeRedirectUrl = useCallback((): string => {
    const redirect = searchParams.get('redirect')
    
    // Если redirect не указан - дефолтная страница
    if (!redirect) {
      return '/'
    }
    
    // Проверяем что это внутренний URL
    // ✅ Разрешено: /orders, /profile, /dashboard
    // ❌ Запрещено: //evil.com, https://evil.com, javascript:alert(1)
    
    // Должен начинаться с /
    if (!redirect.startsWith('/')) {
      logger.warn('Blocked external redirect attempt', { redirect })
      return '/'
    }
    
    // НЕ должен начинаться с // (protocol-relative URL)
    if (redirect.startsWith('//')) {
      logger.warn('Blocked protocol-relative redirect', { redirect })
      return '/'
    }
    
    // НЕ должен содержать опасные протоколы
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
    const lowerRedirect = redirect.toLowerCase()
    if (dangerousProtocols.some(protocol => lowerRedirect.includes(protocol))) {
      logger.warn('Blocked dangerous protocol in redirect', { redirect })
      return '/'
    }
    
    // Валидация пройдена - можно редиректить
    return redirect
  }, [searchParams])

  // Проверяем автовход при загрузке страницы логина
  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null
    
    const tryAutoLogin = async () => {
      // Таймаут безопасности - если проверка зависла, показываем форму
      timeoutId = setTimeout(() => {
        if (isMounted) {
          logger.warn('[Login] Auto-login timeout')
          setIsLoading(false)
          setIsCheckingAutoLogin(false)
        }
      }, 5000) // 5 секунд таймаут
      
      try {
        const { getSavedCredentials } = await import('@/lib/remember-me')
        const credentials = await getSavedCredentials()
        
        if (!isMounted) return
        
        if (credentials) {
          logger.info('[Login] Found saved credentials, attempting auto-login...')
          
          setIsLoading(true)
          
          try {
            const loginResponse = await apiClient.login(
              credentials.login,
              credentials.password,
              true
            )
            
            if (!isMounted) return
            
            if (loginResponse.success && loginResponse.data?.user) {
              if (timeoutId) clearTimeout(timeoutId)
              setUser(loginResponse.data.user)
              router.replace(getSafeRedirectUrl())
              return
            }
          } catch (loginError) {
            logger.error('[Login] Login request failed', { error: String(loginError) })
          }
          
          // Логин не удался
          if (isMounted) {
            logger.warn('[Login] Auto-login failed')
            if (timeoutId) clearTimeout(timeoutId)
            setIsLoading(false)
            setIsCheckingAutoLogin(false)
          }
        } else {
          // Нет сохраненных данных - показываем форму
          if (isMounted) {
            logger.info('[Login] No saved credentials found')
            if (timeoutId) clearTimeout(timeoutId)
            setIsCheckingAutoLogin(false)
          }
        }
      } catch (error) {
        if (isMounted) {
          logger.error('[Login] Auto-login error', { error: String(error) })
          if (timeoutId) clearTimeout(timeoutId)
          setIsLoading(false)
          setIsCheckingAutoLogin(false)
        }
      }
    }
    
    tryAutoLogin()
    
    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [router, setUser, getSafeRedirectUrl])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Проверяем блокировку ПЕРЕД любыми действиями
    if (blockedUntil && Date.now() < blockedUntil) {
      const remainingSeconds = Math.ceil((blockedUntil - Date.now()) / 1000)
      const minutes = Math.floor(remainingSeconds / 60)
      const seconds = remainingSeconds % 60
      toast.error(
        `Слишком много попыток входа. Попробуйте через ${minutes}:${seconds.toString().padStart(2, '0')}`
      )
      return
    }
    
    // Если блокировка истекла - сбрасываем
    if (blockedUntil && Date.now() >= blockedUntil) {
      setBlockedUntil(null)
      setAttemptCount(0)
    }
    
    setIsLoading(true)
    setErrors({}) // Очищаем предыдущие ошибки
    
    try {
      // Санитизация ввода перед отправкой
      const sanitizedLogin = sanitizeString(login)
      const sanitizedPassword = password // Пароль не санитизируем, но и не логируем
      
      // Валидация логина
      const loginError = validateField(sanitizedLogin, [
        validators.required('Введите логин'),
        validators.minLength(2, 'Логин слишком короткий'),
        validators.maxLength(50, 'Логин слишком длинный'),
      ])
      
      // Валидация пароля (мягкая проверка для входа, строгие требования на backend при создании)
      const passwordError = validateField(sanitizedPassword, [
        validators.required('Введите пароль'),
        validators.minLength(1, 'Пароль не может быть пустым'), // Мягкая проверка - только не пустой
        validators.maxLength(100, 'Максимум 100 символов'),
      ])
      
      // Если есть ошибки валидации - показываем их
      if (loginError || passwordError) {
        setErrors({
          login: loginError || undefined,
          password: passwordError || undefined,
        })
        toast.error(loginError || passwordError || 'Проверьте введенные данные')
        setIsLoading(false)
        return
      }
      
      const data = await apiClient.login(sanitizedLogin, sanitizedPassword)
      
      // ✅ УСПЕШНЫЙ ВХОД - сбрасываем счетчик попыток
      setAttemptCount(0)
      setBlockedUntil(null)
      
      // Сохраняем пользователя в store
      if (data.data?.user) {
        setUser(data.data.user)
      }
      
      logger.info('Пользователь успешно авторизован')
      
      // Безопасный редирект (защита от Open Redirect атаки)
      const safeRedirectUrl = getSafeRedirectUrl()
      router.push(safeRedirectUrl)
    } catch (error) {
      // ❌ НЕУДАЧНАЯ ПОПЫТКА - увеличиваем счетчик
      const newAttemptCount = attemptCount + 1
      setAttemptCount(newAttemptCount)
      
      // Проверяем достигнут ли лимит попыток
      if (newAttemptCount >= MAX_ATTEMPTS) {
        const blockTime = Date.now() + BLOCK_DURATION
        setBlockedUntil(blockTime)
        toast.error(
          `Превышен лимит попыток входа (${MAX_ATTEMPTS}). Аккаунт заблокирован на 5 минут.`
        )
        logger.warn('Login attempts exceeded', { attemptCount: newAttemptCount })
      } else {
        // Показываем сколько попыток осталось
        const remainingAttempts = MAX_ATTEMPTS - newAttemptCount
        const errorMessage = getErrorMessage(error, 'Неверный логин или пароль')
        
        if (errorMessage && !errorMessage.includes('SESSION_EXPIRED')) {
          toast.error(
            `${errorMessage}. Осталось попыток: ${remainingAttempts}`
          )
        }
      }
      
      setIsLoading(false)
    }
  }

  // Показываем загрузку во время проверки автовхода
  if (isCheckingAutoLogin) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#1e2530]' : 'bg-[#daece2]'
      }`}>
        <div className="text-center">
          <svg className={`animate-spin h-12 w-12 mx-auto mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-[#0d5c4b]'
          }`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-[#0d5c4b]'}`}>
            Проверка авторизации...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 relative transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#1e2530]' : 'bg-[#daece2]'
      }`}
    >
      {/* Login Card */}
      <div className={`w-full max-w-sm rounded-2xl p-8 shadow-xl relative transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#2a3441]' : 'bg-white'
      }`}>
        
        {/* Переключатель темы справа вверху */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 text-[#0d5c4b] transition-colors"
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image 
            src={theme === 'dark' ? "/logo/logo_dark_v2.png" : "/logo/logo_light_v2.png"}
            alt="Новые Схемы" 
            width={180} 
            height={40} 
            className="h-10 w-auto object-contain" 
            priority
          />
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-semibold text-center mb-8 ${
          theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
        }`}>
          Авторизация
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className={`text-sm font-medium mb-2 block ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Логин
            </Label>
            <CustomInput
              id="login"
              type="text"
              placeholder="Введите логин"
              value={login}
              onChange={(e) => {
                setLogin(sanitizeString(e.target.value))
                if (errors.login) setErrors(prev => ({ ...prev, login: undefined }))
              }}
              className={`h-12 bg-[#f5f5f0] border-0 text-gray-800 placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-teal-500 ${
                errors.login ? 'ring-2 ring-red-500' : ''
              }`}
              required
              autoComplete="username"
              maxLength={50}
            />
            {errors.login && (
              <p className="text-red-400 text-sm mt-1">
                {sanitizeString(errors.login)}
              </p>
            )}
          </div>

          <div>
            <Label className={`text-sm font-medium mb-2 block ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Пароль
            </Label>
            <div className="relative">
              <CustomInput
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                }}
                className={`h-12 pr-12 bg-[#f5f5f0] border-0 text-gray-800 placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-teal-500 ${
                  errors.password ? 'ring-2 ring-red-500' : ''
                }`}
                required
                autoComplete="current-password"
                maxLength={100}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">
                {sanitizeString(errors.password)}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white font-semibold rounded-lg transition-colors" 
            disabled={isLoading || (blockedUntil !== null && Date.now() < blockedUntil)}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Вход...
              </span>
            ) : blockedUntil && Date.now() < blockedUntil ? (
              'Заблокировано'
            ) : (
              'Войти'
            )}
          </Button>
          
          {/* Предупреждение о количестве оставшихся попыток */}
          {attemptCount > 0 && attemptCount < MAX_ATTEMPTS && !blockedUntil && (
            <div className="text-center mt-2">
              <p className="text-yellow-400 text-sm font-medium">
                Осталось попыток: {MAX_ATTEMPTS - attemptCount}
              </p>
            </div>
          )}
        </form>
      </div>

      {/* Footer */}
      <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center text-xs transition-colors ${
        theme === 'dark' ? 'text-gray-500' : 'text-[#0d5c4b]/60'
      }`}>
        © 2026 Новые Схемы
      </div>
    </div>
  )
}

// Главный компонент страницы с Suspense (требование Next.js 15 для useSearchParams)
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#daece2]">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-[#0d5c4b] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-[#0d5c4b] text-lg">Загрузка...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
