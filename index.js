onst express = require('express');
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
 
const SYSTEM_PROMPT = `Sen "Yücel Alınca Saç Tasarım" erkek kuaförünün WhatsApp asistanısın. Müşterilere Türkçe, samimi ve kısa cevaplar ver. Maksimum 3-4 cümle.
 
Salon Bilgileri:
- İsim: Yücel Alınca Saç Tasarım
- Adres: Altınşehir, Ahmet Taner Kışlalı Blv., 16120 Nilüfer/Bursa
- Telefon: 0532 689 78 03
- Çalışma Saatleri: Pazartesi-Cumartesi 09:00-23:00 (Pazar kapalı)
 
Hizmetler ve Fiyatlar:
- Saç Kesimi: 900 TL
- Sakal Kesimi: 400 TL
- Saç + Sakal: 1300 TL
- Saç + Sakal + Kaş Alım: 1600 TL
- Saç + Sakal + Ağda: 1500 TL
- Saç Renklendirme: 5000 TL
 
Randevu Bilgisi:
- Randevular sabah 09:00'dan gece 23:00'a kadar yarım saatlik aralıklarla alınabilir.
- Müşteri randevu almak isterse şu linki ver: https://randevu.ac/yucelalincasactasarim
- "Müsait saatler var mı?" diye sorulursa linki ver ve oradan kontrol etmelerini söyle.
 
Kurallar:
- Her zaman nazik ve samimi ol
- Randevu için mutlaka linki yönlendir
- Fiyat sorulduğunda net bilgi ver
- Adres sorulduğunda Google Maps linki de ver: https://maps.google.com/?q=Altınşehir,+Ahmet+Taner+Kışlalı+Blv.,+16120+Nilüfer/Bursa`;
 
const conversations = {};
 
app.get('/', (req, res) => res.send('Yücel Alınca Saç Tasarım - WhatsApp Bot aktif! ✂️'));
 
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const from = req.body.From;
    const userMessage = req.body.Body;
    console.log('Mesaj:', from, '-', userMessage);
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
    console.log('API:', r.status, JSON.stringify(d).substring(0, 200));
 
    let reply = 'Şu an teknik bir sorun var. Lütfen 0532 689 78 03 numaramızı arayın.';
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
    console.log('Cevap gönderildi:', reply.substring(0, 100));
  } catch (e) {
    console.error('Hata:', e.message);
  }
});
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Yücel Alınca Bot ' + PORT + ' portunda!'));
 
