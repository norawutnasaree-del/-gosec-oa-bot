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
    if (event.type === 'follow') {
      handleFollow(event).catch((err) =>
        console.error('handleFollow error:', err)
      );
    }
  }
});

async function handleFollow(event) {
  const userId = event.source.userId;
  const displayName = await getDisplayName(userId);

  const welcomeText =
    'สวัสดีครับ 👋 นี่คือบัญชีทางการของ GOSEC\n' +
    'ขอบคุณที่เป็นเพื่อนกับเรา 🙏\n\n' +
    'เราคือองค์กรความปลอดภัยทางไซเบอร์ขั้นสูง\n' +
    '"รู้ก่อน ตัดก่อน ปลอดภัยกว่า"';

  await replyMessagesToLine(event.replyToken, [
    { type: 'text', text: welcomeText },
    buildVideoFlexMessage(),
  ]);

  await logMessage(userId, displayName, 'bot', '[ข้อความต้อนรับเพื่อนใหม่ + การ์ดวิดีโอ]');
}

function verifySignature(req) {
  const signature = req.headers['x-line-signature'];
  if (!signature || !req.rawBody) return false;
  const hash = crypto
    .createHmac('sha256', LINE_CHANNEL_SECRET)
    .update(req.rawBody)
    .digest('base64');
  return hash === signature;
}

// ===== วิดีโอตัวอย่าง =====
const VIDEO_KEYWORDS = [
  'ตัวอย่าง', 'ตย', 'ตัวอยาง', 'ตัวอยาก',
  'คลิปตัวอย่าง', 'วิดีโอตัวอย่าง', 'วิดีโอ', 'วิดิโอ', 'คลิป',
  'ดูวิดีโอ', 'ขอดูวิดีโอ', 'ขอคลิป', 'มีคลิปไหม', 'มีคลิปให้ดูไหม',
  'sample', 'example',
];

const VIDEO_PAGE_URL = 'https://norawutnasaree-del.github.io/-gosec-preview/';

function isAskingForVideo(text) {
  return VIDEO_KEYWORDS.some((kw) => text.includes(kw));
}

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

// ===== เลือกเซลล์ =====
const SALES_KEYWORDS = ['เลือกเซลล์', 'ติดต่อฝ่ายขาย', 'ขอเซลล์', 'ขอติดต่อฝ่ายขาย'];

function isAskingForSales(text) {
  return SALES_KEYWORDS.some((kw) => text.includes(kw));
}

function buildSalesFlexMessage() {
  const salesReps = [
    {
      name: 'เสาวลักษณ์ (ขวัญ)',
      lastName: 'ศิริมาวัชรพล',
      imageUrl:
        'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/sales1.jpg.jpg',
      lineUrl: 'https://line.me/ti/p/pXXB6cU4tJ',
    },
    {
      name: 'นางสาวนฤทัย ทนอุป',
      lastName: '(หนุงหนิง)',
      imageUrl:
        'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/sales2.jpg.jpg',
      lineUrl: 'https://line.me/ti/p/4cuhA5-4Py',
    },
  ];

  return {
    type: 'flex',
    altText: 'เลือกเซลล์ที่ต้องการติดต่อ — GOSEC',
    contents: {
      type: 'carousel',
      contents: salesReps.map((rep) => ({
        type: 'bubble',
        size: 'kilo',
        hero: {
          type: 'image',
          url: rep.imageUrl,
          size: 'full',
          aspectRatio: '1:1',
          aspectMode: 'cover',
          action: { type: 'uri', label: 'เพิ่มเพื่อน', uri: rep.lineUrl },
        },
        body: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#0B1F3F',
          paddingAll: '22px',
          spacing: 'none',
          contents: [
            {
              type: 'text',
              text: 'G O S E C   ·   S A L E S',
              color: '#C9A227',
              size: 'xxs',
              weight: 'bold',
              align: 'center',
            },
            {
              type: 'separator',
              color: '#C9A227',
              margin: 'md',
            },
            {
              type: 'text',
              text: rep.name,
              color: '#FFFFFF',
              weight: 'bold',
              size: 'lg',
              align: 'center',
              wrap: true,
              margin: 'lg',
            },
            {
              type: 'text',
              text: rep.lastName,
              color: '#E4C878',
              style: 'italic',
              size: 'sm',
              align: 'center',
              wrap: true,
              margin: 'xs',
            },
            {
              type: 'separator',
              color: '#C9A22740',
              margin: 'lg',
            },
            {
              type: 'text',
              text: 'แตะรูปเพื่อเพิ่มเพื่อน LINE',
              color: '#9FB3D1',
              style: 'italic',
              size: 'xxs',
              align: 'center',
              margin: 'md',
            },
          ],
        },
      })),
    },
  };
}

