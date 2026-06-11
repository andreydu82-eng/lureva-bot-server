# LUREVA FISHING — bot-server для Telegram Stars

Это сервер для приема оплаты Telegram Stars и выдачи PRO-доступа.

## Что делает сервер

- Создает счет Telegram Stars через `createInvoiceLink`
- Отвечает на `pre_checkout_query`
- Получает `successful_payment`
- Сохраняет PRO-доступ в `pro-users.json`
- Отвечает приложению по `/api/pro-status`

## Файлы

- `server.js` — сервер
- `package.json` — зависимости
- `.env.example` — пример настроек
- `pro-users.json` — появится после первой оплаты

## Настройка

1. Создайте `.env` рядом с `server.js`
2. Укажите:

```env
BOT_TOKEN=токен_от_BotFather
WEBAPP_URL=https://ваша-ссылка.netlify.app
PORT=3000
```

3. Запуск:

```bash
npm install
npm start
```

## Webhook

После публикации сервера на Render/Railway/VPS нужно установить webhook:

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://ВАШ-СЕРВЕР/telegram/webhook
```

## Важно

Для цифровых функций внутри Telegram нужно использовать Telegram Stars, валюта `XTR`.
