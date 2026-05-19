const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const SYSTEM_PROMPT = `Sen Max Beauty güzellik salonunun WhatsApp asistanısın. Türkçe, kısa ve samimi cevaplar ver. Max 3-4 cümle.

Salon: Max Beauty, Bursa - Nilüfer Mah. Güzellik Sok. No:12
Saat: Hft içi 09-19, Cmt 10-18, Pazar kapalı
Tel: +90 532 000 00 00

Fiyatlar: Saç Kesimi 250TL, Boya 500TL, Keratin 800TL, Manikür 150TL, Pedikür 200TL, Kalıcı Oje 180TL, Kaş 100TL, Kirpik Lifting 350TL, Cilt Bakımı 400TL, Gelin Makyajı 1200TL

Boş randevular: Yarın 10:00, 14:30 - Perşembe 11:00, 15:00 - Cuma 09:30`;

const conversations = {};

app.get('/', (req, res) => res.send('Max Beauty Bot aktif!'));

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const from = req.body.From;
    const userMessage = req.body.Body;
    console.log('Mesaj geldi:', from, '-', userMessage);
    if (!from || !userMessage) return;

    if (!conversations[from]) conversations[from] = [];
    conversations[from].push({ role: 'user', content: userMessage });
    if (conversations[from].length > 20) conversations[from] = conversations[from].slice(-20);

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: conversations[from]
      })
    });

    const d = await r.json();
    console.log('API status:', r.status, 'Yanit:', JSON.stringify(d).substring(0, 200));

    let reply = 'Şu an teknik bir sorun var. Lütfen +90 532 000 00 00 numaramızı arayın.';
    if (d && d.content && d.content[0] && d.content[0].text) {
      reply = d.content[0].text;
    } else if (d && d.error) {
      console.log('API error:', d.error.type, d.error.message);
    }

    conversations[from].push({ role: 'assistant', content: reply });

    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      to: from,
      body: reply
    });
    console.log('Cevap gönderildi');
  } catch (e) {
    console.error('Hata:', e.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Max Beauty Bot ' + PORT + ' portunda!'));
