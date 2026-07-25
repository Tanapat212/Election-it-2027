const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch(path, { method = 'GET', body, token, isMultipart = false } = {}) {
  const headers = {};
  // สำคัญ: ใส่ Content-Type: application/json เฉพาะตอนที่มี body จริงๆ เท่านั้น
  // เพราะถ้าใส่ header นี้ไปทั้งที่ไม่มี body เลย (เช่น ปุ่มลบ/รีเซ็ตรหัสผ่านที่ไม่ต้องส่งข้อมูลอะไรเพิ่ม)
  // backend (Fastify) จะ error ว่า "Body cannot be empty when content-type is set to 'application/json'"
  if (!isMultipart && body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isMultipart ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // เซสชันหมดอายุ/token ไม่ถูกต้อง — เตะออกจากระบบอัตโนมัติ ให้เข้าสู่ระบบใหม่
    if (res.status === 401 && token) {
      handleSessionExpired();
    }
    const err = new Error(data.message || 'เกิดข้อผิดพลาด');
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

function handleSessionExpired() {
  if (typeof window === 'undefined') return;
  const onAdminArea = window.location.pathname.startsWith('/control');
  const onVoterArea = window.location.pathname.startsWith('/vote');

  if (onAdminArea) {
    localStorage.removeItem('it_election_admin_auth');
    sessionStorage.setItem('it_election_session_message', 'เซสชันหมดอายุหรือถูกออกจากระบบ กรุณาเข้าสู่ระบบใหม่');
    window.location.href = '/admin-login';
  } else if (onVoterArea) {
    localStorage.removeItem('it_election_voter_auth');
    sessionStorage.setItem('it_election_session_message', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่เพื่อลงคะแนน');
    window.location.href = '/voter-login';
  }
}

export { API_URL };
