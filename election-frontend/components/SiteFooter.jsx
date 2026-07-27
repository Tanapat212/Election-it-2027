'use client';

import Image from 'next/image';

export default function SiteFooter() {
  return (
    <footer className="mt-5 py-4" style={{ background: 'var(--it-blue-dark)', color: '#e0ecff' }}>
      <div className="container d-flex flex-column flex-md-row align-items-center justify-content-center justify-content-md-between gap-3 text-center text-md-start">
        <div className="d-flex align-items-center gap-2 flex-wrap justify-content-center">
          <Image src="/images/logo-department.png" alt="โลโก้แผนกเทคโนโลยีสารสนเทศ" width={36} height={36} style={{ height: 'auto' }} />
          <Image src="/images/logo-club.png" alt="โลโก้ชมรมวิชาชีพเทคโนโลยีสารสนเทศ" width={36} height={36} style={{ height: 'auto' }} />
          <span className="it-copyright mb-0">แผนกเทคโนโลยีสารสนเทศ วิทยาลัยเทคนิคหาดใหญ่</span>
        </div>
        <span className="it-copyright opacity-75 mb-0">
          © {new Date().getFullYear()} ระบบเลือกตั้งประธานนักเรียน นักศึกษา พัฒนาโดยชมรมวิชาชีพเทคโนโลยีสารสนเทศ
        </span>
      </div>
    </footer>
  );
}
