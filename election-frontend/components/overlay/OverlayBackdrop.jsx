'use client';

import { motion } from 'framer-motion';

/**
 * พื้นหลังตกแต่งสำหรับฉาก Overlay — ให้ดูมีดีไซน์ ไม่ใช่หน้าขาวเปล่าๆ
 * ใช้ร่วมกันในทุกฉาก: วงกลมเบลอลอยตัว + จุดไข่ปลาเป็นลาย + เส้นขอบมุม + โลโก้จางๆ
 */
export default function OverlayBackdrop({ variant = 'light' }) {
  const isDark = variant === 'dark';
  const isColorful = variant === 'colorful';

  let blobColor1 = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(37,99,235,0.14)';
  let blobColor2 = isDark ? 'rgba(251,191,36,0.18)' : 'rgba(14,165,233,0.12)';
  let blobColor3 = null;
  const dotColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(37,99,235,0.28)';
  const cornerColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(37,99,235,0.4)';

  if (isColorful) {
    blobColor1 = 'rgba(236,72,153,0.28)'; // ชมพู
    blobColor2 = 'rgba(250,204,21,0.28)'; // เหลือง
    blobColor3 = 'rgba(45,212,191,0.28)'; // เขียวมิ้นท์
  }

  return (
    <div className="position-absolute top-0 start-0 w-100 h-100" style={{ overflow: 'hidden', zIndex: 0 }}>
      {/* วงกลมเบลอลอยตัวช้าๆ มุมบนซ้าย */}
      <motion.div
        animate={{ y: [0, 24, 0], x: [0, 16, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '-8%', left: '-6%', width: '38vw', height: '38vw',
          borderRadius: '50%', background: blobColor1, filter: 'blur(60px)',
        }}
      />
      {/* วงกลมเบลอลอยตัวช้าๆ มุมล่างขวา */}
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, -14, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', bottom: '-10%', right: '-8%', width: '42vw', height: '42vw',
          borderRadius: '50%', background: blobColor2, filter: 'blur(70px)',
        }}
      />
      {blobColor3 && (
        <motion.div
          animate={{ y: [0, 18, 0], x: [0, -10, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '30%', right: '10%', width: '30vw', height: '30vw',
            borderRadius: '50%', background: blobColor3, filter: 'blur(65px)',
          }}
        />
      )}

      {/* ลายจุดไข่ปลาบางๆ มุมขวาบน ให้ความรู้สึกมีพื้นผิว */}
      <svg
        width="220" height="220"
        style={{ position: 'absolute', top: 28, right: 28, opacity: 0.5 }}
      >
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 6 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={col * 24 + 8} cy={row * 24 + 8} r={2.5} fill={dotColor} />
          ))
        )}
      </svg>
      <svg
        width="220" height="220"
        style={{ position: 'absolute', bottom: 28, left: 28, opacity: 0.35 }}
      >
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 6 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={col * 24 + 8} cy={row * 24 + 8} r={2.5} fill={dotColor} />
          ))
        )}
      </svg>

      {/* กรอบมุมทั้งสี่ — ให้ความรู้สึกเป็น "เฟรมรายการถ่ายทอดสด" */}
      {[
        { top: 24, left: 24, borderTop: 4, borderLeft: 4 },
        { top: 24, right: 24, borderTop: 4, borderRight: 4 },
        { bottom: 24, left: 24, borderBottom: 4, borderLeft: 4 },
        { bottom: 24, right: 24, borderBottom: 4, borderRight: 4 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', width: 48, height: 48,
            borderColor: cornerColor, borderStyle: 'solid',
            borderTopWidth: pos.borderTop || 0, borderBottomWidth: pos.borderBottom || 0,
            borderLeftWidth: pos.borderLeft || 0, borderRightWidth: pos.borderRight || 0,
            top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right,
            borderRadius: 6, opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}
