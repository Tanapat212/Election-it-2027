'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteNavbar from '@/components/SiteNavbar';
import SiteFooter from '@/components/SiteFooter';
import { useToast } from '@/components/Toast';
import PasswordInput from '@/components/PasswordInput';
import RateLimitCountdown from '@/components/RateLimitCountdown';
import { apiFetch } from '@/lib/api';
import { saveAdminAuth } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retrySeconds, setRetrySeconds] = useState(0);

  useEffect(() => {
    const msg = sessionStorage.getItem('it_election_session_message');
    if (msg) {
      showToast(msg, 'danger');
      sessionStorage.removeItem('it_election_session_message');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() && !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    if (!username.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้ (คุณกรอกไม่ครบ)');
      return;
    }
    if (!password) {
      setError('กรุณากรอกรหัสผ่าน (คุณกรอกไม่ครบ)');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/admin/login', { method: 'POST', body: { username, password } });
      saveAdminAuth(data.token, data.admin);
      showToast(`ยินดีต้อนรับ ${data.admin.fullName}`, 'success');
      router.push('/control');
    } catch (err) {
      if (err.status === 429 && err.data?.retryAfterSeconds) {
        setRetrySeconds(err.data.retryAfterSeconds);
        setError('');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteNavbar />
      <div className="container py-5 d-flex justify-content-center">
        <div className="it-card p-4 it-fade-in" style={{ maxWidth: 420, width: '100%' }}>
          <h4 className="fw-bold text-center mb-1" style={{ color: 'var(--it-blue-dark)' }}>
            เข้าสู่ระบบผู้ดูแล/กรรมการ
          </h4>
          <p className="text-secondary text-center small mb-4">สำหรับผู้ดูแลระบบและกรรมการเลือกตั้งเท่านั้น</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label">ชื่อผู้ใช้</label>
              <input className={`form-control ${error ? 'is-invalid' : ''}`} value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">รหัสผ่าน</label>
              <PasswordInput className={`form-control ${error ? 'is-invalid' : ''}`} value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <div className="invalid-feedback d-block">{error}</div>}
            </div>
            {retrySeconds > 0 && (
              <RateLimitCountdown seconds={retrySeconds} onExpire={() => setRetrySeconds(0)} />
            )}
            <button type="submit" className="btn it-btn-primary w-100 py-2 mt-3" disabled={loading || retrySeconds > 0}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
