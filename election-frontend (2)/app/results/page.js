'use client';

import { useEffect, useState } from 'react';
import SiteNavbar from '@/components/SiteNavbar';
import SiteFooter from '@/components/SiteFooter';
import EmptyState from '@/components/EmptyState';
import { apiFetch, API_URL } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function ResultsPage() {
  const [results, setResults] = useState(undefined); // undefined=loading, null=not announced
  const [candidatesMeta, setCandidatesMeta] = useState([]);

  useEffect(() => {
    apiFetch('/api/results').then(setResults).catch(() => setResults(null));
    apiFetch('/api/candidates').then((d) => setCandidatesMeta(d.candidates)).catch(() => {});

    const socket = getSocket();
    const onResults = (data) => setResults(data);
    socket.on('results:announced', onResults);
    return () => socket.off('results:announced', onResults);
  }, []);

  function nameFor(num) {
    return candidatesMeta.find((c) => c.candidate_number === num)?.full_name || `เบอร์ ${num}`;
  }
  function photoFor(num) {
    const p = candidatesMeta.find((c) => c.candidate_number === num)?.photo_path;
    return p ? `${API_URL}${p}` : null;
  }

  return (
    <>
      <SiteNavbar />
      <div className="container py-5">
        <h2 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>ประกาศผลการเลือกตั้งอย่างเป็นทางการ</h2>
        <p className="text-secondary mb-4">ผลการเลือกตั้งประธานนักเรียน/นักศึกษา แผนกเทคโนโลยีสารสนเทศ</p>

        {results === undefined && <div className="it-skeleton" style={{ height: 300 }} />}

        {results === null && (
          <EmptyState icon="⏳" title="ยังไม่มีการประกาศผลอย่างเป็นทางการ" subtitle="กรุณากลับมาตรวจสอบอีกครั้งหลังปิดการนับคะแนน" />
        )}

        {results && (
          <>
            {results.isTie ? (
              <div className="alert alert-warning it-fade-in">
                <strong>คะแนนเสมอกัน</strong> — ผลการตัดสินจากกรรมการจะประกาศในภายหลัง
              </div>
            ) : (
              <div className="it-card p-4 mb-4 text-center it-fade-in" style={{ background: 'linear-gradient(135deg, #fffbeb, #fff)' }}>
                <div className="fs-1 mb-2">🏆</div>
                {photoFor(results.winner?.candidateNumber) && (
                  <img
                    src={photoFor(results.winner?.candidateNumber)} alt=""
                    style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: '50%', border: '4px solid #fbbf24' }}
                    className="mb-3"
                  />
                )}
                <h3 className="fw-bold" style={{ color: 'var(--it-blue-dark)' }}>
                  {nameFor(results.winner?.candidateNumber)}
                </h3>
                <p className="text-secondary mb-0">
                  ได้รับเลือกตั้งเป็นประธานนักเรียน นักศึกษา แผนกเทคโนโลยีสารสนเทศ ด้วยคะแนน {results.winner?.votes ?? '-'} เสียง
                </p>
              </div>
            )}

            <div className="it-card p-4 it-fade-in">
              <h6 className="fw-semibold mb-3">คะแนนแยกเบอร์ทั้งหมด</h6>
              <table className="table">
                <thead><tr><th>เบอร์</th><th>ชื่อ-นามสกุล</th><th>คะแนน</th></tr></thead>
                <tbody>
                  {results.tally.map((t) => (
                    <tr key={t.candidateNumber}>
                      <td>{t.candidateNumber}</td>
                      <td>{nameFor(t.candidateNumber)}</td>
                      <td>{t.votes}</td>
                    </tr>
                  ))}
                  <tr className="text-muted">
                    <td colSpan={2}>งดออกเสียง</td>
                    <td>{results.abstainCount}</td>
                  </tr>
                </tbody>
              </table>
              <p className="small text-muted mb-0">
                ประกาศผลเมื่อ {results.announcedAt ? new Date(results.announcedAt).toLocaleString('th-TH') : '-'}
              </p>
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </>
  );
}
