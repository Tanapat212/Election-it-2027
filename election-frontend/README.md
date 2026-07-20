# ระบบเลือกตั้งประธานนักเรียน/นักศึกษา แผนก IT วิทยาลัยเทคนิคหาดใหญ่

Stack: **Fastify** (backend) + **Next.js App Router + Bootstrap 5** (frontend) + **MySQL/MariaDB**

## โครงสร้างโปรเจกต์
```
election-system/
├── backend/     Fastify API + Socket.io + MySQL
└── frontend/    Next.js + Bootstrap 5
```

## วิธีติดตั้ง (localhost)

### 1. ฐานข้อมูล (ใช้ XAMPP ที่มีอยู่แล้ว)
1. เปิด XAMPP, start MySQL
2. เปิด phpMyAdmin แล้ว import ไฟล์ `backend/src/db/schema.sql`
   (หรือรัน `mysql -u root -p < backend/src/db/schema.sql`)

### 2. Backend
```bash
cd backend
cp .env.example .env      # แก้ DB_PASSWORD ถ้า XAMPP ตั้งรหัสไว้
npm install
npm run seed               # สร้าง admin เริ่มต้น (admin / ChangeMe123!)
npm run dev                 # รันที่ http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # รันที่ http://localhost:3001
```

> **หมายเหตุเรื่องพอร์ต:** frontend ตั้งให้รันที่ **port 3001** (ไม่ใช่ 3000 ที่เป็นค่า default ของ Next.js)
> เพราะเซิร์ฟเวอร์นี้มีระบบ **game2** รันครองพอร์ต 3000 อยู่แล้ว ถ้าย้ายไปเครื่องอื่นที่ไม่มี game2
> จะเปลี่ยนกลับไปใช้ port 3000 ก็ได้ (แก้ script `dev`/`start` ใน `frontend/package.json` และแก้
> `FRONTEND_URL` ใน `backend/.env` ให้ตรงกัน)

## สถานะการพัฒนา: ครบทั้ง 10 หน้าตามสเปก ✅

**Backend (Fastify + MySQL) — ครบตามสเปกด้านความปลอดภัย:**
- Schema แยกตาราง `voters` (Turnout) และ `ballots` (คะแนน) ขาดจากกันเด็ดขาด ไม่มีคอลัมน์เชื่อมโยง
- การบันทึกคะแนน: 2 transaction แยกกันจริง (`markVoterAsVoted` → `recordBallot`)
- `COUNT(*)` สดจากตาราง voters ทุกจุด ไม่มีค่าคงที่ hardcode
- Gate การเข้าถึงยอดคะแนนแยกเบอร์ที่ระดับ backend (`counting_unlocked`, `results_announced`)
- Four-eyes principle สำหรับกรณีคะแนนเสมอ (ต้องกรรมการ 2 ท่านยืนยันตรงกัน)
- Overlay scene gating (กลุ่ม A/B) บังคับที่ backend ไม่ใช่แค่ซ่อน UI
- Audit log, JWT auth (admin/voter role แยกกัน), Socket.io pub/sub เดียวทั้งระบบ
- Endpoints ครบ: auth, candidates (สมัคร+อนุมัติ+ปฏิเสธ+ลบ), voters (CRUD+bulk import Excel/CSV),
  voting (cast), election control (open/close/count/announce/tie-resolve), overlay scene control, audit logs

