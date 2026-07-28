'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const TABS = [
  { key: 'dashboard', label: 'แดชบอร์ด', icon: '📊' },
  { key: 'candidates', label: 'จัดการผู้สมัคร', icon: '🧑‍🎓' },
  { key: 'voters', label: 'จัดการผู้มีสิทธิ์', icon: '📋' },
  { key: 'election', label: 'ควบคุมการเลือกตั้ง', icon: '🗳️' },
  { key: 'overlay', label: 'ควบคุม Overlay', icon: '📺' },
  { key: 'audit', label: 'ประวัติการทำงาน', icon: '🕒' },
  { key: 'admins', label: 'บัญชีผู้ดูแลระบบ', icon: '🛡️', superAdminOnly: true },
  { key: 'account', label: 'บัญชีของฉัน', icon: '👤' },
];

export default function ControlSidebar({ active, onChange, admin, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleTabs = TABS.filter((t) => !t.superAdminOnly || admin?.role === 'super_admin');
  const listRef = useRef(null);
  const pillRef = useRef(null);

  function pick(key) {
    onChange(key);
    setMobileOpen(false);
  }

  // เลื่อนแถบไฮไลต์สีขาวไปหาปุ่มที่ active แบบลื่นๆ แทนการสลับสีทันที (ดูตามง่ายขึ้นว่ากำลังอยู่เมนูไหน)
  useEffect(() => {
    if (!listRef.current || !pillRef.current) return;
    const activeBtn = listRef.current.querySelector(`[data-tab-key="${active}"]`);
    if (!activeBtn) return;
    const listBox = listRef.current.getBoundingClientRect();
    const btnBox = activeBtn.getBoundingClientRect();
    gsap.to(pillRef.current, {
      top: btnBox.top - listBox.top + listRef.current.scrollTop,
      height: btnBox.height,
      opacity: 1,
      duration: 0.35,
      ease: 'power2.out',
    });
  }, [active, visibleTabs.length]);

  return (
    <>
      {/* แถบบนสุดสำหรับมือถือ/แท็บเล็ต — มีปุ่มเปิดเมนู */}
      <div
        className="d-lg-none d-flex align-items-center justify-content-between px-3 py-2 text-white w-100"
        style={{ background: 'var(--it-blue-dark)', position: 'sticky', top: 0, zIndex: 1030 }}
      >
        <div className="fw-bold">Control Election</div>
        <button
          className="btn btn-outline-light btn-sm"
          aria-label="เปิด/ปิดเมนู"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          ☰ เมนู
        </button>
      </div>

      {mobileOpen && (
        <div
          className="d-lg-none"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1040 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`control-sidebar d-flex flex-column p-3 text-white ${mobileOpen ? 'control-sidebar-open' : ''}`}
      >
        <div className="mb-4 d-none d-lg-block">
          <div className="fw-bold fs-5">Control Election</div>
          <div className="small opacity-75">{admin?.fullName}</div>
        </div>
        <div className="mb-3 d-lg-none small opacity-75">{admin?.fullName}</div>
        <ul ref={listRef} className="nav nav-pills flex-column gap-1 flex-grow-1 position-relative" style={{ overflowY: 'auto' }}>
          {/* แถบไฮไลต์เลื่อนได้ วางไว้ชั้นล่างสุด อยู่หลังปุ่มเมนูทั้งหมด */}
          <div
            ref={pillRef}
            className="position-absolute w-100 bg-white rounded"
            style={{ left: 0, top: 0, height: 0, opacity: 0, zIndex: 0, pointerEvents: 'none' }}
          />
          {visibleTabs.map((t) => (
            <li className="nav-item position-relative" key={t.key} style={{ zIndex: 1 }}>
              <button
                data-tab-key={t.key}
                className={`nav-link text-start w-100 d-flex align-items-center gap-2 bg-transparent ${active === t.key ? 'text-primary fw-semibold' : 'text-white'}`}
                onClick={() => pick(t.key)}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            </li>
          ))}
        </ul>
        <button className="btn btn-outline-light btn-sm mt-3" onClick={onLogout}>ออกจากระบบ</button>
      </div>
    </>
  );
}
