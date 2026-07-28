'use client';

const ADMIN_KEY = 'it_election_admin_auth';
const VOTER_KEY = 'it_election_voter_auth';

export function saveAdminAuth(token, admin) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify({ token, admin }));
}
export function getAdminAuth() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(ADMIN_KEY));
  } catch {
    return null;
  }
}
export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_KEY);
}

export function saveVoterAuth(token, voter) {
  localStorage.setItem(VOTER_KEY, JSON.stringify({ token, voter }));
}
export function getVoterAuth() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(VOTER_KEY));
  } catch {
    return null;
  }
}
export function clearVoterAuth() {
  localStorage.removeItem(VOTER_KEY);
}

/**
 * ถอดรหัส JWT (แค่ decode ไม่ verify — ใช้ดูเวลาหมดอายุฝั่ง client เพื่อเตะออกอัตโนมัติเท่านั้น
 * การตรวจสอบความถูกต้องจริงทำที่ backend เสมออยู่แล้ว)
 * คืนค่า timestamp วินาทีที่หมดอายุ (exp) หรือ null ถ้าอ่านไม่ได้
 */
export function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // แปลงเป็น milliseconds
  } catch {
    return null;
  }
}

/**
 * ตั้งเวลาล่วงหน้าให้เตะผู้ใช้ออกจากระบบอัตโนมัติทันทีที่ token หมดอายุ
 * (ป้องกันการเข้าค้างหน้าจอไว้เฉยๆ โดยไม่ทำอะไร แล้วเซสชันหมดอายุไปแล้วแต่ไม่รู้ตัว)
 * ใช้ใน useEffect ของหน้าที่ต้อง login เช่น /control และ /vote
 */
export function scheduleAutoLogout(token, onExpire) {
  const expiresAt = getTokenExpiry(token);
  if (!expiresAt) return () => {};

  const msUntilExpiry = expiresAt - Date.now();
  if (msUntilExpiry <= 0) {
    onExpire();
    return () => {};
  }
  // จำกัด setTimeout ไว้ไม่เกิน ~24 วัน (ข้อจำกัดของเบราว์เซอร์) ซึ่งเกินพอสำหรับ token 2-8 ชม.ของระบบนี้
  const timer = setTimeout(onExpire, msUntilExpiry);
  return () => clearTimeout(timer);
}
