require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");
const { COMPANY_DATA } = require("./companyData");

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const AUDIO_DIR = path.join(__dirname, "audio");
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR);
app.use("/audio", express.static(AUDIO_DIR));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = "คุณคือเอเจนต์ AI ประจำสายลูกค้าของ GOSEC by CTMR " +
  "(แพลตฟอร์มความมั่นคงปลอดภัยไซเบอร์ ภายใต้บริษัท GOSOCIAL) ทำหน้าที่รับสายและตอบคำถามลูกค้า " +
  "ที่โทรเข้ามาสอบถามเกี่ยวกับ GOSEC เป็นหลัก เช่น ระบบทำงานอย่างไร ปลอดภัยแค่ไหน " +
  "ประกันภัยไซเบอร์คุ้มครองอะไรบ้าง " +
  "น้ำเสียง: สุภาพ เป็นมิตร กระชับ เหมาะกับการคุยทางโทรศัพท์ " +
  "สำคัญมาก: ตอบให้กระชับที่สุดเท่าที่จะทำได้ ไม่เกิน 3-4 ประโยคต่อคำตอบ " +
  "เพราะพื้นที่คำตอบมีจำกัดและต้องพูดให้จบประโยคเสมอ ห้ามเริ่มพูดประเด็นใหม่ถ้าจะพูดไม่จบ " +
  "ให้เลือกพูดแค่ประเด็นที่สำคัญที่สุดก่อน แล้วถามลูกค้าว่าอยากรู้เพิ่มเรื่องไหนต่อ แทนที่จะพยายามอธิบายทุกอย่างในคำตอบเดียว " +
  "ตอบตามข้อมูลบริษัทด้านล่างเท่านั้น ถ้าไม่มีข้อมูล (เช่น ราคา เงื่อนไขที่ไม่ระบุ) " +
  "ให้บอกลูกค้าตรงๆ ว่าจะให้เจ้าหน้าที่ติดต่อกลับ อย่าเดาตัวเลขขึ้นมาเอง " +
  "ถ้าลูกค้าถามภาษาอื่นที่ไม่ใช่ไทย ให้ตอบเป็นภาษานั้นกลับด้วย " +
  "สำคัญมาก: ห้ามใช้เครื่องหมายมาร์กดาวน์เด็ดขาด เช่น ** หรือ # หรือ - หรือ emoji ใดๆ " +
  "เพราะคำตอบนี้จะถูกอ่านออกเสียงให้ลูกค้าฟังทางโทรศัพท์ ให้ตอบเป็นประโยคพูดปกติเท่านั้น\n\nข้อมูลบริษัท:\n" + COMPANY_DATA;

const conversations = {};

function cleanTextForSpeech(text) {
  return text
    .replace(/info@gosec\.one/gi, "อินโฟ แอท โกเซค ดอท วัน")
    .replace(/GOSOCIAL/gi, "โกโซเซี่ยล")
    .replace(/GOSEC/gi, "โกเซค")
    .replace(/CTMR/gi, "ซี ที เอ็ม อาร์")
    .replace(/(\d)-(\d)/g, "$1$2")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/^-\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

async function synthesizeSpeech(text) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "th-TH", name: "th-TH-Standard-A" },
        audioConfig: { audioEncoding: "MP3" },
      }),
    }
  );
  const data = await response.json();
  if (!data.audioContent) {
    console.error("TTS error:", data);
    return null;
  }
  return data.audioContent;
}

async function saveAudioFile(base64Audio) {
  const id = crypto.randomUUID();
  const filePath = path.join(AUDIO_DIR, `${id}.mp3`);
  fs.writeFileSync(filePath, Buffer.from(base64Audio, "base64"));
  return `${id}.mp3`;
}

async function generateReply(sessionId, message) {
  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
  }
  const history = conversations[sessionId];
  history.push({ role: "user", content: message });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: history,
  });
  const replyText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  history.push({ role: "assistant", content: replyText });
  return replyText;
}

// ===== Text chat (ใช้กับหน้าเว็บทดสอบ public/index.html) =====
app.post("/chat", async (req, res) => {
  try {
    const { sessionId = "default", message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "กรุณาส่งข้อความ (message) มาด้วย" });
    }
    const replyText = await generateReply(sessionId, message);
    const audioContent = await synthesizeSpeech(cleanTextForSpeech(replyText));
    res.json({ reply: replyText, audio: audioContent });
  } catch (err) {
    console.error("Error in /chat:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
  }
});

// ===== สายโทรเข้าครั้งแรก (ใช้ตอนต่อ Twilio ทีหลัง) =====
app.post("/voice", async (req, res) => {
  try {
    const greeting = "สวัสดีค่ะ ยินดีต้อนรับสู่โกเซค บาย ซี ที เอ็ม อาร์ มีอะไรให้ช่วยไหมคะ";
    const audioContent = await synthesizeSpeech(greeting);
    const fileName = await saveAudioFile(audioContent);
    const audioUrl = `${req.protocol}://${req.get("host")}/audio/${fileName}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" language="th-TH" speechTimeout="auto" action="/voice-gather" method="POST">
  </Gather>
  <Say language="th-TH">ขออภัยค่ะ ไม่ได้ยินเสียง กรุณาโทรเข้ามาใหม่อีกครั้ง</Say>
</Response>`;
    res.type("text/xml").send(twiml);
  } catch (err) {
    console.error("Error in /voice:", err);
    res.type("text/xml").send(`<Response><Say language="th-TH">ขออภัยค่ะ ระบบขัดข้อง</Say></Response>`);
  }
});

// ===== รับคำพูดที่ลูกค้าพูด (ใช้ตอนต่อ Twilio ทีหลัง) =====
app.post("/voice-gather", async (req, res) => {
  try {
    const sessionId = req.body.CallSid || "default";
    const speechText = req.body.SpeechResult;

    if (!speechText) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="th-TH">ขออภัยค่ะ ไม่ได้ยินเสียง กรุณาลองพูดใหม่อีกครั้ง</Say>
  <Gather input="speech" language="th-TH" speechTimeout="auto" action="/voice-gather" method="POST"></Gather>
</Response>`;
      return res.type("text/xml").send(twiml);
    }

    const replyText = await generateReply(sessionId, speechText);
    const audioContent = await synthesizeSpeech(cleanTextForSpeech(replyText));
    const fileName = await saveAudioFile(audioContent);
    const audioUrl = `${req.protocol}://${req.get("host")}/audio/${fileName}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" language="th-TH" speechTimeout="auto" action="/voice-gather" method="POST"></Gather>
</Response>`;
    res.type("text/xml").send(twiml);
  } catch (err) {
    console.error("Error in /voice-gather:", err);
    res.type("text/xml").send(`<Response><Say language="th-TH">ขออภัยค่ะ ระบบขัดข้อง</Say></Response>`);
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("GOSOCIAL Call Bot server กำลังรันที่ http://localhost:" + PORT);
});
