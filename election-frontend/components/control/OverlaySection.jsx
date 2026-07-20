'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

const GROUP_A = [
  { key: 'countdown', label: 'ฉากรอเริ่มงาน (นับถอยหลัง)', icon: '⏳' },
  { key: 'candidate_carousel', label: 'ฉากแนะนำผู้สมัคร', icon: '🧑‍🎓' },
  { key: 'turnout', label: 'ฉากแสดง % ผู้มาใช้สิทธิ์', icon: '📊' },
  { key: 'blank', label: 'ฉากว่าง', icon: '⬛' },
];
const GROUP_B = [
  { key: 'final_results', label: 'ฉากสรุปคะแนน', icon: '📈' },
  { key: 'winner_announcement', label: 'ฉากประกาศผู้ชนะ', icon: '🏆' },
];

export default function OverlaySection({ token }) {
  const { showToast } = useToast();
  const [electionState, setElectionState] = useState(null);
  const [overlayState, setOverlayState] = useState(null);
  const [countdownTarget, setCountdownTarget] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch('/api/election/state').then(setElectionState).catch(() => {});
    apiFetch('/api/overlay/state').then(setOverlayState).catch(() => {});
  }
  useEffect(load, []);

  async function setScene(scene) {
    setBusy(true);
    try {
      await apiFetch('/api/admin/overlay/scene', {
        method: 'POST', token,
        body: { scene, countdown_target_at: scene === 'countdown' && countdownTarget ? countdownTarget : null },
      });
      showToast('เปลี่ยนฉาก Overlay สำเร็จ', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  const unlockedB = electionState?.resultsAnnounced;

  return (
    <div className="it-fade-in">
      <h3 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>ควบคุม Overlay</h3>
      <p className="text-secondary mb-1">รีโมทสลับฉากที่แสดงบนหน้าจอ Overlay แบบเรียลไทม์</p>
      <a href="/overlay" target="_blank" rel="noreferrer" className="small">
        เปิดหน้า Overlay ในแท็บใหม่ (สำหรับฉายขึ้นจอ) ↗
      </a>

      <div className="it-card p-4 mt-3">
        <h6 className="fw-semibold mb-2">กลุ่ม A — ก่อน/ระหว่างเปิดโหวต</h6>
        {overlayState?.current_scene === 'countdown' && (
          <div className="mb-2" style={{ maxWidth: 320 }}>
            <label className="form-label small">เวลาเป้าหมายนับถอยหลัง</label>
            <input type="datetime-local" className="form-control" value={countdownTarget}
              onChange={(e) => setCountdownTarget(e.target.value)} />
          </div>
        )}
        <div className="row g-2">
          {GROUP_A.map((s) => (
            <div className="col-md-6" key={s.key}>
              <button
                className={`btn w-100 text-start ${overlayState?.current_scene === s.key ? 'it-btn-primary' : 'btn-outline-primary'}`}
                disabled={busy}
                onClick={() => setScene(s.key)}
              >
                {s.icon} {s.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="it-card p-4 mt-3">
        <h6 className="fw-semibold mb-2">กลุ่ม B — หลังประกาศผลอย่างเป็นทางการเท่านั้น</h6>
        {!unlockedB && (
          <div className="alert alert-secondary small mb-2">
            ฉากกลุ่มนี้ถูกล็อกไว้ จนกว่าจะกด &quot;ประกาศผลอย่างเป็นทางการ&quot; ในเมนูควบคุมการเลือกตั้ง
          </div>
        )}
        <div className="row g-2">
          {GROUP_B.map((s) => (
            <div className="col-md-6" key={s.key}>
              <button
                className={`btn w-100 text-start ${overlayState?.current_scene === s.key ? 'it-btn-primary' : 'btn-outline-primary'}`}
                disabled={busy || !unlockedB}
                onClick={() => setScene(s.key)}
              >
                {s.icon} {s.label}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
