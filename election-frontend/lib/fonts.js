import { Sarabun } from 'next/font/google';

// ============================================================
// ใช้ Google Fonts (Sarabun) แทนไฟล์ .ttf local แบบถาวร — ยืนยันแล้วว่าแก้ปัญหา
// "ฟอนต์ไม่ขึ้นทั้งระบบ" ที่เคยเจอกับไฟล์ TH Sarabun New / TH Kodchasal เดิมได้จริง
//
// ⚠️ สำคัญมากตอน deploy บน VPS ของตัวเอง (ไม่ใช่ Vercel):
//    ต้องมีอินเทอร์เน็ตออกไปหา fonts.googleapis.com ได้ตอนรันคำสั่ง `npm run build`
//    (next/font จะดาวน์โหลดไฟล์ฟอนต์มา self-host ไว้ตอน build ครั้งเดียว
//    หลังจากนั้นเว็บทำงานแบบ offline ได้ปกติ ไม่ต้องพึ่งเน็ตอีก)
//    ถ้าเซิร์ฟเวอร์/เครื่อง build อยู่หลังไฟร์วอลล์ที่ปิดกั้นโดเมนนี้ การ build จะ "ล้มเหลวทันที"
//    ให้เปิดให้เครื่อง build ต่อ fonts.googleapis.com และ fonts.gstatic.com ได้ก่อน deploy
// ============================================================

export const sarabunNew = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-sarabun-new',
  display: 'swap',
});

// TH Kodchasal ไม่มีใน Google Fonts จึงใช้ Sarabun น้ำหนักหนาแทนชั่วคราว
export const kodchasal = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['700'],
  style: ['normal'],
  variable: '--font-kodchasal',
  display: 'swap',
});
