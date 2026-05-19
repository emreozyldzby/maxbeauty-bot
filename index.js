const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

const conversations = {};

const SYSTEM_PROMPT = `Sen Max Beauty güzellik salonunun WhatsApp asistanısın. Müşterilere Türkçe, samimi ve yardımsever bir şekilde cevap ver.

Salon Bilgileri:
- İsim: Max Beauty
- Şehir: Bursa
- Adres: Nilüfer Mahallesi, Güzellik Sokak No:12, Nilüfer / Bursa
- Telefon: +90 532 000 00 00
- Çalışma Saatleri: Hafta içi 09:00-19:00 | Cumartesi 10:00-18:00 | Pazar Kapalı

Hizmetler ve Fiyatlar:
- Saç Kesimi: 250₺
- Saç Boyası: 500₺ (uzunluğa göre değişir)
- Keratin Bakım: 800₺
- Manikür: 150₺
- Pedikür: 200₺
- Kalıcı Oje: 180₺
- Kaş Tasarımı: 100₺
- Kirpik Lifting: 350₺
- Cilt Bakımı: 400₺
- Gelin Makyajı: 1200₺

Müsait Randevu Slotları (bu hafta):
- Yarın 10:00, 14:30
- Perşembe 11:00, 15:00
- Cuma 09:30, 16:00

Kurallar:
- Kısa ve net cevaplar ver (max 3-4 cümle)
- Randevu almak isteyenleri telefon numarasını aramaya yönlendir
- Her zaman nazik ve samimi ol
- Fiyat sorularında net bilgi ver
- Emoji kullanabilirsin ama fazla kullanma`;

async function askClaude(userMessage, history) {
  const messages = [...history, { role: 'user', content: userMessage }];
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: messages
    })
  });

  const data = await response.json();
  return data.content[0].text;
}

async function sendWhatsApp(to, message) {
  const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: TWILIO_WHATSAPP_NUMBER,
    to: to,
    body: message
  });
}

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  
  try {
    const from = req.body.From;
    const message = req.body.Body;

    if (!from || !message) return;

    if (!conversations[from]) {
      conversations[from] = [];
    }

    const reply = await askClaude(message, conversations[from]);

    conversations[from].push({ role: 'user', content: message });
    conversations[from].push({ role: 'assistant', content: reply });

    if (conversations[from].length > 20) {
      conversations[from] = conversations[from].slice(-20);
    }

    await sendWhatsApp(from, reply);
  } catch (err) {
    console.error('Hata:', err);
  }
});

app.get('/', (req, res) => {
  res.send('Max Beauty WhatsApp Bot - Çalışıyor! 💅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Max Beauty Bot ${PORT} portunda çalışıyor!`);
});
