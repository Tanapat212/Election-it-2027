'use client';

import { useEffect, useState } from 'react';
import TurnoutWidget from '@/components/TurnoutWidget';
import { apiFetch } from '@/lib/api';

const STATUS_LABEL = {
  not_started: { text: 'ยังไม่เปิดระบบ', cls: 'secondary' },
  open: { text: 'กำลังเปิดลงคะแนน', cls: 'success' },
  closed: { text: 'ปิดระบบโหวตแล้ว', cls: 'danger' },
};

export default function DashboardSection({ token }) {
  const [state, setState] = useState(null);
  const [voterCount, setVoterCount] = useState(null);
  const [candidateCount, setCandidateCount] = useState(null);

  useEffect(() => {
    apiFetch('/api/election/state').then(setState).catch(() => {});
    apiFetch('/api/admin/voters', { token }).then((d) => setVoterCount(d.voters.length)).catch(() => {});
    apiFetch('/api/admin/candidates', { token })
      .then((d) => setCandidateCount(d.candidates.filter((c) => c.status === 'approved').length))
      .catch(() => {});
  }, [token]);

  const status = state ? STATUS_LABEL[state.votingStatus] : null;

  return (
    <div className="it-fade-in">
      <h3 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>แดชบอร์ดสรุป</h3>
      <p className="text-secondary mb-4">ภาพรวมของระบบเลือกตั้ง ณ ขณะนี้</p>

      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <TurnoutWidget />
        </div>
        <div className="col-md-3">
          <div className="it-card p-4 h-100">
            <div className="text-muted small mb-1">ผู้สมัครที่อนุมัติแล้ว</div>
            <div className="fs-2 fw-bold" style={{ color: 'var(--it-blue-dark)' }}>
              {candidateCount === null ? <div className="it-skeleton" style={{ height: 32, width: 60 }} /> : candidateCount}
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="it-card p-4 h-100">
            <div className="text-muted small mb-1">สถานะการโหวต</div>
            {status ? (
              <span className={`badge bg-${status.cls} fs-6 mt-1`}>{status.text}</span>
            ) : (
              <div className="it-skeleton" style={{ height: 28, width: 100 }} />
            )}
          </div>
        </div>
      </div>

      <div className="it-card p-4">
        <h6 className="fw-semibold mb-2">หมายเหตุความปลอดภัย</h6>
        <p className="small text-secondary mb-0">
          ระหว่างเปิดโหวต ระบบจะไม่แสดงยอดคะแนนแยกเบอร์ในหน้าใดๆ แม้แต่ Control Election นี้
          ยอดคะแนนแยกเบอร์จะปรากฏในเมนู &quot;ควบคุมการเลือกตั้ง&quot; ก็ต่อเมื่อปิดระบบโหวตและกด &quot;เริ่มนับคะแนน&quot; แล้วเท่านั้น
        </p>
      </div>
    </div>
  );
}
