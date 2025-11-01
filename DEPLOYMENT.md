# 🚀 Деплой Admin CRM Frontend

Инструкция по развертыванию Admin CRM Frontend в Kubernetes.

## 📋 Предварительные требования

- Kubernetes кластер с настроенным namespace `frontend`
- Docker Hub аккаунт с доступом к репозиторию `jes11sy/front_admin`
- Настроенный ingress controller с SSL сертификатами
- Secret `dockerhub-secret` для pull образа из Docker Hub

## 🏗️ Структура файлов

```
k8s/
├── deployments/
│   └── admincrm-deployment.yaml    # Deployment для админки
├── services/
│   └── admincrm-service.yaml       # Service для админки
└── ingress/
    └── frontend-ingress.yaml       # Обновлен ingress (добавлен test-shem.ru)
```

## 📦 Сборка Docker образа

```bash
cd "front admin"

# Сборка образа
docker build -t jes11sy/front_admin:latest .

# Тестирование образа локально
docker run -p 3004:3004 \
  -e NEXT_PUBLIC_API_URL=https://api.test-shem.ru/api/v1 \
  -e NEXT_PUBLIC_S3_BUCKET_URL=https://s3.twcstorage.ru/f7eead03-crmfiles \
  jes11sy/front_admin:latest

# Отправка в Docker Hub
docker push jes11sy/front_admin:latest
```

## 🚀 Развертывание в Kubernetes

### 1. Применение Deployment

```bash
kubectl apply -f k8s/deployments/admincrm-deployment.yaml
```

### 2. Применение Service

```bash
kubectl apply -f k8s/services/admincrm-service.yaml
```

### 3. Обновление Ingress

```bash
kubectl apply -f k8s/ingress/frontend-ingress.yaml
```

### 4. Проверка статуса

```bash
# Проверка deployment
kubectl get deployment admincrm-frontend -n frontend

# Проверка pods
kubectl get pods -n frontend -l app=admincrm-frontend

# Проверка service
kubectl get service admincrm-frontend-service -n frontend

# Проверка ingress
kubectl get ingress frontend-ingress -n frontend

# Логи
kubectl logs -n frontend -l app=admincrm-frontend --tail=50 -f
```

## 🔧 Переменные окружения

Deployment использует следующие переменные окружения:

- `NODE_ENV=production`
- `PORT=3004`
- `HOSTNAME=0.0.0.0`
- `NEXT_PUBLIC_API_URL=https://api.test-shem.ru/api/v1`
- `NEXT_PUBLIC_S3_BUCKET_URL=https://s3.twcstorage.ru/f7eead03-crmfiles`

## 🌐 Доступ

После успешного развертывания админка будет доступна по адресу:

**Production:** https://test-shem.ru

## 🔄 Обновление

Для обновления приложения:

```bash
# 1. Собрать новый образ
cd "front admin"
docker build -t jes11sy/front_admin:latest .
docker push jes11sy/front_admin:latest

# 2. Перезапустить deployment
kubectl rollout restart deployment/admincrm-frontend -n frontend

# 3. Проверить статус обновления
kubectl rollout status deployment/admincrm-frontend -n frontend
```

## 📊 Мониторинг

### Health Checks

Deployment настроен с проверками:

- **Liveness Probe:** `/login` каждые 10 секунд (начальная задержка 45 сек)
- **Readiness Probe:** `/login` каждые 10 секунд (начальная задержка 20 сек)

### Ресурсы

- **Requests:** 256Mi памяти, 250m CPU
- **Limits:** 512Mi памяти, 500m CPU

## 🐛 Troubleshooting

### Pod не запускается

```bash
# Проверить логи
kubectl logs -n frontend -l app=admincrm-frontend

# Проверить события
kubectl describe pod -n frontend -l app=admincrm-frontend
```

### Проблемы с ingress

```bash
# Проверить ingress
kubectl describe ingress frontend-ingress -n frontend

# Проверить сертификаты
kubectl get certificate -n frontend
```

### Проблемы с подключением к API

```bash
# Проверить переменные окружения в pod
kubectl exec -n frontend -l app=admincrm-frontend -- env | grep NEXT_PUBLIC
```

## ✅ Checklist перед деплоем

- [ ] Docker образ собран и отправлен в Docker Hub
- [ ] Secret `dockerhub-secret` создан в namespace `frontend`
- [ ] Namespace `frontend` существует
- [ ] DNS запись `test-shem.ru` настроена
- [ ] SSL сертификат будет автоматически выпущен через cert-manager
- [ ] Backend API доступен по адресу `https://api.test-shem.ru/api/v1`
- [ ] CORS настроен в backend-ingress.yaml для `test-shem.ru`

## 📝 Примечания

- Приложение использует standalone режим Next.js для оптимизации размера образа
- Используется nodeSelector для привязки к конкретной ноде (worker-192.168.0.5)
- Все запросы идут через HTTPS благодаря SSL redirect в ingress
- Rate limiting настроен на уровне ingress для защиты от DDoS

---

**Готово к production!** 🎉

