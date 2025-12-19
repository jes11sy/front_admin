# ✅ Admin Frontend - Cookie Migration Complete

## 🎯 Что сделано

### 1. API Client обновлен
**Файл:** `src/lib/api.ts`

✅ Добавлен флаг `useCookies` (по умолчанию `true`)
✅ Все запросы отправляют `credentials: 'include'` и `X-Use-Cookies: true`
✅ Login НЕ сохраняет токены в localStorage (только user данные)
✅ Logout отправляет header для очистки cookies на backend
✅ Refresh работает БЕЗ body (refresh token в cookie)
✅ Retry логика (401) работает с cookies
✅ Обратная совместимость с legacy mode

### 2. Страница логина
**Файл:** `src/app/login/page.tsx`

✅ Использует `apiClient.login()` - никаких изменений не требуется
✅ Автоматически работает в cookie mode

### 3. Документация создана
**Файл:** `COOKIE_MIGRATION.md`

✅ Инструкции по использованию
✅ Troubleshooting guide
✅ Security considerations

---

## 🧪 Как протестировать

### Шаг 1: Включить Cookie Mode (уже включен по умолчанию)
```javascript
// Откройте DevTools Console на https://admin.lead-schem.ru
localStorage.setItem('use_cookie_auth', 'true')
// Или просто удалите - по умолчанию true:
localStorage.removeItem('use_cookie_auth')
```

### Шаг 2: Очистить старые токены
```javascript
localStorage.removeItem('auth_token')
localStorage.removeItem('refresh_token')
sessionStorage.removeItem('auth_token')
sessionStorage.removeItem('refresh_token')
```

### Шаг 3: Войти заново
1. Перейдите на https://admin.lead-schem.ru/login
2. Войдите с вашими credentials
3. Откройте DevTools > Application > Cookies
4. Проверьте наличие:
   - `__Host-access_token` ✅
   - `__Host-refresh_token` ✅
   - Флаги: HttpOnly ✅, Secure ✅, SameSite=Strict ✅

### Шаг 4: Проверить что токены НЕ в localStorage
```javascript
// В DevTools Console:
localStorage.getItem('auth_token')     // null ✅
localStorage.getItem('refresh_token')  // null ✅
localStorage.getItem('user')           // {"id":6,"login":"jessy"...} ✅
```

### Шаг 5: Проверить защищенные запросы
1. Откройте любую страницу (orders, dashboard, etc)
2. DevTools > Network
3. Выберите любой API запрос
4. Request Headers должны содержать:
   ```
   X-Use-Cookies: true
   Cookie: __Host-access_token=...; __Host-refresh_token=...
   ```

### Шаг 6: Проверить refresh (опционально)
```javascript
// В DevTools Console:
// Подождите 15 минут (access token истечет)
// Или сделайте запрос, который вызовет 401 и автоматический refresh
```

### Шаг 7: Проверить logout
1. Нажмите кнопку "Выйти"
2. DevTools > Application > Cookies
3. Проверьте что cookies удалены:
   - `__Host-access_token` отсутствует ✅
   - `__Host-refresh_token` отсутствует ✅

---

## 🔒 Безопасность

### До миграции (Legacy Mode):
❌ Токены в localStorage - уязвимость к XSS
❌ JavaScript может прочитать токены
❌ Нет защиты от CSRF
❌ Нет защиты от подделки (tampering)

### После миграции (Cookie Mode):
✅ HttpOnly - JavaScript НЕ может прочитать токены
✅ Secure - Cookies только через HTTPS (production)
✅ SameSite=Strict - Защита от CSRF атак
✅ Signed Cookies - Защита от подделки
✅ __Host- Prefix - Защита от subdomain/path spoofing

---

## 🐛 Troubleshooting

### Проблема: "Authentication required" после входа
**Причина:** Cookie mode отключен или cookies не отправляются

**Решение:**
```javascript
// 1. Проверьте флаг:
localStorage.getItem('use_cookie_auth') // должно быть 'true' или null

// 2. Включите cookie mode:
localStorage.setItem('use_cookie_auth', 'true')

// 3. Перезагрузите страницу и войдите заново
location.reload()
```

### Проблема: Cookies не устанавливаются после логина
**Причина:** CORS или domain mismatch

**Решение:**
1. Проверьте что API_BASE_URL в `.env.local` совпадает с production URL
2. В production проверьте что используется HTTPS (Secure flag требует HTTPS)
3. Проверьте CORS настройки на backend (credentials: true)

### Проблема: 401 ошибки на каждом запросе
**Причина:** Cookies не отправляются с запросами

**Решение:**
```javascript
// Проверьте DevTools > Network > любой API запрос > Request Headers:
// Должно быть:
// X-Use-Cookies: true
// Cookie: __Host-access_token=...; __Host-refresh_token=...

// Если cookies отсутствуют, проверьте что cookie mode включен:
localStorage.getItem('use_cookie_auth') // 'true' или null
```

### Проблема: Logout не очищает cookies
**Причина:** Backend не получает header X-Use-Cookies

**Решение:**
- Проверьте DevTools > Network > logout запрос
- Request Headers должны содержать `X-Use-Cookies: true`

---

## 📊 Статус миграции

| Компонент | Статус | Примечания |
|-----------|--------|------------|
| Backend (auth-service) | ✅ Complete | Dual mode работает |
| API Client | ✅ Complete | Cookie mode по умолчанию |
| Login Page | ✅ Complete | Автоматически использует API client |
| Protected Routes | ✅ Complete | Автоматически через API client |
| Logout | ✅ Complete | Очищает cookies на backend |
| Refresh Token | ✅ Complete | Работает через cookies |

---

## 🚀 Следующие шаги

1. ✅ Backend готов (auth-service)
2. ✅ Admin frontend готов
3. ⏳ Обновить director frontend (`frontend dir`)
4. ⏳ Обновить callcentre frontend (`frontend callcentre`)
5. ⏳ Обновить master frontend (`frontend master`)
6. ⏳ Через 2-4 недели удалить legacy code:
   - Удалить `setToken()`, `setRefreshToken()` методы
   - Удалить `localStorage.getItem('auth_token')` логику
   - Удалить флаг `useCookies` (оставить только cookie mode)

---

## 📝 Changelog

### 2025-12-19 - Phase 2 Complete ✅
- ✅ API Client обновлен для cookie mode
- ✅ Добавлена обратная совместимость
- ✅ Login/Logout работают с cookies
- ✅ Refresh token через cookies
- ✅ Документация создана
- ✅ Ready for production testing

**Admin frontend готов к тестированию! 🎉**

