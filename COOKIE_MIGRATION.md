# 🍪 Cookie Authentication - Admin Frontend

## ✅ Что сделано

### 1. API Client обновлен (`src/lib/api.ts`)

#### Новые возможности:
- ✅ **Dual Mode**: Автоматическое переключение между cookie mode и legacy mode
- ✅ **HttpOnly Cookies**: Токены передаются через безопасные cookies
- ✅ **Credentials**: `credentials: 'include'` для отправки cookies
- ✅ **X-Use-Cookies Header**: Сигнализирует backend о использовании cookies
- ✅ **Backward Compatible**: Старый код продолжает работать

#### Изменения в методах:

**`constructor()`**
```typescript
// Проверяет флаг use_cookie_auth в localStorage
// По умолчанию: true (cookie mode)
// Если false - загружает legacy токены
```

**`request()`**
```typescript
// Cookie mode: добавляет X-Use-Cookies header и credentials: 'include'
// Legacy mode: отправляет Bearer token в Authorization header
```

**`login()`**
```typescript
// Cookie mode: НЕ сохраняет токены, только user данные
// Legacy mode: сохраняет токены в localStorage/sessionStorage
```

**`logout()`**
```typescript
// Cookie mode: отправляет X-Use-Cookies header для очистки cookies
// Legacy mode: отправляет Bearer token
```

**`refreshAccessToken()`**
```typescript
// Cookie mode: НЕ отправляет body, refresh token в cookie
// Legacy mode: отправляет refreshToken в body
```

---

## 📋 Как использовать

### Включить Cookie Mode (по умолчанию)
```javascript
// В браузере - откройте DevTools Console
localStorage.setItem('use_cookie_auth', 'true')
// Или просто удалите ключ (по умолчанию true)
localStorage.removeItem('use_cookie_auth')
```

### Вернуться к Legacy Mode
```javascript
// В браузере - откройте DevTools Console
localStorage.setItem('use_cookie_auth', 'false')
```

---

## 🔒 Безопасность

### Cookie Mode обеспечивает:
1. **HttpOnly** - JavaScript не может прочитать токен (защита от XSS)
2. **Secure** - Cookies только через HTTPS (в production)
3. **SameSite=Strict** - Защита от CSRF атак
4. **Signed Cookies** - Защита от подделки (tampering)
5. **__Host- Prefix** - Привязка к домену и пути

### Legacy Mode:
- Токены в localStorage/sessionStorage (уязвимость к XSS)
- Требует ручного управления токенами в коде

---

## 🧪 Тестирование

### 1. Тест входа (Cookie Mode)
```bash
# В браузере DevTools Console:
localStorage.setItem('use_cookie_auth', 'true')

# Перейдите на /login и войдите
# Проверьте в DevTools > Application > Cookies:
# - Должны быть __Host-access_token
# - Должны быть __Host-refresh_token
# - HttpOnly: ✓
# - Secure: ✓
# - SameSite: Strict
```

### 2. Проверка localStorage
```bash
# В браузере DevTools Console:
localStorage.getItem('auth_token') // null ✅
localStorage.getItem('refresh_token') // null ✅
localStorage.getItem('user') // {...} ✅ (только user данные)
```

### 3. Проверка защищенных запросов
```bash
# Откройте любую страницу требующую авторизации
# DevTools > Network:
# Request Headers должны содержать:
# - X-Use-Cookies: true ✅
# - Cookie: __Host-access_token=...; __Host-refresh_token=... ✅
```

### 4. Тест logout
```bash
# Нажмите "Выйти"
# DevTools > Application > Cookies:
# - __Host-access_token удален ✅
# - __Host-refresh_token удален ✅
```

---

## 🚀 Следующие шаги

1. ✅ Backend готов
2. ✅ Admin frontend готов
3. ⏳ Обновить остальные фронтенды:
   - `frontend dir` (director panel)
   - `frontend callcentre` (call center panel)
   - `frontend master` (master panel)
4. ⏳ Очистить legacy код после миграции

---

## 🐛 Troubleshooting

### Проблема: "Authentication required" после входа
**Решение:**
```bash
# Проверьте в DevTools > Network > Request Headers:
# 1. Есть ли X-Use-Cookies: true?
# 2. Есть ли Cookie: __Host-access_token=...?

# Если нет, проверьте:
localStorage.getItem('use_cookie_auth') // должно быть 'true' или null
```

### Проблема: Cookies не устанавливаются
**Решение:**
```bash
# 1. Проверьте CORS настройки backend
# 2. Проверьте что API_BASE_URL совпадает с domain cookies
# 3. В production проверьте HTTPS (Secure flag требует HTTPS)
```

### Проблема: 401 после refresh
**Решение:**
```bash
# Проверьте DevTools > Network > refresh запрос:
# 1. Request должен содержать Cookie: __Host-refresh_token=...
# 2. X-Use-Cookies: true
# 3. credentials: 'include'
```

---

## 📝 Changelog

### 2025-12-19
- ✅ Добавлен Cookie Mode в API client
- ✅ Обновлены все auth методы для dual mode
- ✅ Добавлена обратная совместимость
- ✅ Создана документация

