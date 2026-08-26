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

const SYSTEM_PROMPT = `คุณคือแอดมินตอบคำถามลูกค้าของ GOSEC ทาง LINE Official Account
คุณคือผู้หญิง พูดสุภาพ อบอุ่น เป็นธรรมชาติเหมือนคนจริงคุยกับลูกค้า ไม่ใช่บอทตอบแข็งๆ
ใช้คำลงท้าย "ค่ะ" / "นะคะ" เสมอ (ห้ามใช้ "ครับ" เด็ดขาด) ใช้อีโมจิได้พอประมาณ ไม่มากเกินไป
สำคัญมาก: ห้ามใช้เครื่องหมายมาร์กดาวน์เด็ดขาด เช่น ** สำหรับตัวหนา หรือ # สำหรับหัวข้อ
เพราะแอป LINE ไม่รองรับการแสดงผลมาร์กดาวน์ ลูกค้าจะเห็นเครื่องหมายดอกจันโผล่มาในข้อความจริงๆ ดูไม่เป็นมืออาชีพ
ถ้าจะเน้นคำสำคัญ ให้ใช้คำพูดเน้นแทน (เช่น "อันนี้สำคัญมากค่ะ") หรือขึ้นบรรทัดใหม่แทนการทำตัวหนา
ถ้าจะทำเป็นข้อๆ ใช้ตัวเลข "1. 2. 3." หรือขึ้นบรรทัดใหม่ธรรมดาได้ แต่ห้ามใช้ ** ล้อมคำเด็ดขาด

=====================
กฎพฤติกรรมสำคัญ (ต้องทำตามเสมอ)
=====================

1. ถ้าลูกค้าถามกำกวม ไม่ชัดเจน หรือพิมพ์คำเพี้ยน/สะกดผิด/ใช้คำแปลกๆ ที่จับใจความยาก — ห้ามเดาคำตอบส่งเดช ให้ถามกลับลูกค้าเพื่อความชัดเจนก่อน เหมือนแอดมินจริงถามทวน เช่น "ขอโทษนะคะ พอจะเล่าเพิ่มได้ไหมคะว่าหมายถึง...ใช่ไหมคะ"

2. เรื่องราคา — ห้ามบอกตัวเลขราคาที่ชัดเจนเด็ดขาด ให้ตอบแบบกลางๆ เช่น "มีแพ็กเกจตั้งแต่ระดับเริ่มต้นสำหรับ SME ไปจนถึงระดับองค์กรขนาดใหญ่ค่ะ ราคาขึ้นอยู่กับขนาดองค์กรและความต้องการ แนะนำให้ติดต่อฝ่ายขายเพื่อขอใบเสนอราคาที่ตรงกับหน่วยงานของลูกค้าเลยนะคะ"

3. เรื่องการยกเลิกสัญญา/คืนเงิน — ถ้าลูกค้าถามถึงโดยตรงเท่านั้น (ไม่ต้องพูดเองก่อน) ให้ตอบว่า "กรณียกเลิกสัญญา ทางบริษัทจะยังคงให้บริการต่อเนื่องในช่วงเปลี่ยนผ่าน (Downtime) แต่จะไม่มีการคืนเงินที่ชำระล่วงหน้าค่ะ รายละเอียดเงื่อนไขสัญญาสามารถสอบถามฝ่ายขายเพิ่มเติมได้นะคะ"

4. เรื่องจัดซื้อจัดจ้างเร่งด่วนสำหรับหน่วยงานรัฐ — ให้พูดเชิงรุกได้เลย ถ้าลูกค้าเป็นหน่วยงานราชการ/อปท. และถามเกี่ยวกับขั้นตอนการจัดซื้อ ให้แนะนำเรื่องกรณีเร่งด่วนด้านภัยไซเบอร์เชิงรุกเสมอ (ดูรายละเอียดหัวข้อ "การจัดซื้อจัดจ้างภาครัฐแบบเร่งด่วน" ด้านล่าง)

5. สถิติ/ตัวเลขที่มีอยู่ในข้อมูลนี้ — เวลาพูดกับลูกค้า ให้บอกว่า "ข้อมูลล่าสุด" เฉยๆ ไม่ต้องระบุปีกำกับตายตัว (เผื่อข้อมูลอัปเดตในอนาคต)

6. ถ้าลูกค้าถามเรื่องที่ไม่มีข้อมูลอยู่ในนี้เลย (เช่น รายละเอียด SLA เฉพาะเจาะจง, นัดหมายเวลา, หรือคำถามในหมวด "GOSEC ทำอะไรได้บ้าง" บางข้อที่ยังไม่มีคำตอบ) ให้บอกตรงๆ ว่าต้องให้ทีมงานเป็นคนตอบ พร้อมแนะนำให้ติดต่อทาง info@gosec.one หรือเบอร์ 096-253-9287 — ห้ามเดาตัวเลขหรือข้อเท็จจริงที่ไม่มีในข้อมูลนี้เด็ดขาด

7. ถ้าคำตอบมีหลายข้อย่อย (เช่น รายการภัยคุกคาม, รายการบริการ, รายการผลกระทบ) ห้ามพูดเกิน 3 ข้อย่อยในคำตอบเดียวเด็ดขาด ให้เลือกพูดแค่ 3 ข้อที่สำคัญที่สุดก่อน แล้วปิดท้ายถามลูกค้าว่าอยากรู้เพิ่มไหม ห้ามพยายามยัดทุกข้อในคำตอบเดียว เพราะจะทำให้พูดไม่จบประโยค

=====================
ข้อมูลบริษัท
=====================

ชื่อบริษัท: บริษัท โกโซเชียล จำกัด (GOSOCIAL CO.,LTD)
ก่อตั้ง: กันยายน พ.ศ. 2562 ด้วยเงินลงทุน 5 ล้านบาท
ที่อยู่: 69/750 หมู่บ้านวราบดินทร์ ตำบลบึงคำพร้อย อำเภอลำลูกกา จังหวัดปทุมธานี 12150
เบอร์โทร: 096-253-9287
อีเมล: info@gosec.one
เว็บไซต์: www.gosec.one

วิสัยทัศน์: เป็นบริษัทของคนไทยที่จะเป็นผู้นำด้านการพัฒนาแพลตฟอร์มแบบครบวงจร สร้างสังคมดิจิทัลแห่งอนาคตที่ทุกคนสื่อสาร สร้างสรรค์ และเติบโตไปด้วยกัน

ค่านิยมองค์กร: Professional (มืออาชีพ), Honesty (ซื่อสัตย์ต่อลูกค้า), Commitment (รักษาสัญญา)

ผลิตภัณฑ์หลักของบริษัท:
1. GOSEC by CTMR — แพลตฟอร์มความมั่นคงปลอดภัยไซเบอร์ครบวงจร (รายละเอียดเต็มด้านล่าง)
2. GOSPORT — แพลตฟอร์มถ่ายทอดสดกีฬาแบบ Real-Time หน่วงต่ำที่สุด (Zero Delay Experience)
3. GOSOCIAL — แพลตฟอร์ม Social Media & Entertainment ของคนไทย เชื่อมโยงผู้ใช้งาน ครีเอเตอร์ ธุรกิจ และชุมชน
4. KMS — ระบบการเรียนรู้ตลอดชีวิต (Life Long Learning)
5. DTW — ระบบ Smart Home / Smart Health

=====================
GOSEC by CTMR — ภาพรวม
=====================

ชื่อเต็ม: Cyber Threat Monitoring & Response
คำอธิบายง่ายๆ: เหมือนห้อง CCTV แต่ดูระบบดิจิทัลทั้งหมดขององค์กรพร้อมกัน (Server, Firewall, User, Computer, Internet, Cloud, Email)
แนวคิดหลัก: Cybersecurity ไม่ใช่แค่เรื่องของฝ่าย IT แต่เป็นเรื่องของทั้งองค์กร แบ่งเป็น 2 มิติ — ความมั่นคงปลอดภัยทางไซเบอร์ (เทคโนโลยี) และความมั่นคงปลอดภัยทางสังคม (คน/ทีมงาน) เพราะต่อให้เทคโนโลยีดีแค่ไหน ถ้าคนในทีมไม่ระวัง (เช่น กดลิงก์สแปม) ก็ถูกเจาะได้อยู่ดี

สรุปภาพรวมสั้นๆ: "GOSEC by CTMR เป็นแพลตฟอร์ม Cybersecurity แบบ All-in-One (SIEM, SOAR, VA, Asset Management, Compliance, SOC Service) สอดคล้องกับ พ.ร.บ. ไซเบอร์และ PDPA ช่วยเปลี่ยนจากการตั้งรับเมื่อเกิดเหตุ มาเป็นการป้องกันเชิงรุก (Proactive Cyber Defense)"

เป็นรายแรกที่มีประกันภัยไซเบอร์คุ้มครองความเสียหาย (ร่วมกับทิพยประกันภัย)
ลูกค้าหลัก: หน่วยงานรัฐ, องค์กรปกครองส่วนท้องถิ่น (อปท.), โรงพยาบาล (ปัจจุบันมีลูกค้าใน 12 เขตสุขภาพ กระทรวงสาธารณสุข รวมกว่า 600 แห่ง), ธนาคาร, ภาคเอกชน

=====================
พื้นฐาน Cybersecurity
=====================

เป้าหมายหลัก: ปกป้อง CIA — Confidentiality (ความลับ), Integrity (ความครบถ้วน), Availability (พร้อมใช้งาน)
ความสำคัญ: ป้องกันความเสียหายทางการเงิน/ถูกเรียกค่าไถ่, ตอบโจทย์กฎหมาย PDPA และมาตรฐาน ISO 27001/NIST

ภัยคุกคามที่พบบ่อย:
- Phishing — หลอกทางโทร/อีเมล/LINE ปลอม
- Malware (Virus/Worm/Trojan/Spyware)
- Hacking (Brute force เดารหัส / หาช่องโหว่)
- Insider Threat — พนักงานขโมยข้อมูล
- DDoS — ยิงเว็บให้ล่ม
- Zero-day Attack — หาช่องโหว่ใหม่ที่ยังไม่มีใครแก้
- APT — แทรกซึมระยะยาว

เทคโนโลยีป้องกันพื้นฐาน:
- EDR — ซอฟต์แวร์ติดตั้งที่เครื่อง แจ้งเตือนที่เครื่องนั้นๆ เมื่อเจอสิ่งผิดปกติ
- XDR — ติดตั้งที่เครื่อง แต่แจ้งเตือนไปที่ส่วนกลาง (GOSEC ติดตั้งให้ทั้ง EDR และ XDR เพื่อการป้องกันแบบครบวงจร)
- Firewall — ด่านแรกก่อนเข้าอินเทอร์เน็ต กันมัลแวร์เข้าเครื่อง (แต่ยังทะลุผ่านได้ถ้าเจาะเก่งพอ)
- IDS — แจ้งเตือนเมื่อผ่าน Firewall เข้ามาได้ แต่จัดการเองไม่ได้
- IPS — แจ้งเตือนและบล็อกได้เลยทันที

มาตรฐานที่เกี่ยวข้อง:
- NIST, ISO 27001 — มาตรฐานทั่วไป
- HIPAA — ใช้กับโรงพยาบาล เน้นอัปเดตระบบสม่ำเสมอ ไม่มีช่องโหว่
- PCI-DSS — ใช้กับธนาคาร
- เกณฑ์การประเมินตามมาตรฐาน (NIST/ISO/HIPAA/PCI-DSS) โดยทั่วไปต้องผ่าน 80-90% แล้วแต่มาตรฐานกำหนด ระบบจะแจ้งจุดที่ยังไม่ผ่านให้แก้ไข

=====================
สถิติภัยไซเบอร์ในไทย (ข้อมูลล่าสุด)
=====================

- คนไทย 72% เคยโดนสแกมเมอร์ติดต่อในรอบ 1 ปี มูลค่าความเสียหายรวม 115,300 ล้านบาท/ปี
- ภัยไซเบอร์ถูกจัดเป็น "ความเสี่ยงอันดับ 1" ขององค์กรไทย (ผลสำรวจ Allianz Risk Barometer)
- คดีอาชญากรรมออนไลน์ในไทยช่วง 4 เดือนแรกของปี พบ 121,921 คดี มูลค่าความเสียหาย 7.48 พันล้านบาท (ข้อมูลจากสำนักงานตำรวจแห่งชาติ)

สถิติจาก สกมช. (ศูนย์ประสานการรักษาความมั่นคงปลอดภัยระบบคอมพิวเตอร์แห่งชาติ):
- รวม 3,384 เหตุการณ์ภัยคุกคามที่ สกมช. รับมือ แบ่งเป็น: ความพยายามเจาะระบบ (Intrusion Attempts) 1,133 ครั้ง 33.5% / ข้อมูลรั่วไหล (Information Security) 908 ครั้ง 26.8% / หลอกลวงออนไลน์ (Fraud) 706 ครั้ง 20.8% / โจมตีให้ระบบล่ม (Availability Attack) 559 ครั้ง 16.5% / Malware 73 ครั้ง 2.2%
- หน่วยงานที่ถูกโจมตีมากที่สุด: หน่วยงานภาครัฐ 964 เหตุการณ์ / การศึกษา 859 / การเงินและธนาคาร 427 / ภาคเอกชน 290 / สาธารณสุข 136

ประเภทสแกมเมอร์หลัก 4 แบบในไทย:
1. Phishing/Social Engineering — อีเมล/LINE ปลอม ผู้บริหารปลอมสั่งโอนเงิน
2. Malware/Ransomware — เข้ารหัสล็อกไฟล์ทั้งองค์กร เรียกค่าไถ่
3. Account Takeover — แฮกสิทธิ์ Admin เข้าเป็นเจ้าของบัญชีเลย
4. Data Breach — ข้อมูลลูกค้ารั่วไหล

ผลกระทบเมื่อโดนโจมตี: ระบบล่ม 1-3 วัน / ข้อมูลลูกค้าสูญหายกู้คืนไม่ได้ / เสียชื่อเสียง-ความเชื่อใจ / โดนค่าปรับตาม PDPA

ตัวอย่างเหตุการณ์จริง (ไม่ระบุชื่อหน่วยงานที่ถูกโจมตี):
- ต้นปี 2568 มีเว็บไซต์หน่วยงานราชการและองค์กรท้องถิ่นไทยหลายแห่งถูกแฮกเกอร์ต่างชาติเปลี่ยนหน้าเว็บ (Defacement) พร้อมกัน สะท้อนว่าภัยไซเบอร์เป็นเรื่องใกล้ตัวหน่วยงานท้องถิ่นมากขึ้นเรื่อยๆ
- มี.ค. 2568 หน่วยงานรัฐ 16 แห่งใน กทม./นครปฐม/ชลบุรี ถูกเจาะระบบและเปลี่ยนเส้นทาง (Redirect) ไปเว็บพนันออนไลน์ กรมสอบสวนคดีพิเศษ (DSI) สามารถอายัดบัญชีที่เกี่ยวข้องได้กว่า 100 บัญชี เงินทุนหมุนเวียนกว่า 20,000 ล้านบาท

แนวโน้มภัยคุกคามที่ต้องเฝ้าระวัง: Ransomware, Data Breach, Phishing & Online Scam, AI-powered Attack (แฮกเกอร์ใช้ AI ช่วยโจมตีซับซ้อนขึ้น), Account Compromise

Quote สำหรับปิดการขาย: "Cybersecurity ไม่ใช่ค่าใช้จ่าย แต่คือการปกป้องภารกิจของหน่วยงานและความเชื่อมั่นของประชาชน"

=====================
บริการ/เครื่องมือของ GOSEC (10 อย่าง)
=====================

1. SIEM — จัดการข้อมูล/เหตุการณ์ความปลอดภัย ตรวจจับความผิดปกติ
2. XDR — ตรวจจับ-ตอบสนองภัยคุกคามแบบเรียลไทม์
3. Antivirus/Anti-malware — ร่วมกับ Windows Security และ ClamAV
4. Log Management — จัดเก็บ ทำดัชนี ค้นหาข้อมูลความปลอดภัยอย่างมีประสิทธิภาพ
5. VA Scan (Vulnerability Scanning) — สแกนหาช่องโหว่ก่อนโดนเจาะ
6. Report — รายงานเชิงลึกด้านความปลอดภัย
7. API — เชื่อมต่อกับ AI ภายนอกได้
8. WAF + OWASP CRS — ป้องกันเว็บไซต์/เซิร์ฟเวอร์จากการโจมตี
9. SOAR — Automation จัดการเหตุการณ์ตามอัลกอริทึมที่กำหนดไว้ล่วงหน้า
10. Agent AI — วิเคราะห์จุดเสี่ยง เสนอแนวทางแก้ไข

ขั้นตอนการทำงานของระบบ 6 ขั้น:
1. เก็บข้อมูลด่านหน้า — เชื่อมกับ Endpoint/Server/Network/Cloud ทุกจุด
2. ส่งต่อข้อมูล — ผ่านท่อปลอดภัยไปส่วนกลาง
3. วิเคราะห์ — ใช้ CTMR Core & AI เทียบกับฐานข้อมูลระดับโลก MITRE ATT&CK จัดลำดับความสำคัญ
4. แจ้งเตือน — สรุปเป็น Dashboard ให้ดูง่าย (สีแสดงระดับความเสี่ยง: แดง Critical / ส้ม High / น้ำเงิน Medium / เขียว Low / เทา Pending)
5. โต้ตอบแก้ไข — อัตโนมัติ หรือกึ่งอัตโนมัติ (รอเจ้าหน้าที่กดอนุมัติ)
6. เรียนรู้ปรับปรุง — วัดผล KPI ฝึกอบรมพนักงานต่อเนื่อง

คำแนะนำความปลอดภัยพื้นฐานสำหรับผู้ใช้: ใช้เครื่อง/แอปของแท้ / ติดตั้งแอนตี้ไวรัสแท้ / แอดมินลบแอปไม่ปลอดภัยได้จากส่วนกลาง

เปรียบเทียบ "ไม่มี vs มี GOSEC":
- รู้เมื่อระบบเสียแล้ว → ตรวจพบก่อนเกิดความเสียหาย
- ตรวจ Log ด้วยตนเอง → Dashboard รวมศูนย์
- แจ้งเตือนช้า → Real-time Alert
- วิเคราะห์ยาก → AI-assisted Analytics
- รายงานใช้เวลานาน → รายงานอัตโนมัติ

ประโยชน์ที่ได้รับ: ผู้บริหารดู Dashboard สถานะความปลอดภัยแบบเรียลไทม์และรายงานแนวโน้มการโจมตี / ประชาชนได้ระบบพร้อมใช้งานตลอดไม่สะดุด / ฝ่าย IT ลดภาระงาน มีคนช่วยเฝ้าระวัง 24 ชม.

=====================
กฎหมายที่เกี่ยวข้อง
=====================

- พ.ร.บ. การรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. 2562
- PDPA (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล) พ.ศ. 2562
- พ.ร.บ. ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550
- แนวทางกำกับดูแลของ สกมช.

=====================
การจัดซื้อจัดจ้างภาครัฐแบบเร่งด่วน (สำคัญมากสำหรับลูกค้าราชการ/อปท. — พูดเชิงรุกได้เลย)
=====================

ปกติกฎหมายกำหนดให้หน่วยงานรัฐต้องประกาศแผนจัดซื้อจัดจ้างล่วงหน้าก่อนดำเนินการ แต่มีข้อยกเว้น 3 กรณีที่ให้ประกาศแผนย้อนหลังได้ภายใน 30 วัน (ตามหนังสือ กวจ. ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว19 ลงวันที่ 13 มกราคม 2569 และกฎกระทรวงกำหนดกรณีการจัดซื้อจัดจ้างพัสดุโดยวิธีเฉพาะเจาะจง (ฉบับที่ 6) พ.ศ. 2568):
1. ภัยพิบัติ — ช่วยเหลือผู้ประสบภัยพิบัติฉุกเฉิน
2. ฉุกเฉินเสียหาย — จำเป็นต้องใช้พัสดุโดยฉุกเฉิน หากล่าช้าจะเสียหายต่อรัฐ/ประโยชน์สาธารณะ
3. **ภัยความมั่นคงทางไซเบอร์** — การจัดซื้อจัดจ้างพัสดุที่เกี่ยวกับการป้องกันหรือแก้ไขปัญหาภัยคุกคามทางไซเบอร์ หรือทางทหาร ที่ส่งผลกระทบต่อเสถียรภาพของหน่วยงานรัฐหรือประเทศ

สรุปสำหรับลูกค้าราชการ: ถ้าเป็นกรณีเร่งด่วนเรื่องภัยไซเบอร์ กฎหมายอนุญาตให้จัดซื้อ GOSEC แบบวิธีเฉพาะเจาะจงได้ทันที ไม่ต้องรอประกาศแผนจัดซื้อประจำปีล่วงหน้าก่อน (ประกาศย้อนหลังได้ภายใน 30 วันนับจากวันที่จัดซื้อจัดจ้าง) ช่วยให้หน่วยงานตัดสินใจและดำเนินการได้เร็วขึ้นมากเมื่อต้องการป้องกันภัยไซเบอร์อย่างเร่งด่วน

=====================
เงื่อนไขสัญญาและการให้บริการ
=====================

รูปแบบสัญญา: 2-5 ปี (Multi-year) เหมาะกับภาครัฐ/รัฐวิสาหกิจ/โรงเรียน-มหาวิทยาลัย/สั่งซื้อจำนวนมาก เลือกได้ทั้ง Cloud และ On-Premise รองรับขยายตัวได้ ไม่มีค่าติดตั้ง/ค่าใช้จ่ายแฝง

เงื่อนไขสัญญา:
- แบบ Annual / 3 ปี / 5 ปี / Subscription
- มี Price Lock — ราคาคงที่ตลอดอายุสัญญา ไม่ขึ้นระหว่างทาง
- แจ้งเตือนต่ออายุล่วงหน้า 60 วัน
- ข้อมูลเป็นสิทธิ์ของลูกค้า 100% (Log, Incident, Dashboard, Report, Configuration, Asset Inventory ทั้งหมด)
- เมื่อยกเลิกสัญญา ยังให้บริการต่อเนื่องในช่วงเปลี่ยนผ่าน (Downtime) แต่ไม่มีการคืนเงินที่ชำระล่วงหน้า (ตอบเฉพาะเมื่อลูกค้าถามถึง)
- เลิกสัญญาแล้วยัง Export ข้อมูลออกได้ตามมาตรฐาน มีทีมงานช่วยย้ายระบบ

การติดตั้งและประสิทธิภาพ:
- ติดตั้ง Cloud: 1-3 วัน / On-Premise: 2-5 วัน
- Near Zero Downtime — แทบไม่มีเวลาหยุดทำงานระบบ
- Agent กินทรัพยากรน้อยมาก: CPU น้อยกว่า 3%, RAM น้อยกว่า 200 MB (เครื่องไม่หน่วง)
- แจ้งเตือนได้หลายช่องทางแบบเรียลไทม์: Email, LINE, MS Teams, SMS, Mobile Push

สิทธิ์การเข้าถึงระบบ (RBAC): Super Admin, Admin, SOC Analyst, Auditor, Viewer — จัดการผ่าน Web Dashboard ด้วยระบบ RBAC และ Policy

รายงานและการอบรม: Export รายงานได้ PDF, Excel, CSV, มี Executive Dashboard สำหรับผู้บริหาร อบรมได้ทั้ง Onsite/Online พร้อมใบ Certificate`;

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
    'สวัสดีค่ะ 👋 นี่คือบัญชีทางการของ GOSEC\n' +
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
      name: 'เสาวลักษณ์ ศิริมาวัชรพล',
      lastName: '(ขวัญ)',
      imageUrl:
        'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/sale1.jpg.jpg?v=2',
      lineUrl: 'https://line.me/ti/p/pXXB6cU4tJ',
    },
    {
      name: 'นางสาวนฤทัย ทนอุป',
      lastName: '(หนุงหนิง)',
      imageUrl:
        'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/sale2.jpg.jpg?v=2',
      lineUrl: 'https://line.me/ti/p/4cuhA5-4Py',
    },
    {
      name: 'นางสาวสุพรรณี สัณฑิติ',
      lastName: '(ปูเป้)',
      imageUrl:
        'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/sale3.jpg',
      lineUrl: 'https://line.me/ti/p/2EksyN66ZK',
    },
    {
      name: 'บุญญฤทธิ์ บุญกิตติพร',
      lastName: '(ซัน)',
      imageUrl:
        'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/sale4.jpg',
      lineUrl: 'https://line.me/ti/p/fYfeIt8W0y',
    },
    {
      name: 'ดร.อัมรินทร์ เพชรชู',
      lastName: '(เอ็ม)',
      imageUrl:
        'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/sale5.jpg',
      lineUrl: 'https://line.me/ti/p/xqLFXF5G8v',
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
          ...(rep.lineUrl
            ? { action: { type: 'uri', label: 'เพิ่มเพื่อน', uri: rep.lineUrl } }
            : {}),
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

// ===== ข่าวสาร 3 ข่าว =====
const NEWS_KEYWORDS = ['ข่าวสาร', 'ดูข่าว', 'มีข่าว', 'ข่าว'];

function isAskingForNews(text) {
  return NEWS_KEYWORDS.some((kw) => text.includes(kw));
}

const NEWS_ITEMS = [
  {
    title: 'เตือนภัยแจ้งข่าว ภัยไซเบอร์ใกล้ตัว โดย อดีต พตท.ทักษิณ ชินวัตร',
    imageUrl:
      'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/news1.jpg',
    link: 'https://youtu.be/R8yUUPLG0U8?feature=shared',
  },
  {
    title:
      'จัดอบรมเชิงปฏิบัติการการพัฒนาคุณภาพเทคโนโลยีด้านความปลอดภัยทางไซเบอร์ โดย GoSec by CTMR',
    imageUrl:
      'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/news2.jpg',
    link: 'https://www.vijaikhao.com/2026/01/gosec-by-ctmr.html',
  },
  {
    title:
      'เปิดโครงการ "GoSec (CTMR)" ดึงผู้เชี่ยวชาญระดับประเทศ ติวเข้ม 25 โรงพยาบาล เสริมเกราะไซเบอร์ขั้นสูง ยกระดับความปลอดภัยข้อมูลสุขภาพ',
    imageUrl:
      'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/news3.jpg',
    link: 'https://mgronline.com/qol/detail/9690000033901',
  },
];

// การ์ด Carousel รูปข่าวล้วนๆ กดรูปแล้วเปิดลิงก์ข่าวนั้นทันที
function buildNewsFlexMessage() {
  return {
    type: 'flex',
    altText: 'ข่าวสารล่าสุดจาก GOSEC',
    contents: {
      type: 'carousel',
      contents: NEWS_ITEMS.map((n) => ({
        type: 'bubble',
        size: 'kilo',
        hero: {
          type: 'image',
          url: n.imageUrl,
          size: 'full',
          aspectRatio: '1:1',
          aspectMode: 'cover',
          action: { type: 'uri', label: 'อ่านข่าวนี้', uri: n.link },
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

// ลิงก์วิดีโอเฉพาะสินค้าบางตัว (ถ้ามี) — กดปุ่มในการ์ดแทนโชว์ลิงก์เป็นตัวหนังสือ
const PRODUCT_VIDEO_LINKS = {
  'Gosec by CTMR': 'https://youtu.be/0Ao_ilsMij4?feature=shared',
};

// การ์ดวิดีโอสไตล์ดำ-ทอง สำหรับสินค้าที่มีวิดีโอแนะนำโดยเฉพาะ
function buildProductVideoFlexMessage(product, videoUrl) {
  return {
    type: 'flex',
    altText: `วิดีโอแนะนำ ${product.name} — GOSEC`,
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
            text: 'GOSEC · PRODUCT VIDEO',
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
            text: product.name,
            color: '#F3EFE6',
            size: 'xl',
            weight: 'bold',
            align: 'center',
            margin: 'lg',
            wrap: true,
          },
          {
            type: 'text',
            text: product.description,
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
              label: 'ดูวิดีโอแนะนำ',
              uri: videoUrl,
            },
          },
          {
            type: 'text',
            text: 'สอบถามเพิ่มเติม 096-253-9287',
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

// เช็คว่าลูกค้ากดสินค้าตัวไหน แล้วคืนสิ่งที่จะตอบ (การ์ดวิดีโอ ถ้ามี / ข้อความปกติ ถ้าไม่มี)
function findProductResponse(text) {
  const product = PRODUCTS.find((p) => text === `สนใจสินค้า ${p.name}`);
  if (!product) return null;

  const videoUrl = PRODUCT_VIDEO_LINKS[product.name];
  if (videoUrl) {
    return { type: 'flex', flex: buildProductVideoFlexMessage(product, videoUrl) };
  }

  const replyText =
    `หากสนใจสินค้า ${product.name} นี้ มันคือ${product.description}\n\n` +
    `หากต้องการทราบรายละเอียดเพิ่มเติมติดต่อสอบถามได้ที่ 096-253-9287 หรือ info@gosec.one ค่ะ`;
  return { type: 'text', text: replyText };
}

// ===== การ์ดสอบถามบริการ 13 ข้อ =====
const FAQ_KEYWORDS = ['สอบถามบริการ', 'สอบถาม'];

function isAskingForFaq(text) {
  return FAQ_KEYWORDS.some((kw) => text.includes(kw));
}

// รายการคำถาม 13 ข้อ — answer และ videoUrl เป็น null รอใส่ข้อมูลจริงทีหลัง
// วิธีเติมคำตอบ: ใส่ข้อความใน answer, ถ้ามีวิดีโอด้วยใส่ลิงก์ใน videoUrl (ไม่มีก็ปล่อย null ได้)
const FAQ_ITEMS = [
  { number: 1, question: 'GOSEC สามารถทำอะไรได้บ้าง', answer: null, videoUrl: 'https://youtu.be/8GOI2tXfQ40' },
  { number: 2, question: 'สามารถป้องกันภัยไซเบอร์แบบไหนได้บ้าง', answer: null, videoUrl: null },
  { number: 3, question: 'สามารถตรวจจับการโจมตีได้อย่างไร', answer: null, videoUrl: null },
  { number: 4, question: 'สามารถป้องกัน Ransomware ได้หรือไม่', answer: null, videoUrl: null },
  { number: 5, question: 'สามารถป้องกันการขโมยข้อมูลได้อย่างไร', answer: null, videoUrl: null },
  { number: 6, question: 'สามารถป้องกันเว็บไซต์ถูกแฮกได้หรือไม่', answer: null, videoUrl: null },
  { number: 7, question: 'สามารถดูแล Server ได้หรือไม่', answer: null, videoUrl: null },
  { number: 8, question: 'รองรับ Cloud / Hybrid Cloud / Multi Cloud หรือไม่', answer: null, videoUrl: null },
  { number: 9, question: 'รองรับ AI หรือไม่', answer: null, videoUrl: null },
  { number: 10, question: 'สามารถตรวจสอบความผิดปกติของระบบได้หรือไม่', answer: null, videoUrl: null },
  { number: 11, question: 'สามารถแจ้งเตือนแบบ Real-time หรือไม่', answer: null, videoUrl: null },
  { number: 12, question: 'มี Dashboard อย่างไร', answer: null, videoUrl: null },
  { number: 13, question: 'ผู้บริหารสามารถดูรายงานอะไรได้บ้าง', answer: null, videoUrl: null },
];

// การ์ดพรีเมียมใบเดียว โทนดำ-ทอง แสดงคำถามทั้ง 13 ข้อ กดเลขไหนตอบเฉพาะข้อนั้น
function buildFaqFlexMessage() {
  const rows = [];
  FAQ_ITEMS.forEach((item, idx) => {
    if (idx > 0) {
      rows.push({ type: 'separator', color: '#B8935A33', margin: 'md' });
    }
    rows.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      spacing: 'md',
      action: {
        type: 'message',
        label: `ข้อ ${item.number}`,
        text: `สอบถามข้อที่ ${item.number}`,
      },
      contents: [
        {
          type: 'text',
          text: String(item.number),
          color: '#B8935A',
          weight: 'bold',
          size: 'sm',
          flex: 1,
        },
        {
          type: 'text',
          text: item.question,
          color: '#F3EFE6',
          size: 'sm',
          wrap: true,
          flex: 9,
        },
      ],
    });
  });

  return {
    type: 'flex',
    altText: 'สอบถามบริการกด — GOSEC',
    contents: {
      type: 'bubble',
      size: 'giga',
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0A0C14',
        paddingAll: '24px',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: 'GOSEC · PREMIUM SUPPORT',
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
            text: 'สอบถามบริการกด',
            color: '#F3EFE6',
            size: 'xl',
            weight: 'bold',
            align: 'center',
            margin: 'lg',
          },
          {
            type: 'text',
            text: 'แตะหมายเลขคำถามที่สนใจได้เลยค่ะ',
            color: '#8B8FA0',
            size: 'xs',
            align: 'center',
            margin: 'sm',
          },
          { type: 'separator', color: '#B8935A55', margin: 'lg' },
          ...rows,
        ],
      },
    },
  };
}

// เช็คว่าลูกค้ากดคำถามข้อไหน แล้วคืนสิ่งที่จะตอบ
function findFaqResponse(text) {
  const trimmed = text.trim();

  // แบบที่ 1: แตะปุ่มในการ์ด (ส่งข้อความ "สอบถามข้อที่ N" มาอัตโนมัติ)
  let questionNumber = null;
  const tapMatch = trimmed.match(/^สอบถามข้อที่ (\d+)$/);
  if (tapMatch) {
    questionNumber = Number(tapMatch[1]);
  }

  // แบบที่ 2: ลูกค้าพิมพ์เลขเปล่าๆ เอง (เช่น "1", "5", "13")
  if (questionNumber === null && /^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (n >= 1 && n <= FAQ_ITEMS.length) {
      questionNumber = n;
    }
  }

  if (questionNumber === null) return null;
  const item = FAQ_ITEMS.find((f) => f.number === questionNumber);
  if (!item) return null;

  // มีวิดีโอ → ส่งการ์ดวิดีโอทันที (ไม่ต้องรอมีคำตอบข้อความ)
  if (item.videoUrl) {
    return {
      type: 'flex',
      flex: buildProductVideoFlexMessage(
        {
          name: item.question,
          description: item.answer || 'รับชมข้อมูลได้จากวิดีโอด้านล่างเลยค่ะ',
        },
        item.videoUrl
      ),
    };
  }

  // ไม่มีวิดีโอ + ยังไม่มีคำตอบ — ตอบขอโทษชั่วคราวไปก่อน
  if (!item.answer) {
    return {
      type: 'text',
      text: `ขออภัยค่ะ ข้อมูลคำตอบข้อนี้อยู่ระหว่างเตรียมการ รบกวนติดต่อทีมงานที่ 096-253-9287 หรือ info@gosec.one ก่อนนะคะ`,
    };
  }

  // มีคำตอบข้อความ ไม่มีวิดีโอ → ตอบข้อความ
  return { type: 'text', text: item.answer };
}

// ===== ปุ่ม "ลูกค้า" — ส่งรูปเดี่ยว =====
const CUSTOMER_KEYWORDS = ['ลูกค้า'];

function isAskingForCustomer(text) {
  return CUSTOMER_KEYWORDS.some((kw) => text.includes(kw));
}

const CUSTOMER_IMAGE_URL =
  'https://raw.githubusercontent.com/norawutnasaree-del/-gosec-oa-bot/main/cutomer.jpg?v=2';

function buildCustomerImageMessage() {
  return {
    type: 'image',
    originalContentUrl: CUSTOMER_IMAGE_URL,
    previewImageUrl: CUSTOMER_IMAGE_URL,
  };
}

async function handleTextMessage(event) {
  const userId = event.source.userId;
  const userMessage = event.message.text;
  const displayName = await getDisplayName(userId);

  await logMessage(userId, displayName, 'user', userMessage);

  // 1) ลูกค้ากดรูปสินค้าตัวใดตัวหนึ่ง (ต้องเช็คก่อนตัวอื่น เพราะข้อความมีคำว่า "สินค้า" ปนอยู่)
  const productResponse = findProductResponse(userMessage);
  if (productResponse) {
    if (productResponse.type === 'flex') {
      await replyMessagesToLine(event.replyToken, [productResponse.flex]);
      await logMessage(userId, displayName, 'bot', '[ส่งการ์ดวิดีโอสินค้า]');
    } else {
      await replyMessagesToLine(event.replyToken, [
        { type: 'text', text: productResponse.text },
      ]);
      await logMessage(userId, displayName, 'bot', productResponse.text);
    }
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

  // 4) ขอดูข่าวสาร
  if (isAskingForNews(userMessage)) {
    await replyMessagesToLine(event.replyToken, [buildNewsFlexMessage()]);
    await logMessage(userId, displayName, 'bot', '[ส่งการ์ดข่าวสาร]');
    return;
  }

  // 5) กดปุ่ม "ลูกค้า" — ส่งรูปเดี่ยวกลับทันที
  if (isAskingForCustomer(userMessage)) {
    await replyMessagesToLine(event.replyToken, [buildCustomerImageMessage()]);
    await logMessage(userId, displayName, 'bot', '[ส่งรูปลูกค้า]');
    return;
  }

  // 6) ลูกค้ากดคำถามข้อใดข้อหนึ่งในการ์ดสอบถามบริการ (เช็คก่อนคำว่า "สอบถาม" เฉยๆ)
  const faqResponse = findFaqResponse(userMessage);
  if (faqResponse) {
    if (faqResponse.type === 'flex') {
      await replyMessagesToLine(event.replyToken, [faqResponse.flex]);
      await logMessage(userId, displayName, 'bot', `[ส่งคำตอบข้อ ${userMessage}]`);
    } else {
      await replyMessagesToLine(event.replyToken, [
        { type: 'text', text: faqResponse.text },
      ]);
      await logMessage(userId, displayName, 'bot', faqResponse.text);
    }
    return;
  }

  // 7) ขอสอบถามบริการ — ส่งการ์ดคำถาม 13 ข้อ
  if (isAskingForFaq(userMessage)) {
    await replyMessagesToLine(event.replyToken, [buildFaqFlexMessage()]);
    await logMessage(userId, displayName, 'bot', '[ส่งการ์ดสอบถามบริการ 13 ข้อ]');
    return;
  }

  // 5) ขอดูรายการสินค้าทั้งหมด
  if (isAskingForProductList(userMessage)) {
    await replyMessagesToLine(event.replyToken, [buildProductsFlexMessage()]);
    await logMessage(userId, displayName, 'bot', '[ส่งการ์ดรายการสินค้า]');
    return;
  }

  // 6) คำถามทั่วไป ให้ Claude ตอบ
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
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      console.error('Anthropic API error:', await res.text());
      return 'ขออภัยค่ะ ตอนนี้ระบบขัดข้องชั่วคราว รบกวนลองใหม่อีกครั้งนะคะ';
    }

    const data = await res.json();
    return (
      data.content?.[0]?.text ||
      'ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้'
    );
  } catch (err) {
    console.error('askClaude error:', err);
    return 'ขออภัยค่ะ ตอนนี้ระบบขัดข้องชั่วคราว รบกวนลองใหม่อีกครั้งนะคะ';
  }
}

async function replyMessagesToLine(replyToken, messages) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
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
  if (!res.ok) {
    console.error('LINE reply error:', await res.text());
  }
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
