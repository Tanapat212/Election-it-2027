'use client';

import { useEffect, useState } from 'react';
import { API_URL } from './api';

// เก็บ cache ไว้กันโหลดรูปเดิมซ้ำๆ เวลามีการ re-render บ่อยๆ (เช่นหน้า overlay ที่วน scene)
const blobCache = new Map();

/**
 * โหลดรูปผ่าน fetch() แทนการใส่ path ตรงๆ ใน <img src>
 *
 * เหตุผล: ถ้า backend รันผ่าน ngrok (free tier) หรืออยู่หลัง proxy ที่ต้องการ
 * header พิเศษ, <img src="..."> จะแนบ header เพิ่มเองไม่ได้ ทำให้โดนหน้า
 * เตือน/บล็อกของ ngrok แทนที่จะได้ไฟล์รูปจริง — แต่ fetch() ใส่ header ได้
 * เลยใช้ fetch() ดึงรูปมาเป็น blob แล้วค่อยแปลงเป็น URL ให้ <img>/background ใช้แทน
 *
 * @param {string|null} relativePath เช่น '/uploads/photos/xxx.jpg' (ค่าจาก photo_path)
 * @returns {string|null} object URL ที่ใช้กับ <img src> หรือ background ได้ทันที
 */
export function useAuthedImage(relativePath) {
  const [url, setUrl] = useState(() => (relativePath ? blobCache.get(relativePath) || null : null));

  useEffect(() => {
    if (!relativePath) { setUrl(null); return; }

    const cached = blobCache.get(relativePath);
    if (cached) { setUrl(cached); return; }

    let cancelled = false;
    const fullUrl = `${API_URL}${relativePath}`;

    fetch(fullUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then((res) => {
        if (!res.ok) throw new Error('image_fetch_failed');
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const objUrl = URL.createObjectURL(blob);
        blobCache.set(relativePath, objUrl);
        setUrl(objUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });

    return () => { cancelled = true; };
  }, [relativePath]);

  return url;
}
