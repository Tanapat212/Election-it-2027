'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const LINKS = [
  { href: '/candidates', label: 'รายชื่อผู้สมัคร', tip: 'ดูรายชื่อและนโยบายผู้สมัครทั้งหมด' },
  { href: '/register', label: 'สมัครรับเลือกตั้ง', tip: 'กรอกใบสมัครเพื่อลงชิงตำแหน่ง' },
  { href: '/voter-login', label: 'ลงคะแนนเสียง', tip: 'เข้าสู่ระบบด้วยบัญชีผู้มีสิทธิ์เพื่อโหวต' },
  { href: '/results', label: 'ประกาศผล', tip: 'ดูผลคะแนนหลังปิดการเลือกตั้ง' },
  { href: '/admin-login', label: 'สำหรับผู้ดูแลระบบ', tip: 'เข้าสู่ระบบสำหรับผู้ดูแล/กรรมการ' },
];

export default function SiteNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark it-navbar sticky-top py-2">
      <div className="container">
        <Link href="/" className="navbar-brand d-flex align-items-center gap-2" onClick={() => setOpen(false)}>
          <Image src="/images/logo-department.png" alt="โลโก้แผนกเทคโนโลยีสารสนเทศ" width={44} height={44} priority />
          <Image src="/images/logo-club.png" alt="โลโก้ชมรมวิชาชีพเทคโนโลยีสารสนเทศ" width={44} height={44} priority />
          <span className="fw-semibold ms-1 d-none d-xl-inline">
            เลือกตั้งประธานนักเรียน นักศึกษา แผนก IT
          </span>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          aria-label="เปิด/ปิดเมนู"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav ms-auto gap-lg-1 flex-nowrap">
            {LINKS.map((l) => (
              <li className="nav-item" key={l.href}>
                <Link className="nav-link it-nav-link" href={l.href} data-tip={l.tip} onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
