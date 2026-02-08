'use client'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
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
import { useDesignStore } from "@/store/design.store"
import { Sun, Moon, Eye, EyeOff } from 'lucide-react'

// Компонент формы логина (использует useSearchParams)
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({})
  const [showForm, setShowForm] = useState(false)
  const hasCheckedAuth = useRef(false)
  
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const toggleTheme = useDesignStore((state) => state.toggleTheme)
  
  // Rate Limiting
  const [attemptCount, setAttemptCount] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null)
  const MAX_ATTEMPTS = 10
  const BLOCK_DURATION = 5 * 60 * 1000
  
  const getSafeRedirectUrl = useCallback((): string => {
    const redirect = searchParams.get('redirect')
    if (!redirect) return '/'
    if (!redirect.startsWith('/')) return '/'
    if (redirect.startsWith('//')) return '/'
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
    if (dangerousProtocols.some(p => redirect.toLowerCase().includes(p))) return '/'
    return redirect
  }, [searchParams])

  // Быстрая проверка — если уже авторизован, редирект
  useEffect(() => {
    if (hasCheckedAuth.current) return
    hasCheckedAuth.current = true
    
    const check = async () => {
      // Проверяем store — если есть user, сразу редирект
      const store = useAuthStore.getState()
      if (store.user) {
        router.replace(getSafeRedirectUrl())
        return
      }
      
      // Быстрая проверка сессии (2 сек таймаут)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        
        // ✅ FIX: NEXT_PUBLIC_API_URL уже содержит /api/v1, не дублируем
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'
        const response = await fetch(`${baseUrl}/auth/profile`, {
          method: 'GET',
          headers: { 'X-Use-Cookies': 'true' },
          credentials: 'include',
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          // Авторизован — редирект
          router.replace(getSafeRedirectUrl())
          return
        }
      } catch {
        // Любая ошибка — показываем форму
      }
      
      // Не авторизован — показываем форму
      setShowForm(true)
    }
    
    check()
  }, [router, getSafeRedirectUrl])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (blockedUntil && Date.now() < blockedUntil) {
      const remainingSeconds = Math.ceil((blockedUntil - Date.now()) / 1000)
      const minutes = Math.floor(remainingSeconds / 60)
      const seconds = remainingSeconds % 60
      toast.error(`Слишком много попыток. Попробуйте через ${minutes}:${seconds.toString().padStart(2, '0')}`)
      return
    }
    
    if (blockedUntil && Date.now() >= blockedUntil) {
      setBlockedUntil(null)
      setAttemptCount(0)
    }
    
    setIsLoading(true)
    setErrors({})
    
    try {
      const sanitizedLogin = sanitizeString(login)
      const sanitizedPassword = password
      
      const loginError = validateField(sanitizedLogin, [
        validators.required('Введите логин'),
        validators.minLength(2, 'Логин слишком короткий'),
        validators.maxLength(50, 'Логин слишком длинный'),
      ])
      
      const passwordError = validateField(sanitizedPassword, [
        validators.required('Введите пароль'),
        validators.minLength(1, 'Пароль не может быть пустым'),
        validators.maxLength(100, 'Максимум 100 символов'),
      ])
      
      if (loginError || passwordError) {
        setErrors({ login: loginError || undefined, password: passwordError || undefined })
        toast.error(loginError || passwordError || 'Проверьте данные')
        setIsLoading(false)
        return
      }
      
      const data = await apiClient.login(sanitizedLogin, sanitizedPassword)
      
      setAttemptCount(0)
      setBlockedUntil(null)
      
      if (data.data?.user) {
        useAuthStore.setState({
          user: data.data.user,
          isAuthenticated: true,
        })
      }
      
      router.replace(getSafeRedirectUrl())
    } catch (error) {
      const newAttemptCount = attemptCount + 1
      setAttemptCount(newAttemptCount)
      
      if (newAttemptCount >= MAX_ATTEMPTS) {
        setBlockedUntil(Date.now() + BLOCK_DURATION)
        toast.error(`Превышен лимит попыток (${MAX_ATTEMPTS}). Блокировка на 5 минут.`)
      } else {
        const errorMessage = getErrorMessage(error, 'Неверный логин или пароль')
        if (errorMessage && !errorMessage.includes('SESSION_EXPIRED')) {
          toast.error(`${errorMessage}. Осталось попыток: ${MAX_ATTEMPTS - newAttemptCount}`)
        }
      }
      
      setIsLoading(false)
    }
  }

  // Пока проверяем — показываем простой спиннер (максимум 2 сек)
  if (!showForm) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#1e2530]' : 'bg-[#daece2]'}`}>
        <div className={`animate-spin h-8 w-8 border-2 border-t-transparent rounded-full ${theme === 'dark' ? 'border-white' : 'border-[#0d5c4b]'}`} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative transition-colors duration-300 ${theme === 'dark' ? 'bg-[#1e2530]' : 'bg-[#daece2]'}`}>
      <div className={`w-full max-w-sm rounded-2xl p-8 shadow-xl relative transition-colors duration-300 ${theme === 'dark' ? 'bg-[#2a3441]' : 'bg-white'}`}>
        
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 text-[#0d5c4b] transition-colors"
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

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

        <h1 className={`text-2xl font-semibold text-center mb-8 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
          Авторизация
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className={`text-sm font-medium mb-2 block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
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
              className={`h-12 bg-[#f5f5f0] border-0 text-gray-800 placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.login ? 'ring-2 ring-red-500' : ''}`}
              required
              autoComplete="username"
              maxLength={50}
            />
            {errors.login && <p className="text-red-400 text-sm mt-1">{sanitizeString(errors.login)}</p>}
          </div>

          <div>
            <Label className={`text-sm font-medium mb-2 block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
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
                className={`h-12 pr-12 bg-[#f5f5f0] border-0 text-gray-800 placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-teal-500 ${errors.password ? 'ring-2 ring-red-500' : ''}`}
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
            {errors.password && <p className="text-red-400 text-sm mt-1">{sanitizeString(errors.password)}</p>}
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
            ) : blockedUntil && Date.now() < blockedUntil ? 'Заблокировано' : 'Войти'}
          </Button>
          
          {attemptCount > 0 && attemptCount < MAX_ATTEMPTS && !blockedUntil && (
            <div className="text-center mt-2">
              <p className="text-yellow-400 text-sm font-medium">Осталось попыток: {MAX_ATTEMPTS - attemptCount}</p>
            </div>
          )}
        </form>
      </div>

      <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center text-xs transition-colors ${theme === 'dark' ? 'text-gray-500' : 'text-[#0d5c4b]/60'}`}>
        © 2026 Новые Схемы
      </div>
    </div>
  )
}

export default function LoginPage() {
  const theme = useDesignStore((state) => state.theme)
  
  return (
    <Suspense fallback={
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#1e2530]' : 'bg-[#daece2]'}`}>
        <div className={`animate-spin h-8 w-8 border-2 border-t-transparent rounded-full ${theme === 'dark' ? 'border-white' : 'border-[#0d5c4b]'}`} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
