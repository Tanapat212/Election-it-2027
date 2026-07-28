'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import OverlayBackdrop from './OverlayBackdrop';

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export default function TurnoutScene({ eventTitle }) {
  const [stats, setStats] = useState({ totalVoters: 0, votedCount: 0, percentage: 0 });
  const pulseControls = useAnimation();

  useEffect(() => {
    apiFetch('/api/turnout').then(setStats).catch(() => {});
    const socket = getSocket();
    const onUpdate = (data) => {
      setStats(data);
      pulseControls.start({ scale: [1, 1.08, 1], transition: { duration: 0.5 } });
    };
    socket.on('turnout:update', onUpdate);
    return () => socket.off('turnout:update', onUpdate);
  }, [pulseControls]);

  const animatedVoted = useCountUp(stats.votedCount);
  const animatedPct = useCountUp(stats.percentage);
  const circumference = 2 * Math.PI * 120;
  const offset = circumference - (Math.min(animatedPct, 100) / 100) * circumference;

  return (
    <div className="overlay-root position-relative" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 40%, #2563eb 75%, #4338ca 100%)' }}>
      <OverlayBackdrop variant="colorful" />
      <div className="d-flex flex-column align-items-center text-center position-relative" style={{ zIndex: 1 }}>
        {eventTitle && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="fw-bold text-white mb-2"
            style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.2rem)', textShadow: '0 4px 16px rgba(0,0,0,0.35)', maxWidth: '80vw' }}
          >
            {eventTitle}
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="d-flex align-items-center gap-2 px-4 py-2 mb-3"
          style={{ background: 'linear-gradient(90deg, #fbbf24, #f97316)', borderRadius: 999, boxShadow: '0 10px 30px rgba(249,115,22,0.45)' }}
        >
          <span style={{ fontSize: '1.2rem' }}>📊</span>
          <span className="fw-semibold" style={{ letterSpacing: 1, color: '#1e1b4b' }}>สถิติผู้มาใช้สิทธิ์</span>
        </motion.div>
        <h2 className="fw-bold mb-4 text-white" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)', textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          จำนวนผู้มาใช้สิทธิ์เลือกตั้ง
        </h2>

        <motion.div animate={pulseControls} className="position-relative">
          <svg width="300" height="300" viewBox="0 0 280 280">
            <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="20" />
            <circle
              cx="140" cy="140" r="120" fill="none"
              stroke="url(#gaugeGradient)" strokeWidth="20" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              transform="rotate(-90 140 140)"
              style={{ transition: 'stroke-dashoffset 400ms ease', filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.5))' }}
            />
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
          </svg>
          <div
            className="position-absolute top-50 start-50 translate-middle text-center"
          >
            <div className="fw-bold text-white" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              {Math.round(animatedPct)}%
            </div>
          </div>
        </motion.div>

        <div className="fs-3 fw-semibold mt-4 d-flex align-items-center gap-2 text-white">
          <span>🧑‍🤝‍🧑</span>
          {Math.round(animatedVoted).toLocaleString('th-TH')} / {stats.totalVoters.toLocaleString('th-TH')} คน
        </div>
        <div className="fs-5 mt-1" style={{ color: '#e0e7ff' }}>ใช้สิทธิ์เลือกตั้งแล้ว</div>
      </div>
    </div>
  );
}