// ===== สินค้า 6 ตัว =====
const PRODUCT_LIST_KEYWORDS = ['สินค้าเรา', 'มีสินค้า', 'ดูสินค้า', 'สินค้าและบริการ', 'สินค้า'];

function isAskingForProductList(text) {
  return PRODUCT_LIST_KEYWORDS.some((kw) => text.includes(kw));
}

const PRODUCTS = [
  {
    name: 'Gosec by CTMR',
    description: 'กรอบความมั่นคงปลอดภัยไซเบอร์',
    imageUrl:
      'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/1.jpg?v=2',
  },
  {
    name: 'Omnix VCR',
    description: 'ห้องประชุมและบัญชาการออนไลน์',
    imageUrl:
      'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/2.jpg?v=2',
  },
  {
    name: 'Omnix Sync',
    description: 'ระบบรวมฐานข้อมูลของ อบจ.',
    imageUrl:
      'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/3.jpg?v=2',
  },
  {
    name: 'Omnix Sentra',
    description: 'ระบบรวมกล้องวงจรปิดและ AI CCTV',
    imageUrl:
      'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/4.jpg?v=2',
  },
  {
    name: 'Omnix Stream',
    description: 'ระบบถ่ายทอดสด และสื่อสารสาธารณะ',
    imageUrl:
      'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/5.jpg?v=2',
  },
  {
    name: 'Omnix Wireless Lastmile',
    description: 'เครือข่ายวงจรปิดถึงบ้านผู้ป่วย',
    imageUrl:
      'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/6.jpg?v=2',
  },
];

// การ์ด Carousel รูปสินค้าล้วนๆ (ไม่มีข้อความทับ) กดรูปแล้วบอทตอบรายละเอียดสินค้านั้น
function buildProductsFlexMessage() {
  return {
    type: 'flex',
    altText: 'สินค้าและบริการของ GOSEC',
    contents: {
      type: 'carousel',
      contents: PRODUCTS.map((p) => ({
        type: 'bubble',
        size: 'kilo',
        hero: {
          type: 'image',
          url: p.imageUrl,
          size: 'full',
          aspectRatio: '1:1',
          aspectMode: 'cover',
          action: {
            type: 'message',
            label: p.name,
            text: `สนใจสินค้า ${p.name}`,
          },
        },
      })),
    },
  };
}

// เช็คว่าลูกค้ากดสินค้าตัวไหน แล้วคืนคำตอบเฉพาะสินค้านั้น
function findProductReply(text) {
  const product = PRODUCTS.find((p) => text === `สนใจสินค้า ${p.name}`);
  if (!product) return null;

  return (
    `หากสนใจสินค้า ${product.name} นี้ มันคือ${product.description}\n\n` +
    `หากต้องการทราบรายละเอียดเพิ่มเติมติดต่อสอบถามได้ที่ 096-253-9287 หรือ info@gosec.one ครับ`
  );
}

