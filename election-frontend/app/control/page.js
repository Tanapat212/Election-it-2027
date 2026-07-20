'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ControlSidebar from '@/components/control/ControlSidebar';
import DashboardSection from '@/components/control/DashboardSection';
import CandidatesSection from '@/components/control/CandidatesSection';
import VotersSection from '@/components/control/VotersSection';
import ElectionSection from '@/components/control/ElectionSection';
import OverlaySection from '@/components/control/OverlaySection';
import AuditSection from '@/components/control/AuditSection';
import AdminsSection from '@/components/control/AdminsSection';
import MyAccountSection from '@/components/control/MyAccountSection';
import { getAdminAuth, clearAdminAuth, scheduleAutoLogout } from '@/lib/auth';

export default function ControlPage() {
  const router = useRouter();
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    const a = getAdminAuth();
    if (!a) {
      router.replace('/admin-login');
      return;
    }
    setAuth(a);
  }, [router]);

  // เตะออกจากระบบอัตโนมัติทันทีที่ token หมดอายุ (ป้องกันเข้าค้างหน้าจอไว้เฉยๆ)
  useEffect(() => {
    if (!auth?.token) return;
    const cancel = scheduleAutoLogout(auth.token, () => {
      clearAdminAuth();
      sessionStorage.setItem('it_election_session_message', 'เซสชันหมดเวลาใช้งาน กรุณาเข้าสู่ระบบใหม่');
      router.replace('/admin-login');
    });
    return cancel;
  }, [auth, router]);

  function handleLogout() {
    clearAdminAuth();
    router.push('/admin-login');
  }

  if (!auth) return null;

  return (
    <div className="d-flex flex-column" style={{ background: '#9cc0ef', minHeight: '100vh' }}>
      <div className="d-flex flex-column flex-lg-row flex-grow-1">
        <ControlSidebar active={tab} onChange={setTab} admin={auth.admin} onLogout={handleLogout} />
        <div className="flex-grow-1 p-4 p-md-5" style={{ minWidth: 0 }}>
          {tab === 'dashboard' && <DashboardSection token={auth.token} />}
          {tab === 'candidates' && <CandidatesSection token={auth.token} />}
          {tab === 'voters' && <VotersSection token={auth.token} />}
          {tab === 'election' && <ElectionSection token={auth.token} />}
          {tab === 'overlay' && <OverlaySection token={auth.token} />}
          {tab === 'audit' && <AuditSection token={auth.token} />}
          {tab === 'admins' && auth.admin?.role === 'super_admin' && <AdminsSection token={auth.token} currentAdminId={auth.admin.id} />}
          {tab === 'account' && <MyAccountSection token={auth.token} admin={auth.admin} />}
        </div>
      </div>
      {/* แถบ copyright ท้ายสุด — เป็น sibling แยกจากแถวเมนู+เนื้อหา จึงเต็มความกว้างจอเสมอ ไม่มีปัญหา padding บัง */}
      <div className="it-copyright text-secondary py-3 border-top" style={{ background: '#ffffff' }}>
        © {new Date().getFullYear()} ระบบเลือกตั้งประธานนักเรียน นักศึกษา แผนก IT วิทยาลัยเทคนิคหาดใหญ่   พัฒนาโดยชมรมวิชาชีพเทคโนโลยีสารสนเทศ
      </div>
    </div>
  );
}
