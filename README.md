# Admin Frontend - Новые Схемы

Панель администратора (учредителя) для управления всей системой.

## Технологии

- **Next.js 15** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (state management)
- **Radix UI** (UI components)

## Разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки (порт 3004)
npm run dev

# Сборка для production
npm run build

# Запуск production версии
npm start
```

## Структура

```
src/
├── app/                    # Next.js App Router
│   ├── employees/         # Управление сотрудниками
│   ├── regions/           # Управление регионами
│   ├── reports/           # Отчеты и аналитика
│   ├── login/             # Страница входа
│   └── page.tsx           # Главная страница
├── components/            # React компоненты
│   ├── navigation.tsx     # Навигация
│   └── ui/                # UI компоненты
├── lib/                   # Утилиты и библиотеки
│   ├── api.ts            # API клиент
│   └── utils.ts          # Вспомогательные функции
└── store/                # Zustand stores
    └── auth.store.ts     # Состояние авторизации
```

## Переменные окружения

Создайте файл `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.test-shem.ru/api/v1
```

## Роль администратора

Администратор (учредитель) имеет полный доступ ко всем функциям системы:

- ✅ Создание и управление всеми сотрудниками
- ✅ Управление регионами и региональными менеджерами
- ✅ Просмотр глобальных отчетов
- ✅ Контроль финансов всей компании

## Доступ

Логин для доступа к админке выдается только учредителю.

**URL:** https://admin.test-shem.ru

