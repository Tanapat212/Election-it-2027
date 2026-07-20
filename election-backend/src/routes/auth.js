import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';

export default async function authRoutes(fastify) {
  // Admin / กรรมการ login
  // จำกัดไว้เข้มงวดกว่า endpoint อื่น: ลองผิด/ถูกได้ไม่เกิน 8 ครั้ง ต่อ 5 นาที ต่อ IP กันการเดารหัสผ่านสุ่ม
  fastify.post(
    '/api/auth/admin/login',
    { config: { rateLimit: { max: 8, timeWindow: '5 minutes' } } },
    async (request, reply) => {
    const { username, password } = request.body || {};
    if (!username || !password) {
      return reply.code(400).send({ error: 'bad_request', message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const rows = await query(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
      [username]
    );
    const admin = rows[0];
    if (!admin) {
      return reply.code(401).send({ error: 'invalid_credentials', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'invalid_credentials', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = fastify.jwt.sign(
      { sub: admin.id, role: admin.role, username: admin.username, fullName: admin.full_name },
      { expiresIn: '30m' }
    );

    return reply.send({
      token,
      admin: { id: admin.id, username: admin.username, fullName: admin.full_name, role: admin.role },
    });
  });

  // Voter login (รหัสนักศึกษา + username/password ที่แอดมินสร้างให้)
  fastify.post(
    '/api/auth/voter/login',
    { config: { rateLimit: { max: 8, timeWindow: '5 minutes' } } },
    async (request, reply) => {
    const { username, password } = request.body || {};
    if (!username || !password) {
      return reply.code(400).send({ error: 'bad_request', message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const rows = await query(
      'SELECT * FROM voters WHERE username = ? AND is_active = 1',
      [username]
    );
    const voter = rows[0];
    if (!voter) {
      return reply.code(401).send({ error: 'invalid_credentials', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const valid = await bcrypt.compare(password, voter.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'invalid_credentials', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    if (voter.has_voted) {
      return reply.code(403).send({ error: 'already_voted', message: 'คุณได้ใช้สิทธิ์เลือกตั้งไปแล้ว' });
    }

    const token = fastify.jwt.sign(
      { sub: voter.id, role: 'voter', studentId: voter.student_id, fullName: voter.full_name },
      { expiresIn: '15m' }
    );

    return reply.send({
      token,
      voter: { id: voter.id, fullName: voter.full_name, studentId: voter.student_id },
    });
  });

  fastify.get('/api/auth/me', { preHandler: fastify.authenticate }, async (request, reply) => {
    return reply.send({ user: request.user });
  });

  // ผู้ดูแลระบบทุกคนเปลี่ยนรหัสผ่านของตัวเองได้ (ต้องใส่รหัสผ่านเดิมให้ถูกก่อน)
  fastify.post('/api/auth/admin/change-password', { preHandler: fastify.requireAdmin }, async (request, reply) => {
    const { current_password, new_password } = request.body || {};
    if (!current_password || !new_password) {
      return reply.code(400).send({ error: 'bad_request', message: 'กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่' });
    }
    if (new_password.length < 6) {
      return reply.code(400).send({ error: 'bad_request', message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    const rows = await query('SELECT * FROM admin_users WHERE id = ?', [request.user.sub]);
    const admin = rows[0];
    if (!admin) return reply.code(404).send({ error: 'not_found' });

    const valid = await bcrypt.compare(current_password, admin.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'invalid_credentials', message: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash, admin.id]);

    return reply.send({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  });
}
