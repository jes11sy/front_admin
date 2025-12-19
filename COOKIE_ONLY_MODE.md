# ✅ Cookie-Only Mode - Полный переход на httpOnly cookies

## 🎉 Что сделано:

Admin frontend (`frontend/front admin`) **ПОЛНОСТЬЮ** переведен на httpOnly cookies.

---

## 📝 Изменения:

### 1. **Удалено из `src/lib/api.ts`:**

❌ **Убраны поля:**
```typescript
private token: string | null = null
private refreshToken: string | null = null
private useCookies: boolean = true
```

❌ **Убраны методы:**
```typescript
setToken(token, remember)
setRefreshToken(refreshToken, remember)
getAccessToken()
```

❌ **Убрана логика:**
- Сохранение токенов в localStorage/sessionStorage
- Проверка флага `use_cookie_auth`
- Dual mode (legacy + cookies)
- Добавление токенов в Authorization header

---

### 2. **Упрощены методы в `src/lib/api.ts`:**

#### ✅ `constructor()`
```typescript
// Было: Проверка useCookies, загрузка токенов
constructor(baseURL: string) {
  this.baseURL = baseURL
}
```

#### ✅ `clearToken()`
```typescript
// Было: Очистка token, refreshToken, localStorage, sessionStorage
clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
  }
}
```

#### ✅ `login()`
```typescript
// Было: if (useCookies) { ... } else { setToken, setRefreshToken }
// Теперь: Только сохранение user в localStorage
async login(login, password, rememberMe) {
  const response = await this.request(...)
  
  if (response.success && response.data?.user) {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem('user', JSON.stringify(response.data.user))
  }
  
  return response
}
```

#### ✅ `logout()`
```typescript
// Было: Очистка token, проверка useCookies, условная отправка headers
// Теперь: Всегда cookies
logout() {
  this.clearToken()
  
  fetch(`${this.baseURL}/auth/logout`, {
    method: 'POST',
    headers: {
      'X-Use-Cookies': 'true',
    },
    credentials: 'include',
  })
}
```

#### ✅ `refreshAccessToken()`
```typescript
// Было: if (useCookies) { ... } else { setToken, setRefreshToken }
// Теперь: Всегда cookies
private async refreshAccessToken(): Promise<boolean> {
  const response = await fetch(`${this.baseURL}/auth/refresh`, {
    headers: { 'X-Use-Cookies': 'true' },
    credentials: 'include',
    body: JSON.stringify({}),
  })
  
  return response.ok
}
```

#### ✅ `request()`
```typescript
// Было: if (useCookies) добавить header, else добавить Authorization
// Теперь: Всегда X-Use-Cookies + credentials: include
private async request<T>(endpoint, options, retryOn401) {
  const headers = {
    ...options.headers,
    'X-Use-Cookies': 'true',  // Всегда
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',  // Всегда
  })
  
  // ... обработка 401 через refreshAccessToken
}
```

---

### 3. **Упрощен `src/app/client-layout.tsx`:**

```typescript
// Было: Проверка use_cookie_auth, проверка localStorage токенов
// Теперь: Прямой запрос /profile
const checkAuth = async () => {
  if (isLoginPage) return
  
  try {
    // Токен автоматически в cookie
    const profileResponse = await apiClient.getProfile()
    
    if (profileResponse.success) {
      setUser(profileResponse.data)
    } else {
      router.push('/login')
    }
  } catch (error) {
    router.push('/login')
  }
}
```

---

## ✅ Что ОСТАЛОСЬ в localStorage:

**Только данные пользователя:**
```typescript
localStorage.setItem('user', JSON.stringify(user))  // ✅ ОК
sessionStorage.setItem('user', JSON.stringify(user))  // ✅ ОК
```

**Токены НЕ хранятся:** ❌
```typescript
// ❌ УЖЕ НЕТ:
localStorage.setItem('auth_token', token)
localStorage.setItem('refresh_token', refreshToken)
localStorage.setItem('use_cookie_auth', 'true')
```

---

## 🔒 Безопасность:

### ✅ Что улучшилось:

1. **Токены недоступны из JavaScript** (httpOnly)
2. **Защита от XSS** - даже если код скомпрометирован, токены украсть нельзя
3. **Автоматическая отправка cookies** - браузер управляет
4. **Подпись cookies** (signed) - защита от tampering
5. **Secure flag** - только HTTPS
6. **SameSite=None** - работает cross-subdomain

### ⚠️ Что нужно помнить:

- **CSRF защита:** Используется `X-Use-Cookies` header (custom header не может быть установлен CSRF атакой)
- **CORS:** Настроен `credentials: true` и `allowedHeaders: ['X-Use-Cookies']`

---

## 🧪 Тестирование:

### 1. Очистить старые данные:
```javascript
// В DevTools Console:
localStorage.clear()
sessionStorage.clear()
```

### 2. Залогиниться:
- Открыть https://core.lead-schem.ru/login
- Ввести логин/пароль
- **НЕ должно быть** `auth_token`, `refresh_token` в localStorage
- **Должны быть** `access_token`, `refresh_token` в cookies (вкладка Application → Cookies)

### 3. Проверить работу:
- Открыть дашборд - должно работать
- Подождать 15 минут - должен автоматически обновиться токен (401 → refresh → повтор запроса)
- Logout - cookies должны очиститься

---

## 🚀 Для деплоя:

```bash
cd frontend/front\ admin
npm run build
docker build -t front-admin:latest .
docker restart front-admin
```

---

## 📋 Checklist:

- ✅ Убраны `token`, `refreshToken`, `useCookies` из ApiClient
- ✅ Убраны методы `setToken`, `setRefreshToken`
- ✅ Упрощены `login`, `logout`, `request`, `refreshAccessToken`
- ✅ Упрощен `client-layout.tsx`
- ✅ Убраны проверки `localStorage.getItem('auth_token')`
- ✅ Убран флаг `use_cookie_auth`
- ✅ Всегда `X-Use-Cookies: true`
- ✅ Всегда `credentials: 'include'`
- ✅ Нет ошибок компиляции
- ✅ Backward compatibility НЕ нужна - полный переход

---

## 🎉 Готово!

Admin frontend полностью переведен на httpOnly cookies! 

**Следующие шаги:**
1. Протестировать
2. Задеплоить
3. Повторить для других фронтендов (director, operator, master)

