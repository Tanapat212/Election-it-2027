import localFont from 'next/font/local';

// ใช้ next/font/local แทนการเขียน @font-face มือใน CSS
// ข้อดี: ถ้า path ไฟล์ผิด ระบบจะ "error ตอน build/dev ทันที" (เห็นชัดเจนในหน้าจอ)
// แทนที่จะปล่อยให้ browser fetch ไม่เจอแบบเงียบๆ แล้วฟอนต์เงียบหายไปโดยไม่รู้สาเหตุ (แบบที่เจอมาก่อนหน้านี้)

export const kodchasal = localFont({
  src: '../public/fonts/TH_Kodchasal_Bold.ttf',
  weight: '400 700',
  style: 'normal',
  variable: '--font-kodchasal',
  display: 'swap',
});

export const sarabunNew = localFont({
  src: [
    { path: '../public/fonts/THSarabunNew-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/THSarabunNew-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../public/fonts/THSarabunNew-BoldItalic.ttf', weight: '700', style: 'italic' },
  ],
  variable: '--font-sarabun-new',
  display: 'swap',
});
