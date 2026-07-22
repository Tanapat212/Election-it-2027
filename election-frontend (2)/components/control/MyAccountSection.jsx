'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function MyAccountSection({ token, admin }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      showToast('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน', 'danger');
      return;
    }
    if (form.new_password.length < 6) {
      showToast('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 'danger');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/api/auth/admin/change-password', {
        method: 'POST',
        token,
        body: { current_password: form.current_password, new_password: form.new_password },
      });
      showToast('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="it-fade-in">
      <h3 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>บัญชีของฉัน</h3>
      <p className="text-secondary mb-4">ข้อมูลบัญชีและการเปลี่ยนรหัสผ่านของคุณเอง</p>

      <div className="it-card p-4 mb-4" style={{ maxWidth: 480 }}>
        <div className="mb-1"><strong>ชื่อ-นามสกุล:</strong> {admin?.fullName}</div>
        <div className="mb-1"><strong>ชื่อผู้ใช้:</strong> {admin?.username}</div>
        <div><strong>บทบาท:</strong> {admin?.role === 'super_admin' ? 'ผู้ดูแลระบบสูงสุด' : 'กรรมการ/เจ้าหน้าที่'}</div>
      </div>

      <div className="it-card p-4" style={{ maxWidth: 480 }}>
        <h5 className="fw-semibold mb-3">เปลี่ยนรหัสผ่าน</h5>
        <form onSubmit={submit}>
          <div className="mb-2">
            <label className="form-label small">รหัสผ่านเดิม</label>
            <input type="password" className="form-control" required
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
          </div>
          <div className="mb-2">
            <label className="form-label small">รหัสผ่านใหม่</label>
            <input type="password" className="form-control" required minLength={6}
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label small">ยืนยันรหัสผ่านใหม่</label>
            <input type="password" className="form-control" required minLength={6}
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} />
          </div>
          <button type="submit" className="btn it-btn-primary" disabled={busy}>บันทึกรหัสผ่านใหม่</button>
        </form>
      </div>
    </div>
  );
}
