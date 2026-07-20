'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import CountdownScene from '@/components/overlay/CountdownScene';
import CandidateCarouselScene from '@/components/overlay/CandidateCarouselScene';
import TurnoutScene from '@/components/overlay/TurnoutScene';
import FinalResultsScene from '@/components/overlay/FinalResultsScene';
import WinnerAnnouncementScene from '@/components/overlay/WinnerAnnouncementScene';
import BlankScene from '@/components/overlay/BlankScene';

export default function OverlayPage() {
  const [scene, setScene] = useState('blank');
  const [countdownTarget, setCountdownTarget] = useState(null);
  const [results, setResults] = useState(null);
  const [candidatesMeta, setCandidatesMeta] = useState([]);

  useEffect(() => {
    apiFetch('/api/overlay/state').then((s) => {
      setScene(s.current_scene);
      setCountdownTarget(s.countdown_target_at);
    }).catch(() => {});

    apiFetch('/api/candidates').then((d) => setCandidatesMeta(d.candidates)).catch(() => {});

    // ถ้าประกาศผลไปแล้วก่อนหน้านี้ (เช่น รีเฟรชหน้า) ให้ดึงผลมาแสดงได้
    apiFetch('/api/results').then(setResults).catch(() => {});

    const socket = getSocket();
    const onScene = (data) => {
      setScene(data.scene);
      setCountdownTarget(data.countdownTargetAt);
    };
    const onResults = (data) => setResults(data);
    const onCandidates = (d) => setCandidatesMeta(d.candidates);

    socket.on('overlay:scene', onScene);
    socket.on('results:announced', onResults);
    socket.on('candidates:update', onCandidates);
    return () => {
      socket.off('overlay:scene', onScene);
      socket.off('results:announced', onResults);
      socket.off('candidates:update', onCandidates);
    };
  }, []);

  const sceneMap = {
    countdown: <CountdownScene targetAt={countdownTarget} />,
    candidate_carousel: <CandidateCarouselScene />,
    turnout: <TurnoutScene />,
    final_results: <FinalResultsScene results={results} candidatesMeta={candidatesMeta} />,
    winner_announcement: <WinnerAnnouncementScene results={results} candidatesMeta={candidatesMeta} />,
    blank: <BlankScene />,
  };

  return (
    <div style={{ background: 'transparent', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={scene}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', height: '100%' }}
        >
          {sceneMap[scene] || <BlankScene />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
