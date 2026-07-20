'use client';

import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import EmptyState from '@/components/EmptyState';

export default function VotersSection({ token }) {
  const { showToast } = useToast();
  const [voters, setVoters] = useState(null);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ student_id: '', full_name: '', program: '' });
  const [pwMode, setPwMode] = useState('random'); // 'random' | 'custom'
  const [customPw, setCustomPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastCredential, setLastCredential] = useState(null);
  const [importCredentials, setImportCredentials] = useState(null);
  const [editVoter, setEditVoter] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', program: '', is_active: true });
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPwMode, setResetPwMode] = useState('random');
  const [resetCustomPw, setResetCustomPw] = useState('');
  const [resetResult, setResetResult] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // สะสมรายการ username/รหัสผ่านที่ระบบสร้าง/สุ่มให้ในเซสชันนี้ทั้งหมด สำหรับดาวน์โหลดแจกจ่าย
  const [credentialLog, setCredentialLog] = useState([]);
  const fileRef = useRef(null);

  function load() {
    apiFetch('/api/admin/voters', { token }).then((d) => { setVoters(d.voters); setStats(d.stats); }).catch(() => setVoters([]));
  }
  useEffect(load, [token]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.student_id || !form.full_name) {
      showToast('กรุณากรอกรหัสนักศึกษาและชื่อ-นามสกุล', 'danger');
      return;
    }
    if (pwMode === 'custom' && customPw.length < 6) {
      showToast('รหัสผ่านที่ตั้งเองต้องมีอย่างน้อย 6 ตัวอักษร', 'danger');
      return;
    }
    setBusy(true);
    try {
      const body = { ...form };
      if (pwMode === 'custom') body.password = customPw;
      const data = await apiFetch('/api/admin/voters', { method: 'POST', token, body });
      showToast('เพิ่มผู้มีสิทธิ์สำเร็จ', 'success');
      setLastCredential(data.voter);
      setCredentialLog((log) => [...log, {
        student_id: form.student_id, full_name: form.full_name,
        username: data.voter.username, password: data.voter.tempPassword,
      }]);
      setForm({ student_id: '', full_name: '', program: '' });
      setCustomPw('');
      setPwMode('random');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        const voters = rows.map((r) => ({
          student_id: String(r.student_id ?? r['รหัสนักศึกษา'] ?? '').trim(),
          full_name: String(r.full_name ?? r['ชื่อ-นามสกุล'] ?? r['ชื่อ_นามสกุล'] ?? '').trim(),
          program: String(r.program ?? r['สาขา'] ?? r['ระดับชั้น'] ?? '').trim(),
        })).filter((v) => v.student_id && v.full_name);

        if (voters.length === 0) {
          showToast('ไม่พบข้อมูลที่นำเข้าได้ ตรวจสอบหัวคอลัมน์ (student_id, full_name, program)', 'danger');
          return;
        }

        setBusy(true);
        const data = await apiFetch('/api/admin/voters/bulk-import', { method: 'POST', token, body: { voters } });
        showToast(data.message, 'success');
        setImportCredentials(data.credentials);
        setCredentialLog((log) => [
          ...log,
          ...data.credentials.map((c) => ({
            student_id: c.student_id,
            full_name: voters.find((v) => v.student_id === c.student_id)?.full_name || '',
            username: c.username, password: c.tempPassword,
          })),
        ]);
        load();
      } catch (err) {
        showToast(err.message || 'นำเข้าไฟล์ล้มเหลว', 'danger');
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  }

  function downloadSampleCsv() {
    const csv = 'student_id,full_name,program\n64010001,สมชาย ใจดี,ปวช.3 เทคโนโลยีสารสนเทศ\n64010002,สมหญิง รักเรียน,ปวส.1 เทคโนโลยีสารสนเทศ\n';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ตัวอย่างรายชื่อผู้มีสิทธิ์.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCredentialLog() {
    if (credentialLog.length === 0) {
      showToast('ยังไม่มีรายการรหัสผ่านที่สร้างไว้ในเซสชันนี้ ลองเพิ่มรายชื่อหรือรีเซ็ตรหัสผ่านก่อน', 'danger');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(credentialLog.map((c) => ({
      'รหัสนักศึกษา': c.student_id,
      'ชื่อ-นามสกุล': c.full_name,
      'ชื่อผู้ใช้ (Username)': c.username,
      'รหัสผ่าน': c.password,
    })));
    ws['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'บัญชีผู้มีสิทธิ์');
    XLSX.writeFile(wb, `รหัสผ่านผู้มีสิทธิ์-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function confirmDelete() {
    try {
      await apiFetch(`/api/admin/voters/${deleteTarget.id}`, { method: 'DELETE', token });
      showToast('ลบรายชื่อสำเร็จ', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  function openEdit(v) {
    setEditVoter(v);
    setEditForm({ full_name: v.full_name, program: v.program || '', is_active: !!v.is_active });
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      await apiFetch(`/api/admin/voters/${editVoter.id}`, { method: 'PATCH', token, body: editForm });
      showToast('แก้ไขข้อมูลสำเร็จ', 'success');
      setEditVoter(null);
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  function openReset(v) {
    setResetTarget(v);
    setResetPwMode('random');
    setResetCustomPw('');
  }

  async function submitReset(e) {
    e.preventDefault();
    if (resetPwMode === 'custom' && resetCustomPw.length < 6) {
      showToast('รหัสผ่านที่ตั้งเองต้องมีอย่างน้อย 6 ตัวอักษร', 'danger');
      return;
    }
    try {
      const body = resetPwMode === 'custom' ? { password: resetCustomPw } : undefined;
      const data = await apiFetch(`/api/admin/voters/${resetTarget.id}/reset-password`, { method: 'POST', token, body });
      setResetResult(data.voter);
      setCredentialLog((log) => [...log, {
        student_id: resetTarget.student_id, full_name: resetTarget.full_name,
        username: data.voter.username, password: data.voter.tempPassword,
      }]);
      showToast('รีเซ็ตรหัสผ่านสำเร็จ', 'success');
      setResetTarget(null);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  const filtered = voters?.filter((v) =>
    !search || v.full_name.includes(search) || v.student_id.includes(search)
  ) || [];

  return (
    <div className="it-fade-in">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>จัดการผู้มีสิทธิ์เลือกตั้ง</h3>
          <p className="text-secondary mb-3">
            จำนวนผู้มีสิทธิ์ปัจจุบัน (คำนวณสด): <strong>{stats ? stats.totalVoters.toLocaleString('th-TH') : '...'}</strong> คน
          </p>
        </div>
        <button className="btn btn-outline-primary" onClick={downloadCredentialLog}>
          ⬇ ดาวน์โหลดรายชื่อ+รหัสผ่าน (Excel)
        </button>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <form className="it-card p-3" onSubmit={handleAdd}>
            <h6 className="fw-semibold mb-3">เพิ่มทีละคน</h6>
            <div className="mb-2">
              <label className="form-label small">รหัสนักศึกษา <span className="text-danger">*</span></label>
              <input className="form-control" value={form.student_id}
                onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="form-label small">ชื่อ-นามสกุล <span className="text-danger">*</span></label>
              <input className="form-control" value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="mb-3">
              <label className="form-label small">สาขา/ระดับชั้น</label>
              <input className="form-control" value={form.program}
                onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))} />
            </div>

            <div className="mb-3 p-2 rounded" style={{ background: '#f0f7ff' }}>
              <div className="small fw-semibold mb-1">รหัสผ่านบัญชี</div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="pwMode" id="pwRandom"
                  checked={pwMode === 'random'} onChange={() => setPwMode('random')} />
                <label className="form-check-label small" htmlFor="pwRandom">สุ่มรหัสผ่านให้อัตโนมัติ (แนะนำ)</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="pwMode" id="pwCustom"
                  checked={pwMode === 'custom'} onChange={() => setPwMode('custom')} />
                <label className="form-check-label small" htmlFor="pwCustom">ตั้งรหัสผ่านเอง</label>
              </div>
              {pwMode === 'custom' && (
                <input className="form-control form-control-sm mt-2" placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={customPw} onChange={(e) => setCustomPw(e.target.value)} />
              )}
            </div>

            <button className="btn it-btn-primary w-100" disabled={busy}>เพิ่มรายชื่อ</button>
            {lastCredential && (
              <div className="alert alert-success small mt-3 mb-0">
                สร้างบัญชีสำเร็จ — Username: <strong>{lastCredential.username}</strong>, รหัสผ่านชั่วคราว: <strong>{lastCredential.tempPassword}</strong>
                <br />กด &quot;ดาวน์โหลดรายชื่อ+รหัสผ่าน&quot; ด้านบนเพื่อเก็บไฟล์ไว้แจกจ่าย
              </div>
            )}
          </form>
        </div>

        <div className="col-md-6">
          <div className="it-card p-3 h-100">
            <h6 className="fw-semibold mb-3">นำเข้าจากไฟล์ Excel/CSV</h6>
            <p className="small text-secondary">คอลัมน์ที่ต้องมี: <code>student_id</code>, <code>full_name</code>, <code>program</code></p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="form-control mb-2" onChange={handleFile} disabled={busy} />
            <button className="btn btn-sm btn-outline-primary" type="button" onClick={downloadSampleCsv}>
              ดาวน์โหลดไฟล์ตัวอย่าง
            </button>
            <p className="small text-muted mt-2 mb-0">การนำเข้าแบบไฟล์จะสุ่มรหัสผ่านให้ทุกคนอัตโนมัติเสมอ (ตั้งเองทีละคนไม่ได้ในโหมดนี้)</p>
            {importCredentials && importCredentials.length > 0 && (
              <div className="alert alert-info small mt-3 mb-0">
                นำเข้าสำเร็จ {importCredentials.length} รายชื่อ — บัญชี/รหัสผ่านชั่วคราวถูกสร้างให้แต่ละคนแล้ว
                <br />กด &quot;ดาวน์โหลดรายชื่อ+รหัสผ่าน&quot; ด้านบนเพื่อเก็บไฟล์ไว้แจกจ่ายทันที (ดูรหัสซ้ำอีกไม่ได้แล้วหลังจากนี้)
              </div>
            )}
          </div>
        </div>
      </div>

      {resetResult && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <span>
            รีเซ็ตรหัสผ่านของ <strong>{resetResult.username}</strong> แล้ว รหัสผ่านใหม่: <strong>{resetResult.tempPassword}</strong>
          </span>
          <button className="btn btn-sm btn-outline-warning" onClick={() => setResetResult(null)}>ปิด</button>
        </div>
      )}

      <input
        className="form-control mb-3" placeholder="ค้นหาชื่อหรือรหัสนักศึกษา..."
        value={search} onChange={(e) => setSearch(e.target.value)}
      />

      {voters === null && <div className="it-skeleton" style={{ height: 200 }} />}
      {voters && voters.length === 0 && <EmptyState icon="📋" title="ยังไม่มีรายชื่อผู้มีสิทธิ์" />}

      {voters && voters.length > 0 && (
        <div className="it-card p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr><th>รหัส นศ.</th><th>ชื่อ-นามสกุล</th><th>สาขา</th><th>สถานะใช้สิทธิ์</th><th>การจัดการ</th></tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>{v.student_id}</td>
                    <td>{v.full_name}</td>
                    <td>{v.program || '-'}</td>
                    <td>
                      {v.has_voted
                        ? <span className="badge it-badge-approved">ใช้สิทธิ์แล้ว</span>
                        : <span className="badge bg-secondary">ยังไม่ใช้สิทธิ์</span>}
                      {!v.is_active && <span className="badge bg-dark ms-1">ปิดใช้งาน</span>}
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap align-items-center">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(v)}>แก้ไข</button>
                        <button className="btn btn-sm btn-outline-primary" disabled={v.has_voted} onClick={() => openReset(v)}>
                          รีเซ็ตรหัสผ่าน
                        </button>
                        <button className="btn btn-sm btn-outline-danger" disabled={v.has_voted} onClick={() => setDeleteTarget(v)}>
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

      {editVoter && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content it-card">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-semibold">แก้ไขข้อมูลผู้มีสิทธิ์</h5>
                <button className="btn-close" onClick={() => setEditVoter(null)} />
              </div>
              <div className="modal-body">
                <form onSubmit={saveEdit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small">รหัสนักศึกษา (แก้ไขไม่ได้)</label>
                      <input className="form-control" value={editVoter.student_id} disabled />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">ชื่อ-นามสกุล</label>
                      <input className="form-control" value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">สาขา/ระดับชั้น</label>
                      <input className="form-control" value={editForm.program}
                        onChange={(e) => setEditForm({ ...editForm, program: e.target.value })} />
                    </div>
                    <div className="col-md-6 d-flex align-items-end">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="voterActive"
                          checked={editForm.is_active}
                          onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
                        <label className="form-check-label" htmlFor="voterActive">เปิดใช้งานบัญชี (ถ้าปิด จะล็อกอินโหวตไม่ได้)</label>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-4">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setEditVoter(null)}>ยกเลิก</button>
                    <button type="submit" className="btn it-btn-primary">บันทึก</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content it-card">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-semibold">รีเซ็ตรหัสผ่าน: {resetTarget.full_name}</h5>
                <button className="btn-close" onClick={() => setResetTarget(null)} />
              </div>
              <div className="modal-body">
                <form onSubmit={submitReset}>
                  <p className="small text-secondary">รหัสผ่านเดิมของบัญชีนี้จะใช้ไม่ได้อีกทันทีหลังยืนยัน</p>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="resetPwMode" id="resetPwRandom"
                      checked={resetPwMode === 'random'} onChange={() => setResetPwMode('random')} />
                    <label className="form-check-label small" htmlFor="resetPwRandom">สุ่มรหัสผ่านใหม่ให้อัตโนมัติ</label>
                  </div>
                  <div className="form-check mb-2">
                    <input className="form-check-input" type="radio" name="resetPwMode" id="resetPwCustom"
                      checked={resetPwMode === 'custom'} onChange={() => setResetPwMode('custom')} />
                    <label className="form-check-label small" htmlFor="resetPwCustom">ตั้งรหัสผ่านใหม่เอง</label>
                  </div>
                  {resetPwMode === 'custom' && (
                    <input className="form-control form-control-sm mb-3" placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={resetCustomPw} onChange={(e) => setResetCustomPw(e.target.value)} />
                  )}
                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setResetTarget(null)}>ยกเลิก</button>
                    <button type="submit" className="btn it-btn-primary">ยืนยันรีเซ็ตรหัสผ่าน</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content it-card p-3">
              <h5 className="fw-semibold">ยืนยันการลบ</h5>
              <p className="text-secondary">ลบรายชื่อ &quot;{deleteTarget.full_name}&quot; ใช่หรือไม่?</p>
              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteTarget(null)}>ยกเลิก</button>
                <button className="btn btn-danger" onClick={confirmDelete}>ยืนยันลบ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
