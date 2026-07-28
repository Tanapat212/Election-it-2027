'use client';

/**
 * หลอด + เช็คลิสต์ความปลอดภัยของรหัสผ่าน ใช้ตอนแอดมิน/กรรมการตั้งรหัสผ่านเองให้ผู้อื่น
 * (ไม่บังคับผ่านเกณฑ์ถึงจะบันทึกได้ — แค่ช่วยให้เห็นว่ารหัสที่ตั้งแข็งแรงแค่ไหน)
 */
export default function PasswordStrengthMeter({ password }) {
  const checks = [
    { label: 'ยาวอย่างน้อย 8 ตัวอักษร', pass: password.length >= 8 },
    { label: 'มีตัวพิมพ์เล็ก (a-z)', pass: /[a-z]/.test(password) },
    { label: 'มีตัวพิมพ์ใหญ่ (A-Z)', pass: /[A-Z]/.test(password) },
    { label: 'มีตัวเลข (0-9)', pass: /[0-9]/.test(password) },
    { label: 'มีอักขระพิเศษ (เช่น ! @ # $ %)', pass: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;

  let level = { text: 'ยังไม่ได้กรอก', color: '#d1d5db', pct: 0 };
  if (password.length > 0) {
    if (score <= 1) level = { text: 'อ่อนมาก', color: '#dc2626', pct: 20 };
    else if (score === 2) level = { text: 'อ่อน', color: '#f97316', pct: 40 };
    else if (score === 3) level = { text: 'ปานกลาง', color: '#f59e0b', pct: 60 };
    else if (score === 4) level = { text: 'ดี', color: '#3b82f6', pct: 80 };
    else level = { text: 'แข็งแรงมาก', color: '#16a34a', pct: 100 };
  }

  return (
    <div className="mt-2">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="small text-secondary">ความปลอดภัยของรหัสผ่าน</span>
        <span className="small fw-semibold" style={{ color: level.color }}>{level.text}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 999, height: 8, overflow: 'hidden' }}>
        <div style={{
          width: `${level.pct}%`, height: '100%', borderRadius: 999,
          background: level.color, transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>
      <ul className="list-unstyled mt-2 mb-0" style={{ fontSize: 13 }}>
        {checks.map((c) => (
          <li key={c.label} className="d-flex align-items-center gap-1" style={{ color: c.pass ? '#16a34a' : '#9ca3af' }}>
            <span>{c.pass ? '✓' : '○'}</span>
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
