'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function ElectionSection({ token }) {
  const { showToast } = useToast();
  const [state, setState] = useState(null);
  const [tally, setTally] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [tieWinner, setTieWinner] = useState('');
  const [tieNote, setTieNote] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  function loadState() {
    apiFetch('/api/election/state').then(setState).catch(() => {});
  }
  function loadTally() {
    apiFetch('/api/admin/election/tally', { token }).then(setTally).catch(() => setTally(null));
  }
  useEffect(() => { loadState(); }, []);
  useEffect(() => { if (state?.countingUnlocked) loadTally(); }, [state?.countingUnlocked]);

  async function runAction(path, successMsg) {
    setBusy(true);
    try {
      const data = await apiFetch(path, { method: 'POST', token, body: {} });
      showToast(successMsg, 'success');
      loadState();
      if (state?.countingUnlocked) loadTally();
      return data;
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  }

  async function handleTieResolve() {
    if (!tieWinner) { showToast('กรุณาระบุหมายเลขผู้ชนะที่ตัดสิน', 'danger'); return; }
    setBusy(true);
    try {
      const data = await apiFetch('/api/admin/election/tie-resolve', {
        method: 'POST', token, body: { decided_winner_number: Number(tieWinner), method_note: tieNote },
      });
      showToast(data.message, data.readyToAnnounce ? 'success' : 'warning');
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function handleAnnounce() {
    setBusy(true);
    try {
      const body = tieWinner ? { tie_resolved_winner_number: Number(tieWinner) } : {};
      const data = await apiFetch('/api/admin/election/announce', { method: 'POST', token, body });
      showToast('ประกาศผลอย่างเป็นทางการแล้ว', 'success');
      loadState();
      loadTally();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  }

  function exportResultsToExcel() {
    if (!tally) return;
    const rows = tally.tally.map((t) => ({ 'หมายเลขผู้สมัคร': t.candidateNumber, 'คะแนนเสียง': t.votes }));
    rows.push({ 'หมายเลขผู้สมัคร': 'งดออกเสียง', 'คะแนนเสียง': tally.abstainCount });
    rows.push({});
    rows.push({ 'หมายเลขผู้สมัคร': 'ผู้ตรวจสอบ/รับรองผล', 'คะแนนเสียง': '' });
    rows.push({ 'หมายเลขผู้สมัคร': `ส่งออกเมื่อ ${new Date().toLocaleString('th-TH')}`, 'คะแนนเสียง': '' });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ผลคะแนน');
    XLSX.writeFile(wb, `ผลคะแนนเลือกตั้ง-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function resetElectionData() {
    setResetBusy(true);
    try {
      await apiFetch('/api/admin/election/reset', {
        method: 'POST', token,
        body: { confirm_text: resetConfirmText, password: resetPassword },
      });
      showToast('ล้างข้อมูลรอบเลือกตั้งสำเร็จ พร้อมใช้งานรอบถัดไป', 'success');
      setShowReset(false);
      setResetStep(1);
      setResetConfirmText('');
      setResetPassword('');
      loadState();
      setTally(null);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setResetBusy(false);
    }
  }

  if (!state) return <div className="it-skeleton" style={{ height: 300 }} />;

  return (
    <div className="it-fade-in">
      <h3 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>ควบคุมการเลือกตั้ง</h3>
      <p className="text-secondary mb-4">เปิด/ปิดระบบโหวต ควบคุมการนับคะแนน และประกาศผลอย่างเป็นทางการ</p>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <button
            className="btn it-btn-primary w-100 py-3"
            disabled={busy || state.votingStatus === 'open'}
            onClick={() => setConfirmAction({ type: 'open' })}
          >
            เปิดระบบการโหวต
          </button>
        </div>
        <div className="col-md-4">
          <button
            className="btn btn-outline-danger w-100 py-3"
            disabled={busy || state.votingStatus !== 'open'}
            onClick={() => setConfirmAction({ type: 'close' })}
          >
            ปิดระบบการโหวต
          </button>
        </div>
        <div className="col-md-4">
          <button
            className="btn btn-outline-primary w-100 py-3"
            disabled={busy || state.votingStatus !== 'closed' || state.countingUnlocked}
            onClick={() => setConfirmAction({ type: 'count' })}
          >
            เริ่มนับคะแนน
          </button>
        </div>
      </div>

      <div className="alert alert-secondary small">
        สถานะปัจจุบัน: <strong>{{
          not_started: 'ยังไม่เปิดระบบ', open: 'กำลังเปิดลงคะแนน', closed: 'ปิดระบบโหวตแล้ว',
        }[state.votingStatus]}</strong>
        {state.countingUnlocked && ' · ปลดล็อกโหมดนับคะแนนแล้ว'}
        {state.resultsAnnounced && ' · ประกาศผลอย่างเป็นทางการแล้ว (ล็อกถาวร)'}
      </div>

      {state.resultsAnnounced && (
        <div className="alert alert-success d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
          <span>ประกาศผลอย่างเป็นทางการแล้ว ผลถูกล็อกถาวร ดูรายละเอียดได้ที่หน้า &quot;ประกาศผล&quot; สาธารณะ</span>
          {tally && <button className="btn btn-sm btn-outline-success" onClick={exportResultsToExcel}>📄 Export Excel</button>}
        </div>
      )}

      {state.countingUnlocked && !state.resultsAnnounced && (
        <div className="it-card p-4 mt-3">
          <h6 className="fw-semibold mb-3">ยอดคะแนนแยกเบอร์ (สำหรับกรรมการตรวจสอบภายในเท่านั้น)</h6>
          {tally ? (
            <>
              <table className="table table-sm">
                <thead><tr><th>เบอร์</th><th>คะแนน</th></tr></thead>
                <tbody>
                  {tally.tally.map((t) => (
                    <tr key={t.candidateNumber}><td>{t.candidateNumber}</td><td>{t.votes}</td></tr>
                  ))}
                  <tr className="text-muted"><td>งดออกเสียง</td><td>{tally.abstainCount}</td></tr>
                </tbody>
              </table>

              {tally.isTie ? (
                <div className="alert alert-warning">
                  <strong>คะแนนเสมอกัน — รอการตัดสินจากกรรมการ</strong>
                  <div className="mt-2 d-flex gap-2 flex-wrap">
                    <input className="form-control" style={{ maxWidth: 160 }} placeholder="เบอร์ที่ตัดสิน"
                      value={tieWinner} onChange={(e) => setTieWinner(e.target.value)} />
                    <input className="form-control" placeholder="วิธีตัดสิน เช่น จับสลาก"
                      value={tieNote} onChange={(e) => setTieNote(e.target.value)} />
                    <button className="btn btn-warning" disabled={busy} onClick={handleTieResolve}>
                      ยืนยันผล (ต้องมีกรรมการ 2 ท่าน)
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-success small">ผู้ชนะเบื้องต้น: เบอร์ {tally.winner?.candidateNumber} ({tally.winner?.votes} คะแนน)</p>
              )}

              <div className="d-flex gap-2 mt-2">
                <button
                  className="btn it-btn-primary flex-grow-1 py-2"
                  disabled={busy}
                  onClick={() => setConfirmAction({ type: 'announce' })}
                >
                  ประกาศผลอย่างเป็นทางการ
                </button>
                <button className="btn btn-outline-secondary" onClick={exportResultsToExcel}>
                  📄 Export Excel
                </button>
              </div>
            </>
          ) : <div className="it-skeleton" style={{ height: 100 }} />}
        </div>
      )}

      {confirmAction && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content it-card p-3">
              <h5 className="fw-semibold">ยืนยันการดำเนินการ</h5>
              <p className="text-secondary">
                {confirmAction.type === 'open' && 'ยืนยันเปิดระบบการโหวตหรือไม่?'}
                {confirmAction.type === 'close' && 'ยืนยันปิดระบบการโหวตหรือไม่? หลังปิดแล้วผู้มีสิทธิ์จะโหวตไม่ได้อีก'}
                {confirmAction.type === 'count' && 'ยืนยันเริ่มนับคะแนนหรือไม่?'}
                {confirmAction.type === 'announce' && 'ยืนยันประกาศผลอย่างเป็นทางการหรือไม่? หลังประกาศแล้วผลจะถูกล็อกถาวร ไม่สามารถแก้ไขได้'}
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button className="btn btn-outline-secondary" onClick={() => setConfirmAction(null)}>ยกเลิก</button>
                <button
                  className="btn it-btn-primary"
                  disabled={busy}
                  onClick={() => {
                    if (confirmAction.type === 'open') runAction('/api/admin/election/open', 'เปิดระบบการโหวตแล้ว');
                    if (confirmAction.type === 'close') runAction('/api/admin/election/close', 'ปิดระบบการโหวตแล้ว');
                    if (confirmAction.type === 'count') runAction('/api/admin/election/start-counting', 'เริ่มนับคะแนนแล้ว');
                    if (confirmAction.type === 'announce') handleAnnounce();
                  }}
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="it-card p-3 mt-4 border border-danger-subtle">
        <h6 className="fw-semibold text-danger mb-2">⚠️ โซนอันตราย</h6>
        <p className="small text-secondary mb-2">
          ล้างข้อมูลผู้สมัคร รายชื่อผู้มีสิทธิ์ คะแนนเสียง และสถานะการเลือกตั้งทั้งหมด เพื่อเตรียมใช้ระบบนี้สำหรับการเลือกตั้งรอบถัดไป (เช่น ปีการศึกษาถัดไป)
          บัญชีผู้ดูแลระบบจะยังคงอยู่ไม่ถูกลบ
        </p>
        <button className="btn btn-outline-danger btn-sm" onClick={() => { setShowReset(true); setResetStep(1); }}>
          ล้างข้อมูลเพื่อใช้รอบถัดไป
        </button>
      </div>

      {showReset && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content it-card p-3">
              {resetStep === 1 && (
                <>
                  <h5 className="fw-semibold text-danger">ขั้นตอนที่ 1: ยืนยันล้างข้อมูลรอบเลือกตั้ง</h5>
                  <p className="text-secondary small">
                    การกระทำนี้จะลบ <strong>ผู้สมัครทั้งหมด, รายชื่อผู้มีสิทธิ์ทั้งหมด, คะแนนเสียงทั้งหมด</strong> และรีเซ็ตสถานะการเลือกตั้งกลับไปเริ่มต้นใหม่
                    <strong> ไม่สามารถย้อนกลับได้</strong> พิมพ์ข้อความด้านล่างให้ตรงเพื่อยืนยัน:
                  </p>
                  <p className="fw-bold text-center">&quot;ล้างข้อมูลเลือกตั้ง&quot;</p>
                  <input
                    className="form-control mb-2"
                    placeholder="พิมพ์ข้อความยืนยันที่นี่"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                  />
                  <p className="small text-secondary mb-3">
                    📋 หมายเหตุ: <strong>ประวัติการทำงาน (Audit log) จะไม่ถูกลบ</strong> ไม่ว่ากรณีใด เพื่อรักษาความโปร่งใสและตรวจสอบย้อนหลังได้เสมอ
                  </p>
                  <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => { setShowReset(false); setResetConfirmText(''); }}>ยกเลิก</button>
                    <button
                      className="btn btn-danger"
                      disabled={resetConfirmText !== 'ล้างข้อมูลเลือกตั้ง'}
                      onClick={() => setResetStep(2)}
                    >
                      ถัดไป
                    </button>
                  </div>
                </>
              )}

              {resetStep === 2 && (
                <>
                  <h5 className="fw-semibold text-danger">ขั้นตอนที่ 2: ยืนยันตัวตนอีกชั้น</h5>
                  <p className="text-secondary small">
                    เพื่อป้องกันการกดผิดพลาด กรุณากรอกรหัสผ่านบัญชีผู้ดูแลระบบของคุณเองอีกครั้งก่อนดำเนินการล้างข้อมูลถาวร
                  </p>
                  <label className="form-label small">รหัสผ่านของคุณ</label>
                  <input
                    type="password"
                    className="form-control mb-3"
                    placeholder="รหัสผ่านของคุณ"
                    autoFocus
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                  />
                  <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => setResetStep(1)}>ย้อนกลับ</button>
                    <button
                      className="btn btn-danger"
                      disabled={resetBusy || !resetPassword}
                      onClick={resetElectionData}
                    >
                      ยืนยันล้างข้อมูลถาวร
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
