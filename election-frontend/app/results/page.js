'use client';

import { useEffect, useState } from 'react';
import SiteNavbar from '@/components/SiteNavbar';
import SiteFooter from '@/components/SiteFooter';
import EmptyState from '@/components/EmptyState';
import { apiFetch } from '@/lib/api';
import { useAuthedImage } from '@/lib/useAuthedImage';
import { getSocket } from '@/lib/socket';

export default function ResultsPage() {
  const [results, setResults] = useState(undefined); // undefined=loading, null=not announced
  const [candidatesMeta, setCandidatesMeta] = useState([]);
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    apiFetch('/api/results').then(setResults).catch(() => setResults(null));
    apiFetch('/api/candidates').then((d) => setCandidatesMeta(d.candidates)).catch(() => {});
    apiFetch('/api/election/state').then((s) => setEventTitle(s.eventTitle || '')).catch(() => {});

    const socket = getSocket();
    const onResults = (data) => setResults(data);
    const onElectionState = (data) => {
      if (typeof data.eventTitle === 'string') setEventTitle(data.eventTitle);
    };
    socket.on('results:announced', onResults);
    socket.on('election:state', onElectionState);
    return () => {
      socket.off('results:announced', onResults);
      socket.off('election:state', onElectionState);
    };
  }, []);

  function nameFor(num) {
    return candidatesMeta.find((c) => c.candidate_number === num)?.full_name || `เบอร์ ${num}`;
  }
  const winnerPhotoPath = candidatesMeta.find((c) => c.candidate_number === results?.winner?.candidateNumber)?.photo_path || null;
  const winnerPhotoUrl = useAuthedImage(winnerPhotoPath);

  const chartBars = results
    ? [
        ...results.tally.map((t) => ({
          label: `เบอร์ ${t.candidateNumber} · ${nameFor(t.candidateNumber)}`,
          votes: t.votes,
          isWinner: !results.isTie && t.candidateNumber === results.winner?.candidateNumber,
          isAbstain: false,
        })),
        { label: 'งดออกเสียง', votes: results.abstainCount, isWinner: false, isAbstain: true },
      ]
    : [];
  const maxVotes = Math.max(1, ...chartBars.map((b) => b.votes));

  return (
    <>
      <SiteNavbar />
      <div className="container py-5">
        <h2 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>ประกาศผลการเลือกตั้งอย่างเป็นทางการ</h2>
        {eventTitle && (
          <p className="fw-semibold mb-1" style={{ color: 'var(--it-blue)' }}>{eventTitle}</p>
        )}
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
                {winnerPhotoUrl && (
                  <img
                    src={winnerPhotoUrl} alt=""
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

            <div className="it-card p-4 mb-4 it-fade-in">
              <h6 className="fw-semibold mb-3">กราฟสรุปคะแนน</h6>
              <div className="d-flex flex-column gap-3">
                {chartBars.map((b) => (
                  <div key={b.label}>
                    <div className="d-flex justify-content-between mb-1">
                      <span className={`small ${b.isAbstain ? 'text-muted' : 'fw-semibold'}`}>
                        {b.isWinner && '🏆 '}{b.label}
                      </span>
                      <span className="small fw-semibold">{b.votes} เสียง</span>
                    </div>
                    <div style={{ background: 'var(--it-blue-light)', borderRadius: 999, height: 14, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(b.votes / maxVotes) * 100}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: b.isAbstain
                            ? '#9ca3af'
                            : b.isWinner
                              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                              : 'var(--it-blue)',
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
