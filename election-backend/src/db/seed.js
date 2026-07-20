import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { pool, query } from './pool.js';

async function seed() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  const existing = await query('SELECT id FROM admin_users WHERE username = ?', [username]);
  if (existing.length > 0) {
    console.log(`Admin "${username}" มีอยู่แล้ว ข้ามการสร้าง`);
  } else {
    const hash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO admin_users (username, password_hash, full_name, role, is_active)
       VALUES (?, ?, ?, 'super_admin', 1)`,
      [username, hash, 'ผู้ดูแลระบบ']
    );
    console.log(`สร้าง super admin สำเร็จ: username=${username} password=${password}`);
    console.log('*** กรุณาเปลี่ยนรหัสผ่านทันทีหลัง login ครั้งแรก ***');
  }

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed ล้มเหลว:', err);
  process.exit(1);
});
