# Football Intelligence

Мобильная панель live-матчей и статистики на базе Soccer Data API.

## Что работает
- Список матчей в прямом эфире.
- Матчи за выбранную дату.
- Live-счёт, минута и статус.
- Статистика матча: владение, xG, удары, удары в створ, угловые, голевые моменты, фолы, карточки, сейвы, передачи, отборы и перехваты — только если источник предоставляет показатель.
- Автообновление каждые 30 секунд.
- Серверный proxy: ключ API не попадает в браузер и не хранится в Git.

## Развёртывание на Vercel
1. Импортировать этот GitHub-репозиторий в Vercel.
2. Добавить Environment Variable `SOCCER_DATA_KEY` со своим ключом Soccer Data API для Production и Preview.
3. Выполнить Deploy.

## Локальная проверка
Требуется Node.js 18+. Установите Vercel CLI и запустите `vercel dev`. Перед запуском задайте `SOCCER_DATA_KEY` в локальном окружении. Не добавляйте ключ в файлы репозитория.

## API
- `GET /api/matches?status=live`
- `GET /api/matches?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`
- `GET /api/matches?match_id=match_…&view=live-stats`
- `GET /api/matches?match_id=match_…&view=stats`
- `GET /api/matches?match_id=match_…&view=timeline`

Провайдер: [Soccer Data API](https://soccer-data.co/docs/reference). Частота и свежесть live-данных зависят от тарифа API. Приложение не генерирует фиктивные статистические значения.
