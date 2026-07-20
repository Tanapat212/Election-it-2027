'use client';

import { useEffect, useState } from 'react';
import SiteNavbar from '@/components/SiteNavbar';
import SiteFooter from '@/components/SiteFooter';
import CandidateCard from '@/components/CandidateCard';
import EmptyState from '@/components/EmptyState';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState(null);

  useEffect(() => {
    let mounted = true;
    apiFetch('/api/candidates')
      .then((data) => mounted && setCandidates(data.candidates))
      .catch(() => mounted && setCandidates([]));

    const socket = getSocket();
    const onUpdate = (data) => setCandidates(data.candidates);
    socket.on('candidates:update', onUpdate);
    return () => {
      mounted = false;
      socket.off('candidates:update', onUpdate);
    };
  }, []);

  return (
    <>
      <SiteNavbar />
      <div className="container py-5">
        <h2 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>
          รายชื่อผู้สมัครที่ผ่านการอนุมัติ
        </h2>
        <p className="text-secondary mb-4">รายชื่อทั้งหมดอัปเดตอัตโนมัติแบบเรียลไทม์</p>

        {candidates === null && (
          <div className="row g-4">
            {[1, 2, 3].map((i) => (
              <div className="col-md-4" key={i}>
                <div className="it-skeleton" style={{ height: 340, width: '100%' }} />
              </div>
            ))}
          </div>
        )}

        {candidates && candidates.length === 0 && (
          <EmptyState icon="🗳️" title="ยังไม่มีผู้สมัครที่ผ่านการอนุมัติ" subtitle="กรุณากลับมาตรวจสอบอีกครั้งภายหลัง" />
        )}

        {candidates && candidates.length > 0 && (
          <div className="row g-4">
            {candidates.map((c) => (
              <div className="col-md-4" key={c.id}>
                <CandidateCard candidate={c} />
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </>
  );
}
