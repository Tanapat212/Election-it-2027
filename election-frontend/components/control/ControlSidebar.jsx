'use client';

import { useState } from 'react';

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

  function pick(key) {
    onChange(key);
    setMobileOpen(false);
  }

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
        <ul className="nav nav-pills flex-column gap-1 flex-grow-1" style={{ overflowY: 'auto' }}>
          {visibleTabs.map((t) => (
            <li className="nav-item" key={t.key}>
              <button
                className={`nav-link text-start w-100 d-flex align-items-center gap-2 ${active === t.key ? 'active bg-white text-primary fw-semibold' : 'text-white'}`}
                onClick={() => pick(t.key)}
                style={active === t.key ? {} : { background: 'rgba(255,255,255,0.08)' }}
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
