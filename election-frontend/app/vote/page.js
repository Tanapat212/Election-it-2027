'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteNavbar from '@/components/SiteNavbar';
import SiteFooter from '@/components/SiteFooter';
import CandidateCard from '@/components/CandidateCard';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { getVoterAuth, clearVoterAuth, scheduleAutoLogout } from '@/lib/auth';

export default function VotePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [auth, setAuth] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [electionStatus, setElectionStatus] = useState(null);
  const [selected, setSelected] = useState(null);
  const [abstain, setAbstain] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // เตะออกจากระบบอัตโนมัติทันทีที่ token หมดอายุ (ป้องกันเข้าค้างหน้าโหวตไว้เฉยๆ)
  useEffect(() => {
    if (!auth?.token) return;
    const cancel = scheduleAutoLogout(auth.token, () => {
      clearVoterAuth();
      sessionStorage.setItem('it_election_session_message', 'เซสชันหมดเวลาใช้งาน กรุณาเข้าสู่ระบบใหม่เพื่อลงคะแนน');
      router.replace('/voter-login');
    });
    return cancel;
  }, [auth, router]);

  useEffect(() => {
    const a = getVoterAuth();
    if (!a) {
      router.replace('/voter-login');
      return;
    }
    setAuth(a);

    Promise.all([
      apiFetch('/api/candidates'),
      apiFetch('/api/election/state'),
    ]).then(([c, s]) => {
      setCandidates(c.candidates);
      setElectionStatus(s.votingStatus);
    }).catch(() => setCandidates([]));
  }, [router]);

  function handleSelect(c) {
    setSelected(c);
    setAbstain(false);
  }

  function handleAbstain() {
    setAbstain(true);
    setSelected(null);
  }

  async function confirmVote() {
    setSubmitting(true);
    try {
      const data = await apiFetch('/api/voting/cast', {
        method: 'POST',
        token: auth.token,
        body: abstain
          ? { abstain: true }
          : { candidate_number: selected.candidate_number },
      });
      clearVoterAuth();
      // หมายเหตุ: เสียงแจ้งเตือนจะเล่นแค่ครั้งเดียวที่หน้า /vote-success เท่านั้น
      // (เดิมเล่นซ้ำสองรอบทั้งหน้านี้และหน้า vote-success ทำให้เสียงซ้อนกัน)
      router.push('/vote-success');
    } catch (err) {
      showToast(err.message, 'danger');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!auth) return null;

  return (
    <>
      <SiteNavbar />
      <div className="container py-5">
        <h2 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>ลงคะแนนเสียงเลือกตั้ง</h2>
        <p className="text-secondary mb-4">สวัสดีคุณ {auth.voter.fullName} — เลือกผู้สมัคร 1 เบอร์ หรือกดงดออกเสียง</p>

        {electionStatus && electionStatus !== 'open' && (
          <div className="alert alert-warning">ขณะนี้ไม่อยู่ในช่วงเวลาเปิดลงคะแนนเสียง</div>
        )}

        {candidates === null && (
          <div className="row g-4">
            {[1, 2, 3].map((i) => <div className="col-md-4" key={i}><div className="it-skeleton" style={{ height: 340 }} /></div>)}
          </div>
        )}

        {candidates && candidates.length === 0 && (
          <EmptyState icon="🗳️" title="ยังไม่มีผู้สมัครที่ผ่านการอนุมัติ" />
        )}

        {candidates && candidates.length > 0 && (
          <>
            <div className="row g-4 mb-4">
              {candidates.map((c) => (
                <div className="col-md-4" key={c.id}>
                  <CandidateCard
                    candidate={c}
                    selected={selected?.id === c.id}
                    onSelect={handleSelect}
                    showSelectButton
                  />
                </div>
              ))}
            </div>

            <div className="it-card p-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <button
                type="button"
                className={`btn ${abstain ? 'it-btn-primary' : 'btn-outline-secondary'}`}
                onClick={handleAbstain}
              >
                {abstain ? '✓ งดออกเสียง (เลือกแล้ว)' : 'งดออกเสียง / โหวตโน'}
              </button>
              <button
                type="button"
                className="btn it-btn-primary px-4"
                disabled={(!selected && !abstain) || electionStatus !== 'open'}
                onClick={() => setShowConfirm(true)}
              >
                ยืนยันการโหวต
              </button>
            </div>
          </>
        )}
      </div>

      {showConfirm && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content it-card">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-semibold">ยืนยันการลงคะแนน</h5>
              </div>
              <div className="modal-body">
                <p className="mb-1">คุณกำลังจะลงคะแนนให้:</p>
                <h5 className="fw-bold" style={{ color: 'var(--it-blue-dark)' }}>
                  {abstain ? 'งดออกเสียง / โหวตโน' : `เบอร์ ${selected.candidate_number} — ${selected.full_name}`}
                </h5>
                <p className="text-danger small mt-2 mb-0">
                  หลังยืนยันแล้วจะไม่สามารถแก้ไขหรือโหวตซ้ำได้อีก
                </p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary" onClick={() => setShowConfirm(false)} disabled={submitting}>
                  ยกเลิก
                </button>
                <button className="btn it-btn-primary" onClick={confirmVote} disabled={submitting}>
                  {submitting ? 'กำลังบันทึก...' : 'ยืนยันส่งคะแนน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </>
  );
}
