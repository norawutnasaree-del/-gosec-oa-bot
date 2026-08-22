const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const {
  LINE_CHANNEL_ACCESS_TOKEN,
  LINE_CHANNEL_SECRET,
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  ANTHROPIC_API_KEY,
  PORT = 3000,
} = process.env;

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const SYSTEM_PROMPT = `คุณคือผู้ช่วยตอบคำถามลูกค้าของ GOSEC (แบรนด์ด้าน cybersecurity ภายใต้ GOSOCIAL Co.,Ltd)
ตอบเป็นภาษาไทย สุภาพ กระชับ เป็นกันเอง
ถ้าลูกค้าถามเรื่องที่ไม่แน่ใจ หรือต้องการรายละเอียดราคา/สัญญา ให้แนะนำให้ติดต่อทีมงานโดยตรงแทนการเดาคำตอบ`;

const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get('/', (req, res) => {
  res.send('gosec-oa-bot is running');
});

app.post('/webhook', async (req, res) => {
  res.status(200).end();

  if (!verifySignature(req)) {
    console.error('Invalid LINE signature — request ignored');
    return;
  }

  const events = req.body.events || [];
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      handleTextMessage(event).catch((err) =>
        console.error('handleTextMessage error:', err)
      );
    }
  }
});

function verifySignature(req) {
  const signature = req.headers['x-line-signature'];
  if (!signature || !req.rawBody) return false;
  const hash = crypto
    .createHmac('sha256', LINE_CHANNEL_SECRET)
    .update(req.rawBody)
    .digest('base64');
  return hash === signature;
}

async function handleTextMessage(event) {
  const userId = event.source.userId;
  const userMessage = event.message.text;
  const displayName = await getDisplayName(userId);

  await logMessage(userId, displayName, 'user', userMessage);

  const botReply = await askClaude(userMessage);

  await replyToLine(event.replyToken, botReply);
  await logMessage(userId, displayName, 'bot', botReply);
}

async function getDisplayName(userId) {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.displayName || null;
  } catch (err) {
    console.error('getDisplayName error:', err);
    return null;
  }
}

async function logMessage(lineUserId, displayName, role, message) {
  const { error } = await supabase.from('conversations').insert({
    line_user_id: lineUserId,
    display_name: displayName,
    role,
    message,
  });
  if (error) console.error('Supabase insert error:', error);
}

async function askClaude(userMessage) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      console.error('Anthropic API error:', await res.text());
      return 'ขออภัยครับ ตอนนี้ระบบขัดข้องชั่วคราว รบกวนลองใหม่อีกครั้งครับ';
    }

    const data = await res.json();
    return (
      data.content?.[0]?.text ||
      'ขออภัยครับ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้'
    );
  } catch (err) {
    console.error('askClaude error:', err);
    return 'ขออภัยครับ ตอนนี้ระบบขัดข้องชั่วคราว รบกวนลองใหม่อีกครั้งครับ';
  }
}

async function replyToLine(replyToken, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  });
}

app.listen(PORT, () => console.log(`gosec-oa-bot listening on port ${PORT}`));
