'use client';

import { API_URL } from '@/lib/api';

export default function CandidateCard({ candidate, selected, onSelect, showSelectButton = false }) {
  const photoUrl = candidate.photo_path ? `${API_URL}${candidate.photo_path}` : null;
  let runningMates = [];
  try {
    runningMates = candidate.running_mates
      ? (typeof candidate.running_mates === 'string' ? JSON.parse(candidate.running_mates) : candidate.running_mates)
      : [];
  } catch {
    runningMates = [];
  }

  return (
    <div
      className={`it-card h-100 it-fade-in ${selected ? 'border border-3' : ''}`}
      style={selected ? { borderColor: 'var(--it-blue)' } : undefined}
    >
      <div
        style={{
          height: 220,
          background: photoUrl ? `center/cover no-repeat url(${photoUrl})` : 'linear-gradient(135deg, var(--it-blue-light), var(--it-blue))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!photoUrl && (
          <span className="text-white fw-bold" style={{ fontSize: '3rem' }}>
            #{candidate.candidate_number}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <span className="badge rounded-pill" style={{ background: 'var(--it-blue)' }}>
            เบอร์ {candidate.candidate_number}
          </span>
          {candidate.program && <span className="text-muted small">{candidate.program}</span>}
        </div>
        <h5 className="fw-semibold mt-2 mb-1">{candidate.full_name}</h5>
        {candidate.team_name && <div className="text-secondary small mb-2">ทีม: {candidate.team_name}</div>}
        {candidate.policy_summary && (
          <p className="small text-secondary mb-2" style={{ minHeight: 40 }}>
            {candidate.policy_summary.length > 120
              ? candidate.policy_summary.slice(0, 120) + '…'
              : candidate.policy_summary}
          </p>
        )}
        {runningMates.length > 0 && (
          <div className="small text-muted mb-2">
            ทีมบริหาร: {runningMates.map((m) => m.position ? `${m.position} ${m.name || ''}` : (m.raw || m.name)).join(', ')}
          </div>
        )}
        {showSelectButton && (
          <button
            type="button"
            className={`btn w-100 mt-2 ${selected ? 'it-btn-primary' : 'btn-outline-primary'}`}
            onClick={() => onSelect(candidate)}
          >
            {selected ? '✓ เลือกแล้ว' : 'เลือกเบอร์นี้'}
          </button>
        )}
      </div>
    </div>
  );
}
