import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || '';
const PORT = process.env.PORT || 3000;
const DB_FILE = './pro-users.json';

const PLANS = {
  pro_7d: {
    title: 'LUREVA FISHING PRO — 7 дней',
    description: 'Полный доступ к PRO-функциям на 7 дней',
    amount: 99,
    days: 7,
    label: 'PRO активен 7 дней'
  },
  pro_30d: {
    title: 'LUREVA FISHING PRO — 1 месяц',
    description: 'Полный доступ к PRO-функциям на 30 дней',
    amount: 299,
    days: 30,
    label: 'PRO активен 30 дней'
  },
  pro_lifetime: {
    title: 'LUREVA FISHING PRO — навсегда',
    description: 'Пожизненный доступ к PRO-функциям',
    amount: 999,
    days: 36500,
    label: 'PRO навсегда'
  }
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function activatePro(telegramId, planKey, chargeId = '') {
  const plan = PLANS[planKey];
  if (!plan) return;

  const db = readDb();
  const now = Date.now();
  const expiresAt = now + plan.days * 24 * 60 * 60 * 1000;

  db[String(telegramId)] = {
    telegram_id: String(telegramId),
    plan: planKey,
    label: plan.label,
    active: true,
    started_at: new Date(now).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
    telegram_payment_charge_id: chargeId
  };

  writeDb(db);
}

async function telegramApi(method, payload) {
  if (!BOT_TOKEN) throw new Error('BOT_TOKEN is missing');

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Telegram API error:', data);
    throw new Error(data.description || 'Telegram API error');
  }

  return data.result;
}

app.get('/', (req, res) => {
  res.json({ok: true, service: 'LUREVA FISHING Stars server'});
});

app.get('/api/pro-status', (req, res) => {
  const telegramId = String(req.query.telegram_id || '');
  const db = readDb();
  const user = db[telegramId];

  if (!user) return res.json({active: false});

  const active = user.active && new Date(user.expires_at).getTime() > Date.now();
  res.json({
    active,
    plan: user.plan,
    label: user.label,
    expires_at: user.expires_at
  });
});

app.post('/api/create-invoice', async (req, res) => {
  try {
    const {telegram_id, plan} = req.body || {};
    const selected = PLANS[plan];

    if (!telegram_id) return res.status(400).json({ok: false, error: 'telegram_id is required'});
    if (!selected) return res.status(400).json({ok: false, error: 'Unknown plan'});

    const payload = `lureva:${telegram_id}:${plan}:${Date.now()}`;

    const invoiceLink = await telegramApi('createInvoiceLink', {
      title: selected.title,
      description: selected.description,
      payload,
      currency: 'XTR',
      prices: [{label: selected.title, amount: selected.amount}]
    });

    res.json({ok: true, invoice_link: invoiceLink});
  } catch (error) {
    res.status(500).json({ok: false, error: error.message});
  }
});

app.post('/telegram/webhook', async (req, res) => {
  const update = req.body;

  try {
    if (update.pre_checkout_query) {
      await telegramApi('answerPreCheckoutQuery', {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true
      });

      return res.json({ok: true});
    }

    if (update.message && update.message.successful_payment) {
      const payment = update.message.successful_payment;
      const from = update.message.from;
      const payload = payment.invoice_payload || '';
      const parts = payload.split(':');
      const telegramIdFromPayload = parts[1];
      const plan = parts[2];

      activatePro(
        telegramIdFromPayload || from.id,
        plan,
        payment.telegram_payment_charge_id || ''
      );

      await telegramApi('sendMessage', {
        chat_id: from.id,
        text: 'Оплата прошла ✅ PRO-доступ LUREVA FISHING активирован.'
      });

      return res.json({ok: true});
    }

    if (update.message && update.message.text === '/start') {
      await telegramApi('sendMessage', {
        chat_id: update.message.chat.id,
        text: 'LUREVA FISHING готов. Открой приложение через кнопку меню.',
        reply_markup: WEBAPP_URL ? {
          inline_keyboard: [[{text: 'Открыть приложение', web_app: {url: WEBAPP_URL}}]]
        } : undefined
      });
    }

    if (update.message && update.message.text === '/paysupport') {
      await telegramApi('sendMessage', {
        chat_id: update.message.chat.id,
        text: 'Поддержка по оплате: напишите, что произошло, и приложите дату оплаты.'
      });
    }

    res.json({ok: true});
  } catch (error) {
    console.error(error);
    res.json({ok: false});
  }
});

app.listen(PORT, () => {
  console.log(`LUREVA Stars server running on port ${PORT}`);
});
