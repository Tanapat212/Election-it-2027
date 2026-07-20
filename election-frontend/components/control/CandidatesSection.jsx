'use client';

import { useEffect, useState } from 'react';
import { apiFetch, API_URL } from '@/lib/api';
import { useToast } from '@/components/Toast';
import EmptyState from '@/components/EmptyState';

const STATUS_BADGE = {
  pending: 'it-badge-pending',
  approved: 'it-badge-approved',
  rejected: 'it-badge-rejected',
};
const STATUS_TEXT = { pending: 'รอตรวจสอบ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' };

export default function CandidatesSection({ token }) {
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '', student_id: '', program: '', team_name: '', policy_summary: '', candidate_number: '',
  });
  const [addPhoto, setAddPhoto] = useState(null);
  const [addBusy, setAddBusy] = useState(false);

  function load() {
    apiFetch('/api/admin/candidates', { token }).then((d) => setCandidates(d.candidates)).catch(() => setCandidates([]));
  }
  useEffect(load, [token]);

  async function approve(c) {
    setBusyId(c.id);
    try {
      const num = c.candidate_number > 0 ? c.candidate_number : undefined;
      await apiFetch(`/api/admin/candidates/${c.id}/approve`, {
        method: 'PATCH', token, body: num ? { candidate_number: num } : {},
      });
      showToast('อนุมัติผู้สมัครสำเร็จ', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    setBusyId(rejectTarget.id);
    try {
      await apiFetch(`/api/admin/candidates/${rejectTarget.id}/reject`, {
        method: 'PATCH', token, body: { reason: rejectReason },
      });
      showToast('ปฏิเสธใบสมัครแล้ว', 'warning');
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusyId(null);
    }
  }

  async function del() {
    setBusyId(confirmDelete.id);
    try {
      await apiFetch(`/api/admin/candidates/${confirmDelete.id}`, { method: 'DELETE', token });
      showToast('ลบผู้สมัครแล้ว', 'success');
      setConfirmDelete(null);
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusyId(null);
    }
  }

  async function submitAdd(e) {
    e.preventDefault();
    if (!addForm.full_name || !addForm.student_id || !addForm.program) {
      showToast('กรุณากรอกชื่อ-นามสกุล, รหัสนักศึกษา และสาขา/ระดับชั้น', 'danger');
      return;
    }
    setAddBusy(true);
    try {
      const fd = new FormData();
      Object.entries(addForm).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (addPhoto) fd.append('photo', addPhoto);

      const res = await fetch(`${API_URL}/api/admin/candidates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'เพิ่มผู้สมัครไม่สำเร็จ');

      showToast('เพิ่มผู้สมัครสำเร็จ (สถานะอนุมัติแล้วทันที)', 'success');
      setShowAdd(false);
      setAddForm({ full_name: '', student_id: '', program: '', team_name: '', policy_summary: '', candidate_number: '' });
      setAddPhoto(null);
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setAddBusy(false);
    }
  }

  return (
    <div className="it-fade-in">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
        <div>
          <h3 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>จัดการผู้สมัคร</h3>
          <p className="text-secondary mb-4">อนุมัติ ปฏิเสธ หรือลบใบสมัคร</p>
        </div>
        <button className="btn it-btn-primary" onClick={() => setShowAdd(true)}>+ เพิ่มผู้สมัครเอง</button>
      </div>

      {candidates === null && <div className="it-skeleton" style={{ height: 200 }} />}
      {candidates && candidates.length === 0 && <EmptyState icon="🧑‍🎓" title="ยังไม่มีใบสมัคร" />}

      {candidates && candidates.length > 0 && (
        <div className="it-card p-0">
          <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>รูป</th><th>เบอร์</th><th>ชื่อ-นามสกุล</th><th>รหัส นศ.</th><th>สาขา</th><th>สถานะ</th><th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.photo_path ? (
                      <img src={`${API_URL}${c.photo_path}`} alt="" width={40} height={40} style={{ objectFit: 'cover', borderRadius: 8 }} />
                    ) : '—'}
                  </td>
                  <td>{c.candidate_number > 0 ? c.candidate_number : '-'}</td>
                  <td>{c.full_name}</td>
                  <td>{c.student_id}</td>
                  <td>{c.program}</td>
                  <td><span className={`badge ${STATUS_BADGE[c.status]}`}>{STATUS_TEXT[c.status]}</span></td>
                  <td>
                    <div className="d-flex gap-1 flex-wrap align-items-center">
                      {c.status !== 'approved' && (
                        <button className="btn btn-sm btn-success" disabled={busyId === c.id} onClick={() => approve(c)}>อนุมัติ</button>
                      )}
                      {c.status !== 'rejected' && (
                        <button className="btn btn-sm btn-outline-warning" disabled={busyId === c.id} onClick={() => setRejectTarget(c)}>ปฏิเสธ</button>
                      )}
                      <button className="btn btn-sm btn-outline-danger" disabled={busyId === c.id} onClick={() => setConfirmDelete(c)}>ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {rejectTarget && (
        <ModalShell title={`ปฏิเสธใบสมัคร: ${rejectTarget.full_name}`} onClose={() => setRejectTarget(null)}>
          <textarea className="form-control mb-3" rows={3} placeholder="เหตุผล (ถ้ามี)"
            value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setRejectTarget(null)}>ยกเลิก</button>
            <button className="btn btn-warning" onClick={reject} disabled={busyId === rejectTarget.id}>ยืนยันปฏิเสธ</button>
          </div>
        </ModalShell>
      )}

      {confirmDelete && (
        <ModalShell title="ยืนยันการลบผู้สมัคร" onClose={() => setConfirmDelete(null)}>
          <p>ต้องการลบ &quot;{confirmDelete.full_name}&quot; ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary" onClick={() => setConfirmDelete(null)}>ยกเลิก</button>
            <button className="btn btn-danger" onClick={del} disabled={busyId === confirmDelete.id}>ยืนยันลบ</button>
          </div>
        </ModalShell>
      )}
      {showAdd && (
        <ModalShell title="เพิ่มผู้สมัครเอง (อนุมัติทันที)" onClose={() => setShowAdd(false)} size="lg">
          <form onSubmit={submitAdd}>
            <div className="row g-2">
              <div className="col-12">
                <label className="form-label small">ชื่อ-นามสกุล <span className="text-danger">*</span></label>
                <input className="form-control" required value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small">รหัสนักศึกษา <span className="text-danger">*</span></label>
                <input className="form-control" required value={addForm.student_id}
                  onChange={(e) => setAddForm({ ...addForm, student_id: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small">สาขา/ระดับชั้น <span className="text-danger">*</span></label>
                <input className="form-control" required value={addForm.program}
                  onChange={(e) => setAddForm({ ...addForm, program: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small">ทีม/พรรค (ถ้ามี)</label>
                <input className="form-control" value={addForm.team_name}
                  onChange={(e) => setAddForm({ ...addForm, team_name: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label small">เบอร์ผู้สมัคร (เว้นว่าง = เรียงอัตโนมัติ)</label>
                <input className="form-control" type="number" min="1" value={addForm.candidate_number}
                  onChange={(e) => setAddForm({ ...addForm, candidate_number: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label small">นโยบายหาเสียง (สรุปย่อ)</label>
                <textarea className="form-control" rows={3} value={addForm.policy_summary}
                  onChange={(e) => setAddForm({ ...addForm, policy_summary: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label small">รูปถ่าย (ถ้ามี)</label>
                <input className="form-control" type="file" accept="image/*"
                  onChange={(e) => setAddPhoto(e.target.files[0] || null)} />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAdd(false)}>ยกเลิก</button>
              <button type="submit" className="btn it-btn-primary" disabled={addBusy}>เพิ่มผู้สมัคร</button>
            </div>
          </form>
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
