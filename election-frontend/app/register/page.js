'use client';

import { useState } from 'react';
import SiteNavbar from '@/components/SiteNavbar';
import SiteFooter from '@/components/SiteFooter';
import { useToast } from '@/components/Toast';
import { API_URL } from '@/lib/api';

const emptyMate = { position: '', name: '' };

export default function RegisterPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    full_name: '', student_id: '', program: '', team_name: '', policy_summary: '',
  });
  const [mates, setMates] = useState([{ ...emptyMate }]);
  const [photo, setPhoto] = useState(null);
  const [policyFile, setPolicyFile] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function validateField(name, value) {
    if (name === 'full_name' && !value.trim()) return 'กรุณากรอกชื่อ-นามสกุล';
    if (name === 'student_id' && !/^[0-9]{5,15}$/.test(value)) return 'รหัสนักศึกษาต้องเป็นตัวเลข 5-15 หลัก';
    if (name === 'program' && !value.trim()) return 'กรุณากรอกระดับชั้น/สาขา';
    return '';
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: validateField(name, value) }));
  }

  function updateMate(idx, field, value) {
    setMates((m) => m.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }
  function addMate() {
    setMates((m) => [...m, { ...emptyMate }]);
  }
  function removeMate(idx) {
    setMates((m) => m.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {
      full_name: validateField('full_name', form.full_name),
      student_id: validateField('student_id', form.student_id),
      program: validateField('program', form.program),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
      showToast('กรุณาแก้ไขข้อมูลในฟอร์มให้ถูกต้อง', 'danger');
      return;
    }
    if (!confirmed) {
      showToast('กรุณายืนยันคุณสมบัติผู้สมัครก่อนส่งใบสมัคร', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('running_mates', JSON.stringify(mates.filter((m) => m.name)));
      fd.append('eligibility_confirmed', 'true');
      if (photo) fd.append('photo', photo);
      if (policyFile) fd.append('policy_file', policyFile);

      const res = await fetch(`${API_URL}/api/candidates`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'ส่งใบสมัครไม่สำเร็จ');

      showToast('ส่งใบสมัครสำเร็จ รอการตรวจสอบจากผู้ดูแลระบบ', 'success');
      setDone(true);
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteNavbar />
      <div className="container py-5" style={{ maxWidth: 720 }}>
        <h2 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>ฟอร์มรับสมัครรับเลือกตั้ง</h2>
        <p className="text-secondary mb-4">กรอกข้อมูลให้ครบถ้วน แนบรูปถ่ายและไฟล์นโยบายหาเสียง</p>

        {done ? (
          <div className="it-card p-4 text-center it-fade-in">
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h5 className="fw-semibold mt-2">ส่งใบสมัครสำเร็จแล้ว</h5>
            <p className="text-muted">ทีมงานจะตรวจสอบและแจ้งผลผ่านช่องทางที่ติดต่อได้ กรุณารอสักครู่</p>
          </div>
        ) : (
          <form className="it-card p-4" onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label">ชื่อ-นามสกุล <span className="text-danger">*</span></label>
              <input
                name="full_name" className={`form-control ${errors.full_name ? 'is-invalid' : ''}`}
                value={form.full_name} onChange={handleChange}
              />
              {errors.full_name && <div className="invalid-feedback">{errors.full_name}</div>}
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">รหัสนักศึกษา <span className="text-danger">*</span></label>
                <input
                  name="student_id" className={`form-control ${errors.student_id ? 'is-invalid' : ''}`}
                  value={form.student_id} onChange={handleChange}
                />
                {errors.student_id && <div className="invalid-feedback">{errors.student_id}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">ระดับชั้น/สาขา <span className="text-danger">*</span></label>
                <input
                  name="program" className={`form-control ${errors.program ? 'is-invalid' : ''}`}
                  value={form.program} onChange={handleChange} placeholder="เช่น ปวช.3 เทคโนโลยีสารสนเทศ"
                />
                {errors.program && <div className="invalid-feedback">{errors.program}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">ชื่อทีม/นโยบาย (ถ้ามี)</label>
              <input name="team_name" className="form-control" value={form.team_name} onChange={handleChange} />
            </div>

            <div className="mb-3">
              <label className="form-label">สรุปนโยบายหาเสียงโดยย่อ</label>
              <textarea
                name="policy_summary" className="form-control" rows={3}
                value={form.policy_summary} onChange={handleChange}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">รายชื่อทีมบริหาร (รองประธาน, เลขาฯ ฯลฯ)</label>
              {mates.map((m, idx) => (
                <div className="d-flex gap-2 mb-2" key={idx}>
                  <input
                    className="form-control" placeholder="ตำแหน่ง"
                    value={m.position} onChange={(e) => updateMate(idx, 'position', e.target.value)}
                  />
                  <input
                    className="form-control" placeholder="ชื่อ-นามสกุล"
                    value={m.name} onChange={(e) => updateMate(idx, 'name', e.target.value)}
                  />
                  <button type="button" className="btn btn-outline-danger" onClick={() => removeMate(idx)}>ลบ</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addMate}>+ เพิ่มรายชื่อ</button>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">รูปถ่ายผู้สมัคร</label>
                <input type="file" accept="image/*" className="form-control" onChange={(e) => setPhoto(e.target.files[0])} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">ไฟล์นโยบายหาเสียง (PDF/รูปภาพ)</label>
                <input type="file" accept=".pdf,image/*" className="form-control" onChange={(e) => setPolicyFile(e.target.files[0])} />
              </div>
            </div>

            <div className="form-check mb-4">
              <input
                type="checkbox" className="form-check-input" id="confirmEligibility"
                checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="confirmEligibility">
                ข้าพเจ้าขอยืนยันว่ามีคุณสมบัติครบถ้วนตามระเบียบ (เกรดเฉลี่ยขั้นต่ำตามกำหนด, ไม่ติดโทษวินัย)
              </label>
            </div>

            <button type="submit" className="btn it-btn-primary w-100 py-2" disabled={submitting}>
              {submitting ? 'กำลังส่งใบสมัคร...' : 'ส่งใบสมัคร'}
            </button>
          </form>
        )}
      </div>
      <SiteFooter />
    </>
  );
}
