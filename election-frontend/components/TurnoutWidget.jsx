'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function TurnoutWidget({ compact = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiFetch('/api/turnout')
      .then((data) => mounted && setStats(data))
      .catch(() => {})
      .finally(() => mounted && setLoading(false));

    const socket = getSocket();
    const onUpdate = (data) => setStats(data);
    socket.on('turnout:update', onUpdate);
    return () => {
      mounted = false;
      socket.off('turnout:update', onUpdate);
    };
  }, []);

  if (loading) {
    return <div className="it-skeleton" style={{ height: compact ? 60 : 120, width: '100%' }} />;
  }

  if (!stats) return null;

  return (
    <div className={`it-card p-${compact ? 3 : 4} it-fade-in`}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="text-muted small">ผู้มาใช้สิทธิ์เลือกตั้ง</span>
        <span className="badge rounded-pill" style={{ background: 'var(--it-blue-light)' }}>
          สด · Real-time
        </span>
      </div>
      <div className="d-flex align-items-baseline gap-2">
        <span className="fw-bold" style={{ fontSize: compact ? '1.5rem' : '2.25rem', color: 'var(--it-blue-dark)' }}>
          {stats.votedCount.toLocaleString('th-TH')}
        </span>
        <span className="text-muted">/ {stats.totalVoters.toLocaleString('th-TH')} คน</span>
        <span className="fw-semibold ms-auto" style={{ color: 'var(--it-blue)' }}>
          {stats.percentage}%
        </span>
      </div>
      <div className="progress mt-2" style={{ height: 10, borderRadius: 20 }}>
        <div
          className="progress-bar"
          role="progressbar"
          style={{
            width: `${stats.percentage}%`,
            background: 'linear-gradient(90deg, var(--it-blue), var(--it-blue-light))',
          }}
          aria-valuenow={stats.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
