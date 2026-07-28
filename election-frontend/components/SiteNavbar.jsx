'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';

const LINKS = [
  { href: '/candidates', label: 'รายชื่อผู้สมัคร', tip: 'ดูรายชื่อและนโยบายผู้สมัครทั้งหมด' },
  { href: '/register', label: 'สมัครรับเลือกตั้ง', tip: 'กรอกใบสมัครเพื่อลงชิงตำแหน่ง' },
  { href: '/voter-login', label: 'ลงคะแนนเสียง', tip: 'เข้าสู่ระบบด้วยบัญชีผู้มีสิทธิ์เพื่อโหวต' },
  { href: '/results', label: 'ประกาศผล', tip: 'ดูผลคะแนนหลังปิดการเลือกตั้ง' },
  { href: '/admin-login', label: 'สำหรับผู้ดูแลระบบ', tip: 'เข้าสู่ระบบสำหรับผู้ดูแล/กรรมการ' },
];

// ต้องตรงกับ breakpoint ของ .navbar-expand-lg ใน Bootstrap (992px) เป๊ะๆ
// เพื่อให้โค้ด JS รู้ตรงกับ CSS ว่าตอนนี้อยู่โหมด "มือถือ" (มีปุ่ม hamburger) หรือ "เดสก์ท็อป" (เมนูโชว์เต็มตลอด)
const DESKTOP_BREAKPOINT = '(min-width: 992px)';

export default function SiteNavbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef(null);
  const menuRef = useRef(null);

  // เข้าฉากแบบเบาๆ ตอนโหลดหน้า (ครั้งเดียว ไม่รบกวนตอนกดเมนู)
  useEffect(() => {
    if (!navRef.current) return;
    gsap.fromTo(navRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
  }, []);

  // แอนิเมตเมนูมือถือเปิด/ปิดแบบลื่นๆ แทนการโชว์/ซ่อนทันที
  //
  // สำคัญ: ห้ามตั้ง inline style `display` ค้างไว้แบบถาวรเด็ดขาด (บั๊กเดิม) —
  // เพราะ React จะ apply style={{display:'none'}} ทับกลับไปทุกครั้งที่ re-render
  // (เช่น ตอนเปลี่ยนหน้า/เปลี่ยน route) ชนกับที่ GSAP set ไว้ตอนเปิดเมนู ผลคือเมนูฝั่ง
  // ขวาบนหายไปเงียบๆ แม้แต่บนจอเดสก์ท็อปที่ควรโชว์เต็มตลอดตาม Bootstrap breakpoint
  // (.navbar-expand-lg .navbar-collapse{display:flex!important} ที่ ≥992px)
  //
  // แก้โดย: ให้ GSAP animate เฉพาะตอนอยู่ในโหมดมือถือ (<992px) เท่านั้น และเคลียร์
  // inline style ที่ GSAP เคยตั้งไว้ทั้งหมดทันทีที่จอกว้างถึงระดับเดสก์ท็อป
  // ปล่อยให้ CSS ของ Bootstrap เป็นคนคุมการโชว์/ซ่อนบนเดสก์ท็อป 100% ไม่ให้ JS ไปยุ่งเลย
  useEffect(() => {
    if (!menuRef.current) return;
    const mq = window.matchMedia(DESKTOP_BREAKPOINT);

    function applyState() {
      if (!menuRef.current) return;
      if (mq.matches) {
        // โหมดเดสก์ท็อป: เคลียร์ inline style ทั้งหมดที่ GSAP เคยตั้งไว้ตอนมือถือ
        // ให้ Bootstrap CSS (.navbar-expand-lg .navbar-collapse{display:flex!important}) คุมเต็มที่
        gsap.set(menuRef.current, { clearProps: 'display,height,opacity' });
        return;
      }
      // โหมดมือถือ: ใช้ GSAP animate เปิด/ปิดตามปกติ
      if (open) {
        gsap.set(menuRef.current, { display: 'block', height: 0, opacity: 0 });
        gsap.to(menuRef.current, { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.set(menuRef.current, { display: 'none', height: 0, opacity: 0 });
      }
    }

    applyState();
    mq.addEventListener('change', applyState);
    return () => mq.removeEventListener('change', applyState);
  }, [open]);

  return (
    <nav ref={navRef} className="navbar navbar-expand-lg navbar-dark it-navbar sticky-top py-2">
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
        <div ref={menuRef} className="collapse navbar-collapse">
          <ul className="navbar-nav ms-auto gap-lg-1 flex-nowrap">
            {LINKS.map((l) => {
              const isActive = pathname === l.href;
              return (
                <li className="nav-item" key={l.href}>
                  <Link
                    className={`nav-link it-nav-link ${isActive ? 'active fw-semibold' : ''}`}
                    href={l.href}
                    data-tip={l.tip}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    style={isActive ? { position: 'relative' } : undefined}
                  >
                    {l.label}
                    {isActive && (
                      <span
                        className="d-none d-lg-block"
                        style={{
                          position: 'absolute', left: 8, right: 8, bottom: -2, height: 3,
                          borderRadius: 999, background: 'var(--it-gold, #f5b400)',
                        }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