**Frontend (Next.js + Bootstrap 5) — ครบทั้ง 10 หน้า:**
1. `/` Landing พร้อมโลโก้แผนก+ชมรม และ turnout สด
2. `/register` ฟอร์มรับสมัคร (อัปโหลดรูป+ไฟล์นโยบาย, ทีมบริหาร, validation แบบ inline)
3. `/candidates` รายชื่อผู้สมัครสาธารณะ (realtime)
4. `/voter-login` เข้าสู่ระบบผู้มีสิทธิ์
5. `/vote` หน้าลงคะแนน พร้อม modal ยืนยันก่อนส่ง, งดออกเสียงได้
6. `/vote-success` ยืนยันโหวตสำเร็จ
7. `/admin-login` เข้าสู่ระบบผู้ดูแล/กรรมการ
8. `/control` Control Panel เต็มรูปแบบ: แดชบอร์ด, จัดการผู้สมัคร, จัดการผู้มีสิทธิ์ (เพิ่มทีละคน/นำเข้า Excel/CSV),
   ควบคุมการเลือกตั้ง (เปิด/ปิด/นับคะแนน/ประกาศผล/จัดการกรณีเสมอ/export Excel), รีโมทควบคุม Overlay, audit log
9. `/overlay` หน้าจอฉาย 6 ฉาก (countdown, ผู้สมัครหมุนเวียน, turnout, สรุปคะแนน, ประกาศผู้ชนะ+confetti, ว่าง)
   พร้อม scene transition และแอนิเมชันตามสเปกข้อ 7.1 ครบทุกฉาก
10. `/results` ประกาศผลสาธารณะ ดูย้อนหลังได้

ทุกหน้าใช้ theme ฟ้า-ขาว/ฟอนต์ Kanit-Sarabun เดียวกัน มี loading skeleton, empty state, toast feedback,
confirmation modal ก่อนกดปุ่มสำคัญ และ inline validation ตามมาตรฐาน UX ข้อ 2.1

## ทดสอบ flow แบบเต็มระบบ (แนะนำลำดับ)
1. Login `/admin-login` (admin / ChangeMe123!) → ไปที่ `/control`
2. แท็บ "จัดการผู้มีสิทธิ์" → เพิ่มรายชื่อทดสอบ 2-3 คน (จด username/password ที่ระบบสร้างให้)
3. เปิด `/register` (แท็บ/browser อื่น) → สมัครผู้สมัคร 2-3 คน
4. กลับ `/control` แท็บ "จัดการผู้สมัคร" → กดอนุมัติ (ระบบจะกำหนดเบอร์อัตโนมัติ)
5. แท็บ "ควบคุมการเลือกตั้ง" → กด "เปิดระบบการโหวต"
6. เปิด `/overlay` ในแท็บ/หน้าจอแยก แล้วสลับฉากจาก Control Panel มาดู
7. Login `/voter-login` ด้วยบัญชีที่สร้างไว้ → ไปโหวตที่ `/vote`
8. กลับ Control Panel → "ปิดระบบการโหวต" → "เริ่มนับคะแนน" (ดูยอดคะแนนภายใน) → "ประกาศผลอย่างเป็นทางการ"
9. ดูผลที่ `/results` และสลับ Overlay ไปฉาก "สรุปคะแนน"/"ประกาศผู้ชนะ"

## ข้อจำกัดที่ควรทราบ (simplification)
- Export ผลคะแนนรองรับเฉพาะ **Excel** (ยังไม่มีลายเซ็นดิจิทัลแบบ PKI จริงในไฟล์ PDF — เป็นฟีเจอร์ที่ซับซ้อนเกินขอบเขตของระบบสาธิตนี้
  หากต้องใช้งานจริงแนะนำต่อยอดด้วยไลบรารีเซ็นดิจิทัล เช่น `node-forge` หรือบริการเซ็นเอกสารภายนอก)
- ระบบยังไม่มี rate-limiting ระดับ production (แนะนำเพิ่ม `@fastify/rate-limit` ก่อนใช้งานจริงกับผู้ใช้จำนวนมาก)
- รหัสผ่านชั่วคราวของผู้มีสิทธิ์แสดงในหน้าเว็บครั้งเดียวตอนสร้าง ควร copy ไปแจกจ่ายอย่างปลอดภัยทันที

## หมายเหตุความปลอดภัย
เปลี่ยนรหัสผ่าน admin เริ่มต้นและ `JWT_SECRET` ก่อนใช้งานจริงเสมอ
