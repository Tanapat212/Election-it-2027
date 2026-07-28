'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

function getRemaining(targetAt) {
  if (!targetAt) return null;
  const diff = new Date(targetAt).getTime() - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  return {
    d: Math.floor(diff / (1000 * 60 * 60 * 24)),
    h: Math.floor((diff / (1000 * 60 * 60)) % 24),
    m: Math.floor((diff / (1000 * 60)) % 60),
    s: Math.floor((diff / 1000) % 60),
    done: false,
  };
}

function FlipUnit({ value, label }) {
  return (
    <div className="d-flex flex-column align-items-center mx-2 mx-md-4">
      <motion.div
        key={value}
        initial={{ rotateX: -90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="d-flex align-items-center justify-content-center fw-bold text-white"
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 6rem)',
          width: 'clamp(80px, 14vw, 160px)',
          height: 'clamp(90px, 15vw, 170px)',
          background: 'linear-gradient(160deg, var(--it-blue), var(--it-blue-dark))',
          borderRadius: 20,
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
        }}
      >
        {String(value).padStart(2, '0')}
      </motion.div>
      <span className="text-white mt-2 fs-5">{label}</span>
    </div>
  );
}

export default function CountdownScene({ targetAt }) {
  const [remaining, setRemaining] = useState(() => getRemaining(targetAt));

  useEffect(() => {
    const timer = setInterval(() => setRemaining(getRemaining(targetAt)), 1000);
    return () => clearInterval(timer);
  }, [targetAt]);

  return (
    <div
      className="overlay-root position-relative"
      style={{ background: 'linear-gradient(135deg, var(--it-blue-dark), var(--it-blue) 60%, var(--it-blue-light))' }}
    >
      <AnimatedParticles />
      <div className="text-center position-relative z-1">
        <div className="d-flex align-items-center justify-content-center gap-3 mb-4">
          <Image src="/images/logo-department.png" alt="" width={64} height={64} />
          <Image src="/images/logo-club.png" alt="" width={64} height={64} />
        </div>
        <h2 className="text-white fw-bold mb-4" style={{ fontSize: 'clamp(1.4rem, 3vw, 2.4rem)' }}>
          นับถอยหลังสู่การเลือกตั้งประธานนักเรียน/นักศึกษา แผนก IT
        </h2>
        {remaining ? (
          <div className="d-flex justify-content-center flex-wrap">
            <FlipUnit value={remaining.d} label="วัน" />
            <FlipUnit value={remaining.h} label="ชั่วโมง" />
            <FlipUnit value={remaining.m} label="นาที" />
            <FlipUnit value={remaining.s} label="วินาที" />
          </div>
        ) : (
          <p className="text-white fs-3">เตรียมพร้อมสำหรับการเลือกตั้ง</p>
        )}
      </div>
    </div>
  );
}

function AnimatedParticles() {
  const dots = Array.from({ length: 18 });
  return (
    <div className="position-absolute top-0 start-0 w-100 h-100" style={{ overflow: 'hidden' }}>
      {dots.map((_, i) => (
        <motion.div
          key={i}
          className="position-absolute rounded-circle"
          style={{
            width: 6 + (i % 4) * 3,
            height: 6 + (i % 4) * 3,
            background: 'rgba(255,255,255,0.35)',
            left: `${(i * 53) % 100}%`,
            top: `${(i * 37) % 100}%`,
          }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 6 + (i % 5), repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
