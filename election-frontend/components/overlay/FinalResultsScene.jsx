'use client';

import { motion } from 'framer-motion';
import OverlayBackdrop from './OverlayBackdrop';

// ชุดสีไล่ตามลำดับผู้สมัคร ให้แต่ละแท่งดูแตกต่างมีชีวิตชีวา (ยกเว้นผู้ชนะที่ใช้สีทองเสมอ)
const BAR_COLORS = [
  ['#ec4899', '#be185d'], // ชมพู
  ['#2dd4bf', '#0f766e'], // เขียวมิ้นท์
  ['#818cf8', '#4338ca'], // ม่วงคราม
  ['#38bdf8', '#0369a1'], // ฟ้า
  ['#fb923c', '#c2410c'], // ส้ม
  ['#a3e635', '#4d7c0f'], // เขียวมะนาว
];

export default function FinalResultsScene({ results, candidatesMeta }) {
  if (!results) {
    return (
      <div className="overlay-root" style={{ background: 'var(--it-bg)' }}>
        <h2 className="text-secondary fw-semibold">รอผลการนับคะแนนอย่างเป็นทางการ</h2>
      </div>
    );
  }

  const maxVotes = Math.max(...results.tally.map((t) => t.votes), 1);
  const winnerNumber = results.winner?.candidateNumber;

  function nameFor(num) {
    const found = candidatesMeta?.find((c) => c.candidate_number === num);
    return found?.full_name || `เบอร์ ${num}`;
  }

  return (
    <div className="overlay-root flex-column position-relative" style={{ background: 'linear-gradient(135deg, #312e81 0%, #4338ca 40%, #7c3aed 75%, #a21caf 100%)' }}>
      <OverlayBackdrop variant="colorful" />
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="d-flex align-items-center gap-2 px-4 py-2 mb-3 position-relative"
        style={{ background: 'linear-gradient(90deg, #fbbf24, #f97316)', borderRadius: 999, boxShadow: '0 10px 30px rgba(249,115,22,0.45)', zIndex: 1 }}
      >
        <span style={{ fontSize: '1.2rem' }}>🏆</span>
        <span className="fw-semibold" style={{ letterSpacing: 1, color: '#1e1b4b' }}>สรุปผลคะแนน</span>
      </motion.div>
      <h2 className="fw-bold mb-4 text-white position-relative" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)', zIndex: 1, textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        ผลคะแนนอย่างเป็นทางการ
      </h2>
      <div className="d-flex align-items-end gap-4 position-relative" style={{ height: '55vh', zIndex: 1 }}>
        {results.tally.map((t, i) => {
          const isWinner = t.candidateNumber === winnerNumber;
          const heightPct = (t.votes / maxVotes) * 100;
          const [colorLight, colorDark] = BAR_COLORS[i % BAR_COLORS.length];
          return (
            <div key={t.candidateNumber} className="d-flex flex-column align-items-center justify-content-end h-100">
              {isWinner && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                  style={{ fontSize: '1.6rem' }}
                >
                  👑
                </motion.div>
              )}
              <motion.div
                className="fw-bold mb-2 text-white"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 + i * 0.1 }}
                style={{ fontSize: '1.4rem', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}
              >
                {t.votes}
              </motion.div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }}
                style={{
                  width: 'clamp(60px, 8vw, 100px)',
                  borderRadius: '12px 12px 0 0',
                  background: isWinner
                    ? 'linear-gradient(180deg, #fde047, #f59e0b)'
                    : `linear-gradient(180deg, ${colorLight}, ${colorDark})`,
                  boxShadow: isWinner ? '0 0 35px rgba(251,191,36,0.7)' : `0 0 18px ${colorLight}66`,
                }}
              />
              <div className="mt-3 text-center" style={{ maxWidth: 140 }}>
                <div
                  className="badge rounded-pill"
                  style={{ background: isWinner ? 'linear-gradient(90deg, #fde047, #f59e0b)' : `linear-gradient(90deg, ${colorLight}, ${colorDark})`, color: isWinner ? '#1e1b4b' : '#fff' }}
                >
                  เบอร์ {t.candidateNumber}
                </div>
                <div className="small mt-1 fw-semibold text-white">{nameFor(t.candidateNumber)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
