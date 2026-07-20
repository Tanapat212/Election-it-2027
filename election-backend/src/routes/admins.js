import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { writeAuditLog } from '../services/auditService.js';

function genPassword() {
  return Math.random().toString(36).slice(-8);
}

// การจัดการบัญชีผู้ดูแลระบบ/กรรมการ — เฉพาะ super_admin เท่านั้น
export default async function adminsRoutes(fastify) {
  // รายชื่อผู้ดูแลระบบทั้งหมด
  fastify.get('/api/admin/admins', { preHandler: fastify.requireSuperAdmin }, async (request, reply) => {
    const rows = await query(
      `SELECT id, username, full_name, role, is_active, created_at FROM admin_users ORDER BY created_at ASC`
    );
    return reply.send({ admins: rows });
  });

  // เพิ่มผู้ดูแลระบบ/กรรมการใหม่
  fastify.post('/api/admin/admins', { preHandler: fastify.requireSuperAdmin }, async (request, reply) => {
    const { username, full_name, role, password } = request.body || {};
    if (!username || !full_name) {
      return reply.code(400).send({ error: 'bad_request', message: 'กรุณากรอกชื่อผู้ใช้และชื่อ-นามสกุล' });
    }
    const finalRole = role === 'super_admin' ? 'super_admin' : 'committee';
    const rawPassword = password && password.length >= 6 ? password : genPassword();
    const hash = await bcrypt.hash(rawPassword, 10);

    try {
      const result = await query(
        `INSERT INTO admin_users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
        [username, hash, full_name, finalRole]
      );
      await writeAuditLog(fastify, request, 'add_admin', 'admin_user', result.insertId, { username, role: finalRole });

      return reply.code(201).send({
        message: 'เพิ่มบัญชีผู้ดูแลระบบสำเร็จ',
        admin: { id: result.insertId, username, fullName: full_name, role: finalRole, tempPassword: rawPassword },
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return reply.code(409).send({ error: 'conflict', message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
      }
      throw err;
    }
  });

  // แก้ไขข้อมูลบัญชี (ชื่อ, บทบาท, เปิด/ปิดใช้งาน)
  fastify.patch('/api/admin/admins/:id', { preHandler: fastify.requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params;
    const { full_name, role, is_active } = request.body || {};

    if (Number(id) === request.user.sub && is_active === false) {
      return reply.code(400).send({ error: 'bad_request', message: 'ไม่สามารถปิดใช้งานบัญชีของตัวเองได้' });
    }
    if (Number(id) === request.user.sub && role && role !== 'super_admin') {
      return reply.code(400).send({ error: 'bad_request', message: 'ไม่สามารถลดสิทธิ์บัญชีของตัวเองได้' });
    }

    const rows = await query('SELECT * FROM admin_users WHERE id = ?', [id]);
    if (rows.length === 0) return reply.code(404).send({ error: 'not_found' });

    // กันไม่ให้ปิดใช้งาน/ลดสิทธิ์ super_admin คนสุดท้าย
    if ((is_active === false || (role && role !== 'super_admin')) && rows[0].role === 'super_admin') {
      const activeSupers = await query(
        `SELECT COUNT(*) AS n FROM admin_users WHERE role = 'super_admin' AND is_active = 1 AND id != ?`,
        [id]
      );
      if (Number(activeSupers[0].n) === 0) {
        return reply.code(400).send({
          error: 'bad_request',
          message: 'ต้องมีผู้ดูแลระบบสูงสุด (super_admin) ที่ใช้งานอยู่อย่างน้อย 1 คนเสมอ',
        });
      }
    }

    await query(
      `UPDATE admin_users SET full_name = COALESCE(?, full_name),
                               role = COALESCE(?, role),
                               is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [full_name ?? null, role ?? null, typeof is_active === 'boolean' ? (is_active ? 1 : 0) : null, id]
    );

    await writeAuditLog(fastify, request, 'edit_admin', 'admin_user', id, { full_name, role, is_active });
    return reply.send({ message: 'แก้ไขข้อมูลสำเร็จ' });
  });

  // รีเซ็ตรหัสผ่านของผู้ดูแลระบบคนอื่น (super_admin ทำแทนได้ กรณีลืมรหัส)
  fastify.post(
    '/api/admin/admins/:id/reset-password',
    { preHandler: fastify.requireSuperAdmin },
    async (request, reply) => {
      const { id } = request.params;
      const { password } = request.body || {};
      if (password && password.length < 6) {
        return reply.code(400).send({ error: 'bad_request', message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
      }
      const rows = await query('SELECT * FROM admin_users WHERE id = ?', [id]);
      if (rows.length === 0) return reply.code(404).send({ error: 'not_found' });

      const rawPassword = password && password.length >= 6 ? password : genPassword();
      const hash = await bcrypt.hash(rawPassword, 10);
      await query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash, id]);

      await writeAuditLog(fastify, request, 'reset_admin_password', 'admin_user', id, {});

      return reply.send({
        message: 'รีเซ็ตรหัสผ่านสำเร็จ',
        admin: { id: rows[0].id, username: rows[0].username, tempPassword: rawPassword },
      });
    }
  );

  // ลบบัญชีผู้ดูแลระบบ (ป้องกันการลบตัวเอง และป้องกันการลบ super_admin คนสุดท้าย)
  fastify.delete('/api/admin/admins/:id', { preHandler: fastify.requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params;
    if (Number(id) === request.user.sub) {
      return reply.code(400).send({ error: 'bad_request', message: 'ไม่สามารถลบบัญชีของตัวเองได้' });
    }

    const rows = await query('SELECT * FROM admin_users WHERE id = ?', [id]);
    if (rows.length === 0) return reply.code(404).send({ error: 'not_found' });

    if (rows[0].role === 'super_admin') {
      const activeSupers = await query(
        `SELECT COUNT(*) AS n FROM admin_users WHERE role = 'super_admin' AND is_active = 1 AND id != ?`,
        [id]
      );
      if (Number(activeSupers[0].n) === 0) {
        return reply.code(400).send({
          error: 'bad_request',
          message: 'ต้องมีผู้ดูแลระบบสูงสุด (super_admin) ที่ใช้งานอยู่อย่างน้อย 1 คนเสมอ',
        });
      }
    }

    await query('DELETE FROM admin_users WHERE id = ?', [id]);
    await writeAuditLog(fastify, request, 'delete_admin', 'admin_user', id, {});

    return reply.send({ message: 'ลบบัญชีสำเร็จ' });
  });
}
