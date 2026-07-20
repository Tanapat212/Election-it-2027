'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFetch, API_URL } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import OverlayBackdrop from './OverlayBackdrop';

export default function CandidateCarouselScene() {
  const [candidates, setCandidates] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    apiFetch('/api/candidates').then((d) => setCandidates(d.candidates)).catch(() => {});
    const socket = getSocket();
    const onUpdate = (d) => setCandidates(d.candidates);
    socket.on('candidates:update', onUpdate);
    return () => socket.off('candidates:update', onUpdate);
  }, []);

  useEffect(() => {
    if (candidates.length === 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % candidates.length), 5000);
    return () => clearInterval(t);
  }, [candidates.length]);

  if (candidates.length === 0) {
    return (
      <div className="overlay-root" style={{ background: 'var(--it-bg)' }}>
        <h2 className="fw-semibold text-secondary">ยังไม่มีผู้สมัครที่ประกาศ</h2>
      </div>
    );
  }

  const c = candidates[index];
  const photoUrl = c.photo_path ? `${API_URL}${c.photo_path}` : null;

  return (
    <div className="overlay-root position-relative" style={{ background: 'linear-gradient(135deg, #4338ca 0%, #7c3aed 35%, #2563eb 70%, #0ea5e9 100%)' }}>
      <OverlayBackdrop variant="colorful" />

      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
        className="position-absolute top-0 start-50 translate-middle-x mt-4 px-4 py-2 d-flex align-items-center gap-2"
        style={{
          background: 'linear-gradient(90deg, #f59e0b, #ec4899)', borderRadius: 999, zIndex: 2,
          boxShadow: '0 10px 30px rgba(236,72,153,0.45)',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>🗳️</span>
        <span className="text-white fw-semibold" style={{ letterSpacing: 1 }}>แนะนำผู้สมัคร</span>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={c.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.5 }}
          className="d-flex flex-column align-items-center text-center px-4 position-relative"
          style={{ maxWidth: 900, zIndex: 1 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-circle mb-4 overflow-hidden d-flex align-items-center justify-content-center"
            style={{
              width: 'clamp(180px, 22vw, 280px)', height: 'clamp(180px, 22vw, 280px)',
              background: photoUrl ? `center/cover no-repeat url(${photoUrl})` : 'linear-gradient(135deg, #fbbf24, #f97316)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.35)', border: '6px solid #fff',
            }}
          >
            {!photoUrl && <span className="text-white fw-bold" style={{ fontSize: '4rem' }}>#{c.candidate_number}</span>}
          </motion.div>

          <motion.span
            className="badge rounded-pill fs-5 px-4 py-2 mb-2"
            style={{ background: 'linear-gradient(90deg, #fbbf24, #f97316)', color: '#1e1b4b' }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          >
            เบอร์ {c.candidate_number}
          </motion.span>
          <motion.h1
            className="fw-bold text-white" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          >
            {c.full_name}
          </motion.h1>
          {c.team_name && <p className="fs-4" style={{ color: '#e0e7ff' }}>ทีม: {c.team_name}</p>}
          {c.policy_summary && (
            <motion.p
              className="fs-5 mt-2" style={{ color: '#e0e7ff' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            >
              {c.policy_summary}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="position-absolute bottom-0 mb-4 d-flex gap-2" style={{ zIndex: 1 }}>
        {candidates.map((_, i) => (
          <span
            key={i}
            style={{
              width: i === index ? 28 : 10, height: 10, borderRadius: 6,
              background: i === index ? 'linear-gradient(90deg, #fbbf24, #f97316)' : 'rgba(255,255,255,0.4)',
              transition: 'all 250ms ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
