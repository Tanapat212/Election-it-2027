'use client';

import { useEffect, useState } from 'react';

/**
 * แสดงนับถอยหลังแบบ real-time ตอนโดน rate limit (ลองเข้าสู่ระบบถี่เกินไป)
 * รับ `seconds` เริ่มต้นจาก err.data.retryAfterSeconds ที่ backend ส่งมา
 * นับถอยหลังลงทุกวินาทีเอง ไม่ต้องพึ่งข้อความ static จาก backend
 */
export default function RateLimitCountdown({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onExpire]);

  if (remaining <= 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const displayTime = mins > 0
    ? `${mins} นาที ${secs > 0 ? `${secs} วินาที` : ''}`.trim()
    : `${secs} วินาที`;

  return (
    <div className="alert alert-warning d-flex align-items-center gap-2 py-2 px-3 mt-2 mb-0" role="alert">
      <span>⏳</span>
      <span>ลองเข้าสู่ระบบถี่เกินไป กรุณารออีก <strong>{displayTime}</strong> แล้วลองใหม่</span>
    </div>
  );
}
