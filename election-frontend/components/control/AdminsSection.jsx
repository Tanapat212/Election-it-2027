'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import EmptyState from '@/components/EmptyState';

const ROLE_TEXT = { super_admin: 'ผู้ดูแลระบบสูงสุด', committee: 'กรรมการ/เจ้าหน้าที่' };

export default function AdminsSection({ token, currentAdminId }) {
  const { showToast } = useToast();
  const [admins, setAdmins] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: '', full_name: '', role: 'committee' });
  const [pwMode, setPwMode] = useState('random');
  const [customPw, setCustomPw] = useState('');
  const [newCred, setNewCred] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPwMode, setResetPwMode] = useState('random');
  const [resetCustomPw, setResetCustomPw] = useState('');
  const [resetResult, setResetResult] = useState(null);

  function load() {
    apiFetch('/api/admin/admins', { token }).then((d) => setAdmins(d.admins)).catch(() => setAdmins([]));
  }
  useEffect(load, [token]);

  async function addAdmin(e) {
    e.preventDefault();
    if (pwMode === 'custom' && customPw.length < 6) {
      showToast('รหัสผ่านที่ตั้งเองต้องมีอย่างน้อย 6 ตัวอักษร', 'danger');
      return;
    }
    setBusyId('new');
    try {
      const body = { ...form };
      if (pwMode === 'custom') body.password = customPw;
      const data = await apiFetch('/api/admin/admins', { method: 'POST', token, body });
      showToast('เพิ่มบัญชีสำเร็จ', 'success');
      setNewCred(data.admin);
      setShowAdd(false);
      setForm({ username: '', full_name: '', role: 'committee' });
      setCustomPw('');
      setPwMode('random');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(a) {
    setBusyId(a.id);
    try {
      await apiFetch(`/api/admin/admins/${a.id}`, { method: 'PATCH', token, body: { is_active: !a.is_active } });
      showToast(a.is_active ? 'ปิดใช้งานบัญชีแล้ว' : 'เปิดใช้งานบัญชีแล้ว', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(a, role) {
    setBusyId(a.id);
    try {
      await apiFetch(`/api/admin/admins/${a.id}`, { method: 'PATCH', token, body: { role } });
      showToast('เปลี่ยนบทบาทแล้ว', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusyId(null);
    }
  }

  function openReset(a) {
    setResetTarget(a);
    setResetPwMode('random');
    setResetCustomPw('');
  }

  async function submitReset(e) {
    e.preventDefault();
    if (resetPwMode === 'custom' && resetCustomPw.length < 6) {
      showToast('รหัสผ่านที่ตั้งเองต้องมีอย่างน้อย 6 ตัวอักษร', 'danger');
      return;
    }
    setBusyId(resetTarget.id);
    try {
      const body = resetPwMode === 'custom' ? { password: resetCustomPw } : undefined;
      const data = await apiFetch(`/api/admin/admins/${resetTarget.id}/reset-password`, { method: 'POST', token, body });
      setResetResult(data.admin);
      showToast('รีเซ็ตรหัสผ่านสำเร็จ', 'success');
      setResetTarget(null);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusyId(null);
    }
  }

  async function del() {
    setBusyId(confirmDelete.id);
    try {
      await apiFetch(`/api/admin/admins/${confirmDelete.id}`, { method: 'DELETE', token });
      showToast('ลบบัญชีแล้ว', 'success');
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="it-fade-in">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <h3 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>บัญชีผู้ดูแลระบบ</h3>
          <p className="text-secondary mb-0">เพิ่ม/แก้ไข/ปิดใช้งานบัญชีผู้ดูแลระบบและกรรมการ (เฉพาะผู้ดูแลระบบสูงสุด)</p>
        </div>
        <button className="btn it-btn-primary" onClick={() => setShowAdd(true)}>+ เพิ่มบัญชี</button>
      </div>

      {newCred && (
        <div className="alert alert-success mt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>
            สร้างบัญชีสำเร็จ — Username: <strong>{newCred.username}</strong>, รหัสผ่านชั่วคราว: <strong>{newCred.tempPassword}</strong>
            <br /><span className="small">จดหรือคัดลอกไว้ตอนนี้เลย รหัสผ่านนี้จะไม่แสดงซ้ำอีก</span>
          </span>
          <button className="btn btn-sm btn-outline-success" onClick={() => setNewCred(null)}>ปิด</button>
        </div>
      )}

      {resetResult && (
        <div className="alert alert-warning mt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>
            รีเซ็ตรหัสผ่านของ <strong>{resetResult.username}</strong> แล้ว รหัสผ่านใหม่: <strong>{resetResult.tempPassword}</strong>
            <br /><span className="small">แจ้งให้เจ้าของบัญชีทราบ แล้วแนะนำให้ไปเปลี่ยนรหัสผ่านเองที่แท็บ &quot;บัญชีของฉัน&quot;</span>
          </span>
          <button className="btn btn-sm btn-outline-warning" onClick={() => setResetResult(null)}>ปิด</button>
        </div>
      )}

      {admins === null && <div className="it-skeleton mt-3" style={{ height: 200 }} />}
      {admins && admins.length === 0 && <EmptyState icon="🛡️" title="ยังไม่มีบัญชีผู้ดูแลระบบ" />}

      {admins && admins.length > 0 && (
        <div className="it-card p-0 mt-3">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>ชื่อผู้ใช้</th><th>ชื่อ-นามสกุล</th><th>บทบาท</th><th>สถานะ</th><th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td className="text-nowrap">{a.username} {a.id === currentAdminId && <span className="badge bg-secondary ms-1">คุณ</span>}</td>
                    <td className="text-nowrap">{a.full_name}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        style={{ minWidth: 170 }}
                        value={a.role}
                        disabled={busyId === a.id}
                        onChange={(e) => changeRole(a, e.target.value)}
                      >
                        <option value="committee">{ROLE_TEXT.committee}</option>
                        <option value="super_admin">{ROLE_TEXT.super_admin}</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${a.is_active ? 'it-badge-approved' : 'it-badge-rejected'}`}>
                        {a.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap align-items-center">
                        <button className="btn btn-sm btn-outline-primary" disabled={busyId === a.id} onClick={() => openReset(a)}>
                          รีเซ็ตรหัสผ่าน
                        </button>
                        <button
                          className={`btn btn-sm ${a.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                          disabled={busyId === a.id || a.id === currentAdminId}
                          onClick={() => toggleActive(a)}
                        >
                          {a.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyId === a.id || a.id === currentAdminId}
                          onClick={() => setConfirmDelete(a)}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <ModalShell title="เพิ่มบัญชีผู้ดูแลระบบ" onClose={() => setShowAdd(false)} size="lg">
          <form onSubmit={addAdmin}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small">ชื่อผู้ใช้ (username) <span className="text-danger">*</span></label>
                <input className="form-control" required value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label small">ชื่อ-นามสกุล <span className="text-danger">*</span></label>
                <input className="form-control" required value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label small">บทบาท</label>
                <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="committee">{ROLE_TEXT.committee}</option>
                  <option value="super_admin">{ROLE_TEXT.super_admin}</option>
                </select>
              </div>
              <div className="col-md-6">
                <div className="p-2 rounded h-100" style={{ background: '#f0f7ff' }}>
                  <div className="small fw-semibold mb-1">รหัสผ่านบัญชี</div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="adminPwMode" id="adminPwRandom"
                      checked={pwMode === 'random'} onChange={() => setPwMode('random')} />
                    <label className="form-check-label small" htmlFor="adminPwRandom">สุ่มรหัสผ่านให้อัตโนมัติ (แนะนำ)</label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="adminPwMode" id="adminPwCustom"
                      checked={pwMode === 'custom'} onChange={() => setPwMode('custom')} />
                    <label className="form-check-label small" htmlFor="adminPwCustom">ตั้งรหัสผ่านเอง</label>
                  </div>
                  {pwMode === 'custom' && (
                    <input className="form-control form-control-sm mt-2" placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={customPw} onChange={(e) => setCustomPw(e.target.value)} />
                  )}
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAdd(false)}>ยกเลิก</button>
              <button type="submit" className="btn it-btn-primary" disabled={busyId === 'new'}>เพิ่มบัญชี</button>
            </div>
          </form>
        </ModalShell>
      )}

      {resetTarget && (
        <ModalShell title={`รีเซ็ตรหัสผ่าน: ${resetTarget.full_name}`} onClose={() => setResetTarget(null)}>
          <form onSubmit={submitReset}>
            <p className="small text-secondary">รหัสผ่านเดิมของบัญชีนี้จะใช้ไม่ได้อีกทันทีหลังยืนยัน</p>
            <div className="form-check">
              <input className="form-check-input" type="radio" name="resetAdminPwMode" id="resetAdminPwRandom"
                checked={resetPwMode === 'random'} onChange={() => setResetPwMode('random')} />
              <label className="form-check-label small" htmlFor="resetAdminPwRandom">สุ่มรหัสผ่านใหม่ให้อัตโนมัติ</label>
            </div>
            <div className="form-check mb-2">
              <input className="form-check-input" type="radio" name="resetAdminPwMode" id="resetAdminPwCustom"
                checked={resetPwMode === 'custom'} onChange={() => setResetPwMode('custom')} />
              <label className="form-check-label small" htmlFor="resetAdminPwCustom">ตั้งรหัสผ่านใหม่เอง</label>
            </div>
            {resetPwMode === 'custom' && (
              <input className="form-control form-control-sm mb-3" placeholder="อย่างน้อย 6 ตัวอักษร"
                value={resetCustomPw} onChange={(e) => setResetCustomPw(e.target.value)} />
            )}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setResetTarget(null)}>ยกเลิก</button>
              <button type="submit" className="btn it-btn-primary" disabled={busyId === resetTarget.id}>ยืนยันรีเซ็ตรหัสผ่าน</button>
            </div>
          </form>
        </ModalShell>
      )}

      {confirmDelete && (
        <ModalShell title="ยืนยันการลบบัญชี" onClose={() => setConfirmDelete(null)}>
          <p>ต้องการลบบัญชี &quot;{confirmDelete.full_name}&quot; ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setConfirmDelete(null)}>ยกเลิก</button>
            <button className="btn btn-danger" onClick={del} disabled={busyId === confirmDelete.id}>ยืนยันลบ</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({ title, children, onClose, size }) {
  return (
    <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }} tabIndex={-1}>
      <div className={`modal-dialog modal-dialog-centered ${size === 'lg' ? 'modal-lg' : ''}`}>
        <div className="modal-content it-card">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-semibold">{title}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
