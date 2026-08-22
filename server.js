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

const SYSTEM_PROMPT = `คุณคือผู้ช่วยตอบคำถามลูกค้าของ GOSEC ทาง LINE Official Account
ตอบเป็นภาษาไทย สุภาพ กระชับ เป็นกันเอง ใช้อีโมจิได้พอประมาณ

ข้อมูลบริษัท (ใช้ตอบคำถามลูกค้าได้เลย ห้ามเดาหรือแต่งข้อมูลนอกเหนือจากนี้):

ชื่อบริษัท: บริษัท โกโซเชียล จำกัด (GOSOCIAL CO.,LTD)
ก่อตั้ง: กันยายน พ.ศ. 2562 ด้วยเงินลงทุน 5 ล้านบาท
ที่อยู่: 69/750 หมู่บ้านวราบดินทร์ ตำบลบึงคำพร้อย อำเภอลำลูกกา จังหวัดปทุมธานี 12150
เบอร์โทร: 096-253-9287
อีเมล: info@gosec.one
เว็บไซต์: www.gosec.one

วิสัยทัศน์: เป็นบริษัทของคนไทยที่จะเป็นผู้นำด้านการพัฒนาแพลตฟอร์มแบบครบวงจร สร้างสังคมดิจิทัลแห่งอนาคตที่ทุกคนสื่อสาร สร้างสรรค์ และเติบโตไปด้วยกัน

ผลิตภัณฑ์หลักของบริษัท:
1. GOSEC by CTMR — แพลตฟอร์มความมั่นคงปลอดภัยไซเบอร์ (Cybersecurity Intelligence Platform) เน้นเฝ้าระวัง ตรวจจับ วิเคราะห์ และตอบสนองต่อภัยคุกคามทางไซเบอร์แบบครบวงจร ด้วยแนวคิด Cyber Threat Monitoring & Response (CTMR) ลูกค้าหลักคือหน่วยงานรัฐ โรงพยาบาล (ปัจจุบันมีลูกค้าใน 12 เขตสุขภาพ กระทรวงสาธารณสุข รวมกว่า 600 แห่ง) และภาคเอกชน
   - เป็นรายแรกที่มีประกันภัยไซเบอร์คุ้มครองความเสียหาย (ร่วมกับทิพยประกันภัย)
   - ผ่านมาตรฐาน ISO/IEC 27001, CSA STAR Level One, PCI DSS, ISO 9001
   - ช่วยองค์กรให้สอดคล้องกับกฎหมาย PDPA, GDPR, HIPAA, NIST
2. GOSPORT — แพลตฟอร์มถ่ายทอดสดกีฬาแบบ Real-Time หน่วงต่ำที่สุด (Zero Delay Experience)
3. GOSOCIAL — แพลตฟอร์ม Social Media & Entertainment ของคนไทย เชื่อมโยงผู้ใช้งาน ครีเอเตอร์ ธุรกิจ และชุมชน
4. KMS — ระบบการเรียนรู้ตลอดชีวิต (Life Long Learning)
5. DTW — ระบบ Smart Home / Smart Health

ค่านิยมองค์กร: Professional (มืออาชีพ), Honesty (ซื่อสัตย์ต่อลูกค้า), Commitment (รักษาสัญญา)

กฎการตอบ:
- ถ้าลูกค้าถามเรื่องที่ไม่มีข้อมูลอยู่ในนี้ (เช่น ราคาแพ็กเกจ, รายละเอียดสัญญา, SLA เฉพาะเจาะจง, นัดหมาย) ให้บอกตรงๆ ว่าต้องให้ทีมงานเป็นคนตอบ พร้อมแนะนำให้ติดต่อทาง info@gosec.one หรือเบอร์ 096-253-9287
- ห้ามเดาตัวเลข ราคา หรือเงื่อนไขที่ไม่มีในข้อมูลนี้เด็ดขาด`;

const app = express();

// เก็บ raw body ไว้ก่อน parse เพื่อใช้เช็ค signature จาก LINE
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
  // ตอบ LINE ทันทีก่อน กัน LINE ส่งซ้ำเพราะรอนาน
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

// คำที่ลูกค้าพิมพ์แล้วให้ส่งการ์ดตัวอย่างทันที (ไม่ผ่าน Claude)
const VIDEO_KEYWORDS = [
  'ตัวอย่าง', 'ตย', 'ตัวอยาง', 'ตัวอยาก',
  'คลิปตัวอย่าง', 'วิดีโอตัวอย่าง', 'วิดีโอ', 'วิดิโอ', 'คลิป',
  'ดูวิดีโอ', 'ขอดูวิดีโอ', 'ขอคลิป', 'มีคลิปไหม', 'มีคลิปให้ดูไหม',
  'sample', 'example',
];

const VIDEO_PAGE_URL =
  'https://htmlpreview.github.io/?https://github.com/norawutnasaree-del/-gosec-preview/blob/main/index.html';

function isAskingForVideo(text) {
  return VIDEO_KEYWORDS.some((kw) => text.includes(kw));
}

// สร้างการ์ด Flex Message สไตล์ดำ-ทอง เหมือนหน้าพรีเมียม
function buildVideoFlexMessage() {
  return {
    type: 'flex',
    altText: 'ตัวอย่างที่คุณขอชม — GOSEC',
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0A0C14',
        paddingAll: '24px',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: 'GOSEC · PRIVATE PREVIEW',
            color: '#B8935A',
            size: 'xs',
            weight: 'bold',
            align: 'center',
          },
          {
            type: 'separator',
            color: '#B8935A55',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'ตัวอย่างที่คุณขอชม',
            color: '#F3EFE6',
            size: 'xl',
            weight: 'bold',
            align: 'center',
            margin: 'lg',
            wrap: true,
          },
          {
            type: 'text',
            text: 'รับชมได้ทันทีในหน้าเดียว\nไม่ต้องดาวน์โหลด ไม่ต้องสมัครสมาชิก',
            color: '#8B8FA0',
            size: 'sm',
            align: 'center',
            wrap: true,
            margin: 'sm',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0A0C14',
        paddingAll: '20px',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#B8935A',
            action: {
              type: 'uri',
              label: 'รับชมวิดีโอ',
              uri: VIDEO_PAGE_URL,
            },
          },
          {
            type: 'text',
            text: 'เอกสิทธิ์เฉพาะลูกค้าที่ติดต่อผ่าน GOSEC',
            color: '#8B8FA0',
            size: 'xxs',
            align: 'center',
            margin: 'md',
          },
        ],
      },
    },
  };
}

async function handleTextMessage(event) {
  const userId = event.source.userId;
  const userMessage = event.message.text;
  const displayName = await getDisplayName(userId);

  await logMessage(userId, displayName, 'user', userMessage);

  if (isAskingForVideo(userMessage)) {
    await replyMessagesToLine(event.replyToken, [buildVideoFlexMessage()]);
    await logMessage(userId, displayName, 'bot', '[ส่งการ์ดตัวอย่างวิดีโอ]');
    return;
  }

  const botReply = await askClaude(userMessage);
  await replyMessagesToLine(event.replyToken, [
    { type: 'text', text: botReply },
  ]);
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

async function replyMessagesToLine(replyToken, messages) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });
}

app.listen(PORT, () => console.log(`gosec-oa-bot listening on port ${PORT}`));
