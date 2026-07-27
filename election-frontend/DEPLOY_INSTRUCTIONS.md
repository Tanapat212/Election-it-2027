# คู่มือ Deploy ระบบเลือกตั้ง — สำหรับคนที่มี Server

ระบบนี้มี 2 ส่วน: **frontend** (Next.js, อยู่ที่ root) และ **backend** (Fastify, อยู่ใน `backend/`)
ต้องรันทั้งคู่พร้อมกัน + มี MySQL + มีโดเมน 2 ชื่อ (โดเมนหลัก และ subdomain สำหรับ api)

---

## สิ่งที่ต้องมีก่อนเริ่ม
- VPS ที่ลง Ubuntu 22.04/24.04 แล้ว เข้าถึงผ่าน SSH ได้
- โดเมน 2 ชื่อที่ตั้ง DNS (A record) ชี้มาที่ IP ของ VPS แล้ว:
  - `yourdomain.com` → frontend
  - `api.yourdomain.com` → backend
- Node.js เวอร์ชัน 18 ขึ้นไป, MySQL 8 หรือ MariaDB

---

## ขั้นตอนที่ 1: ติดตั้งพื้นฐานบน VPS
```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Nginx + PM2 + Git
sudo apt install -y nginx git
sudo npm install -g pm2
```

## ขั้นตอนที่ 2: Clone repo
```bash
cd /var/www
sudo git clone <ใส่ URL repo GitHub ตรงนี้> election-system
cd election-system
sudo chown -R $USER:$USER .
```

## ขั้นตอนที่ 3: ตั้งค่าฐานข้อมูล
```bash
sudo mysql
```
```sql
CREATE DATABASE election1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'election_user'@'localhost' IDENTIFIED BY 'ตั้งรหัสผ่านที่นี่';
GRANT ALL PRIVILEGES ON election1.* TO 'election_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
```bash
mysql -u election_user -p election1 < backend/src/db/schema.sql
```

## ขั้นตอนที่ 4: ตั้งค่า Environment Variables

**Backend:**
```bash
cp backend/.env.example backend/.env
nano backend/.env
```
แก้ค่าเหล่านี้ให้ตรงกับของจริง:
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` — ตามที่สร้างไว้ขั้นตอนที่ 3
- `JWT_SECRET` — สุ่มค่าใหม่ด้วยคำสั่ง `openssl rand -hex 32` แล้วเอามาใส่ (ห้ามใช้ค่า default เด็ดขาด)
- `FRONTEND_URL=https://yourdomain.com`
- `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` — ตั้งรหัสผ่าน admin คนแรก

**Frontend:**
```bash
cp .env.local.example .env.local
nano .env.local
```
แก้เป็น:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

## ขั้นตอนที่ 5: ติดตั้ง dependency + สร้างแอดมินคนแรก
```bash
# backend
cd backend
npm install
npm run seed
cd ..

# frontend
npm install
npm run build
```

## ขั้นตอนที่ 6: รันด้วย PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# ทำตามคำสั่งที่ pm2 startup แสดงผลออกมา (copy-paste รันอีกบรรทัดหนึ่ง)
```
เช็คว่ารันอยู่: `pm2 status` ควรเห็น `election-backend` และ `election-frontend` สถานะ `online`

## ขั้นตอนที่ 7: ตั้งค่า Nginx
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/election
sudo nano /etc/nginx/sites-available/election
```
แก้ `yourdomain.com` และ `api.yourdomain.com` เป็นโดเมนจริงทั้งไฟล์ แล้ว:
```bash
sudo ln -s /etc/nginx/sites-available/election /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## ขั้นตอนที่ 8: SSL ฟรี (สำคัญมาก — มีหน้า login)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

---

## ทดสอบ
1. เปิด `https://yourdomain.com` → ควรเห็นหน้า landing page
2. เปิด `https://yourdomain.com/admin-login` → ล็อกอินด้วย `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` ที่ตั้งไว้
3. ลองสมัครผู้มีสิทธิ์เลือกตั้ง 1 คน แล้วลองโหวตดูให้ครบ flow ก่อนวันจริง

## คำสั่งที่ใช้บ่อยหลัง deploy
```bash
pm2 logs                    # ดู log ทั้งคู่ ถ้ามี error
pm2 restart all             # รีสตาร์ทหลังแก้ .env หรือโค้ด
git pull && npm install && npm run build && pm2 restart all   # อัปเดตโค้ดใหม่จาก GitHub
```

## ปัญหาที่เจอบ่อย
| อาการ | สาเหตุที่เป็นไปได้ |
|---|---|
| เข้าเว็บไม่ได้เลย | เช็ค DNS ชี้ถูก IP หรือยัง, เช็ค `sudo nginx -t` ผ่านไหม |
| หน้าเว็บขึ้นแต่โหลดข้อมูลไม่ได้ | เช็ค `NEXT_PUBLIC_API_URL` ตรงกับโดเมน backend จริงไหม, เช็ค `pm2 logs election-backend` มี error ไหม |
| ล็อกอินแล้วเด้งออกทันที | เช็ค `JWT_SECRET` ตั้งไว้ไหม (ถ้าไม่ตั้ง backend จะไม่ยอมรัน ใน production) |
| อัปโหลดรูปผู้สมัครไม่ได้ | เช็คสิทธิ์เขียนไฟล์โฟลเดอร์ `backend/uploads/` — รัน `chmod -R 755 backend/uploads` |
