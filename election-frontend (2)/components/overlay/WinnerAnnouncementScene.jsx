'use client';

import { motion } from 'framer-motion';
import { API_URL } from '@/lib/api';
import OverlayBackdrop from './OverlayBackdrop';

const CONFETTI_COLORS = ['#2563eb', '#0ea5e9', '#fbbf24', '#ffffff', '#93c5fd'];

function Confetti() {
  const pieces = Array.from({ length: 60 });
  return (
    <div className="position-absolute top-0 start-0 w-100 h-100" style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 3 + Math.random() * 2.5;
        const size = 6 + Math.random() * 8;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        return (
          <motion.div
            key={i}
            initial={{ y: -40, x: 0, opacity: 1, rotate: 0 }}
            animate={{ y: '110vh', x: [0, 20, -20, 0], rotate: 360 }}
            transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', left: `${left}%`, top: 0,
              width: size, height: size * 1.6, background: color,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}

export default function WinnerAnnouncementScene({ results, candidatesMeta }) {
  if (!results) {
    return (
      <div className="overlay-root" style={{ background: 'var(--it-bg)' }}>
        <h2 className="text-secondary fw-semibold">รอการประกาศผลอย่างเป็นทางการ</h2>
      </div>
    );
  }

  if (results.isTie) {
    return (
      <div className="overlay-root position-relative" style={{ background: 'linear-gradient(135deg, #4338ca, #7c3aed, #be185d)' }}>
        <OverlayBackdrop variant="dark" />
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }} className="text-center position-relative" style={{ zIndex: 1 }}
        >
          <div style={{ fontSize: '4rem' }}>⚖️</div>
          <h1 className="text-white fw-bold" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            คะแนนเสมอกัน
          </h1>
          <p className="text-white fs-4">รอการตัดสินจากกรรมการ</p>
        </motion.div>
      </div>
    );
  }

  const winner = candidatesMeta?.find((c) => c.candidate_number === results.winner?.candidateNumber);
  const photoUrl = winner?.photo_path ? `${API_URL}${winner.photo_path}` : null;

  return (
    <div
      className="overlay-root position-relative"
      style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 30%, #db2777 65%, #f97316 100%)' }}
    >
      <OverlayBackdrop variant="dark" />
      <Confetti />

      {/* แสงรัศมีหมุนช้าๆ อยู่หลังรูปผู้ชนะ ให้ความรู้สึกเป็นจุดสนใจ/สปอตไลต์ */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        className="position-absolute top-50 start-50 translate-middle"
        style={{
          width: 'clamp(320px, 40vw, 520px)', height: 'clamp(320px, 40vw, 520px)',
          background: 'repeating-conic-gradient(rgba(251,191,36,0.22) 0deg 10deg, transparent 10deg 20deg)',
          borderRadius: '50%', zIndex: 0, filter: 'blur(1px)',
        }}
      />

      <div className="text-center position-relative z-1">
        <motion.div
          initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          style={{ fontSize: '2.4rem' }}
        >
          👑
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-white fs-3 fw-semibold mb-3"
        >
          🎉 ขอแสดงความยินดีกับ 🎉
        </motion.p>

        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.3 }}
          className="rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center"
          style={{
            width: 'clamp(200px, 26vw, 320px)', height: 'clamp(200px, 26vw, 320px)',
            background: photoUrl ? `center/cover no-repeat url(${photoUrl})` : 'linear-gradient(135deg, #fbbf24, #fff)',
            boxShadow: '0 0 60px rgba(251,191,36,0.7)', border: '8px solid #fbbf24',
          }}
        >
          {!photoUrl && <span className="fw-bold" style={{ fontSize: '4rem', color: 'var(--it-blue-dark)' }}>
            #{results.winner?.candidateNumber}
          </span>}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="text-white fw-bold" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
        >
          {winner?.full_name || `เบอร์ ${results.winner?.candidateNumber}`}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="fs-4"
          style={{ color: '#fde68a' }}
        >
          ประธานนักเรียน/นักศึกษา แผนกเทคโนโลยีสารสนเทศ
        </motion.p>
      </div>
    </div>
  );
}
