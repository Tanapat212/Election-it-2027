'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import SiteNavbar from '@/components/SiteNavbar';
import SiteFooter from '@/components/SiteFooter';
import TurnoutWidget from '@/components/TurnoutWidget';

export default function VoteSuccessPage() {
  useEffect(() => {
    const sound = new Audio('/audio/vote-success.mp3');
    sound.play().catch(() => {
      // ถ้าเบราว์เซอร์บล็อก autoplay ผู้ใช้สามารถกดปุ่มลำโพงด้านล่างเพื่อฟังได้
    });
  }, []);

  return (
    <>
      <SiteNavbar />
      <div className="container py-5 d-flex flex-column align-items-center text-center">
        <div style={{ fontSize: '4rem' }} className="it-fade-in">🎉</div>
        <h2 className="fw-bold mt-2" style={{ color: 'var(--it-blue-dark)' }}>บันทึกคะแนนเสียงสำเร็จ</h2>
        <p className="text-secondary mb-2">ขอบคุณที่ใช้สิทธิ์ของคุณ คะแนนของคุณเป็นความลับและถูกบันทึกเรียบร้อยแล้ว</p>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary mb-4"
          onClick={() => new Audio('/audio/vote-success.mp3').play()}
        >
          🔊 ฟังเสียงยืนยันอีกครั้ง
        </button>
        <div style={{ maxWidth: 480, width: '100%' }} className="mb-4">
          <TurnoutWidget />
        </div>
        <Link href="/" className="btn it-btn-primary px-4">กลับหน้าแรก</Link>
      </div>
      <SiteFooter />
    </>
  );
}
