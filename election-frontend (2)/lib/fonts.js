import { Sarabun } from 'next/font/google';

// ============================================================
// TEST MODE: สลับจากฟอนต์ไฟล์ local (.ttf) มาใช้ Google Fonts ชั่วคราว
// เพื่อทดสอบว่าปัญหา "ฟอนต์ไม่ขึ้นทั้งระบบ" อยู่ที่ไฟล์ .ttf เดิม หรืออยู่ที่จุดอื่น
//
// ⚠️ ต้องมีอินเทอร์เน็ตตอน `npm run build` (Google Fonts จะถูกดาวน์โหลดมา
//    self-host ไว้ตอน build แล้วใช้งานแบบ offline ได้ปกติหลังจากนั้น)
//
// ถ้า deploy แล้วฟอนต์ขึ้นปกติ  -> ปัญหาอยู่ที่ไฟล์ TH Sarabun New / TH Kodchasal เดิม
// ถ้า deploy แล้วยังไม่ขึ้นอีก -> ปัญหาไม่ได้อยู่ที่ไฟล์ฟอนต์ ต้องดูจุดอื่น (build cache, nginx, browser cache)
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
