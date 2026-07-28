'use client';

import { useState } from 'react';

/**
 * ช่องกรอกรหัสผ่าน พร้อมปุ่มรูปดวงตากดดูรหัสที่พิมพ์ได้ (กันพิมพ์ผิดโดยไม่รู้ตัว)
 * ใช้แทน <input type="password"> ธรรมดาได้เลย รับ props เหมือนกันทุกตัว
 */
export default function PasswordInput({ className = 'form-control', value, onChange, placeholder, autoComplete, required, minLength, id }) {
  const [show, setShow] = useState(false);

  return (
    <div className="position-relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={className}
        style={{ paddingRight: 42 }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        title={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        style={{
          position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
          border: 'none', background: 'transparent', padding: '6px 8px',
          color: '#6b7280', cursor: 'pointer', lineHeight: 1,
        }}
      >
        {show ? (
          // ไอคอนดวงตาปิด (กำลังโชว์รหัสอยู่ กดเพื่อซ่อน)
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        ) : (
          // ไอคอนดวงตาเปิด (กำลังซ่อนรหัสอยู่ กดเพื่อโชว์)
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )}
      </button>
    </div>
  );
}