async function handleTextMessage(event) {
  const userId = event.source.userId;
  const userMessage = event.message.text;
  const displayName = await getDisplayName(userId);

  await logMessage(userId, displayName, 'user', userMessage);

  // 1) ลูกค้ากดรูปสินค้าตัวใดตัวหนึ่ง (ต้องเช็คก่อนตัวอื่น เพราะข้อความมีคำว่า "สินค้า" ปนอยู่)
  const productReply = findProductReply(userMessage);
  if (productReply) {
    await replyMessagesToLine(event.replyToken, [
      { type: 'text', text: productReply },
    ]);
    await logMessage(userId, displayName, 'bot', productReply);
    return;
  }

  // 2) ขอดูวิดีโอตัวอย่าง
  if (isAskingForVideo(userMessage)) {
    await replyMessagesToLine(event.replyToken, [buildVideoFlexMessage()]);
    await logMessage(userId, displayName, 'bot', '[ส่งการ์ดตัวอย่างวิดีโอ]');
    return;
  }

  // 3) ขอเลือกเซลล์
  if (isAskingForSales(userMessage)) {
    await replyMessagesToLine(event.replyToken, [buildSalesFlexMessage()]);
    await logMessage(userId, displayName, 'bot', '[ส่งการ์ดเลือกเซลล์]');
    return;
  }

  // 4) ขอดูรายการสินค้าทั้งหมด
  if (isAskingForProductList(userMessage)) {
    await replyMessagesToLine(event.replyToken, [buildProductsFlexMessage()]);
    await logMessage(userId, displayName, 'bot', '[ส่งการ์ดรายการสินค้า]');
    return;
  }

  // 5) คำถามทั่วไป ให้ Claude ตอบ
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

// เรียก URL นี้ครั้งเดียวหลัง deploy เพื่อสร้าง+ตั้งค่า Rich Menu อัตโนมัติ (6 ปุ่ม)
app.get('/setup-richmenu', async (req, res) => {
  try {
    const websiteUrl = process.env.WEBSITE_URL || 'https://www.gosec.one';
    const imageUrl =
      'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/richmenu6.png';

    const colW = Math.floor(2500 / 3); // 833
    const rowH = 843;

    const areas = [
      // แถวบน (สีน้ำเงิน)
      {
        bounds: { x: 0, y: 0, width: colW, height: rowH },
        action: { type: 'uri', label: 'เว็บไซต์', uri: websiteUrl },
      },
      {
        bounds: { x: colW, y: 0, width: colW, height: rowH },
        action: { type: 'message', label: 'ข่าวสาร', text: 'มีข่าวสารอะไรใหม่บ้างครับ' },
      },
      {
        bounds: { x: colW * 2, y: 0, width: 2500 - colW * 2, height: rowH },
        action: { type: 'message', label: 'สินค้าเรา', text: 'มีสินค้าและบริการอะไรบ้างครับ' },
      },
      // แถวล่าง (สีขาว)
      {
        bounds: { x: 0, y: rowH, width: colW, height: rowH },
        action: { type: 'message', label: 'ติดต่อฝ่ายขาย', text: 'ขอติดต่อฝ่ายขายครับ' },
      },
      {
        bounds: { x: colW, y: rowH, width: colW, height: rowH },
        action: { type: 'message', label: 'Q&A', text: 'มีคำถามอยากสอบถามครับ' },
      },
      {
        bounds: { x: colW * 2, y: rowH, width: 2500 - colW * 2, height: rowH },
        action: { type: 'message', label: 'ติดต่อเรา', text: 'ขอเบอร์ติดต่อและที่อยู่บริษัทครับ' },
      },
    ];

    // 1) สร้าง Rich Menu
    const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        size: { width: 2500, height: 1686 },
        selected: true,
        name: 'GOSEC main menu (6 buttons)',
        chatBarText: 'เมนู',
        areas,
      }),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      return res.status(500).json({ step: 'create', error: created });
    }
    const richMenuId = created.richMenuId;

    // 2) อัปโหลดภาพ
    const imageRes = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const uploadRes = await fetch(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png',
          Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: imageBuffer,
      }
    );
    if (!uploadRes.ok) {
      return res
        .status(500)
        .json({ step: 'upload', error: await uploadRes.text() });
    }

    // 3) ตั้งเป็นเมนูเริ่มต้นให้ทุกคน
    const defaultRes = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
      }
    );
    if (!defaultRes.ok) {
      return res
        .status(500)
        .json({ step: 'set-default', error: await defaultRes.text() });
    }

    res.json({ success: true, richMenuId, websiteUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เรียก URL นี้ครั้งเดียว เพื่อยกเลิก Rich Menu จากโค้ด ให้กลับไปใช้ตัวที่ตั้งไว้ใน OA Manager แทน
app.get('/unset-richmenu', async (req, res) => {
  try {
    const result = await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    });
    if (!result.ok) {
      return res.status(500).json({ error: await result.text() });
    }
    res.json({ success: true, message: 'ยกเลิก Rich Menu จากโค้ดแล้ว ตอนนี้จะใช้ตัวจาก OA Manager แทน' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`gosec-oa-bot listening on port ${PORT}`));
