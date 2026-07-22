import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { getTurnoutStats, broadcastTurnout } from '../services/turnoutService.js';
import { writeAuditLog } from '../services/auditService.js';
import { getElectionState } from '../services/electionService.js';

function genPassword() {
  return Math.random().toString(36).slice(-8);
}

export default async function votersRoutes(fastify) {
  // สาธารณะ/ทุกจอ: ตัวเลข turnout สด (คำนวณจาก COUNT(*) จริงเสมอ) — ไม่มีคะแนนแยกเบอร์ปน
  fastify.get('/api/turnout', async (request, reply) => {
    const stats = await getTurnoutStats();
    return reply.send(stats);
  });

  // Admin: รายชื่อผู้มีสิทธิ์ทั้งหมด
  fastify.get('/api/admin/voters', { preHandler: fastify.requireAdmin }, async (request, reply) => {
    const rows = await query(
      `SELECT id, student_id, full_name, program, username, has_voted, voted_at, is_active
       FROM voters ORDER BY full_name ASC`
    );
    const stats = await getTurnoutStats();
    return reply.send({ voters: rows, stats });
  });

  // Admin: เพิ่มผู้มีสิทธิ์ทีละคน
  fastify.post('/api/admin/voters', { preHandler: fastify.requireAdmin }, async (request, reply) => {
    const state = await getElectionState();
    if (state.voting_status === 'closed') {
      return reply.code(400).send({
        error: 'locked',
        message: 'ระบบโหวตปิดแล้ว ไม่สามารถแก้ไขรายชื่อผู้มีสิทธิ์ได้อีก',
      });
    }

    const { student_id, full_name, program, username, password } = request.body || {};
    if (!student_id || !full_name) {
      return reply.code(400).send({ error: 'bad_request', message: 'กรุณากรอกรหัสนักศึกษาและชื่อ-นามสกุล' });
    }
    if (password && password.length < 6) {
      return reply.code(400).send({ error: 'bad_request', message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    const finalUsername = username || student_id;
    const rawPassword = password && password.length >= 6 ? password : genPassword();
    const hash = await bcrypt.hash(rawPassword, 10);

    try {
      const result = await query(
        `INSERT INTO voters (student_id, full_name, program, username, password_hash)
         VALUES (?, ?, ?, ?, ?)`,
        [student_id, full_name, program || null, finalUsername, hash]
      );

      await writeAuditLog(fastify, request, 'add_voter', 'voter', result.insertId, { student_id });
      const stats = await broadcastTurnout(fastify);

      return reply.code(201).send({
        message: 'เพิ่มผู้มีสิทธิ์เลือกตั้งสำเร็จ',
        voter: { id: result.insertId, username: finalUsername, tempPassword: rawPassword },
        stats,
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return reply.code(409).send({ error: 'conflict', message: 'รหัสนักศึกษาหรือชื่อผู้ใช้นี้มีอยู่แล้ว' });
      }
      throw err;
    }
  });

  // Admin: นำเข้ารายชื่อจำนวนมาก (จาก Excel/CSV ที่ frontend parse เป็น JSON array มาแล้ว)
  fastify.post(
    '/api/admin/voters/bulk-import',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      const state = await getElectionState();
      if (state.voting_status === 'closed') {
        return reply.code(400).send({
          error: 'locked',
          message: 'ระบบโหวตปิดแล้ว ไม่สามารถแก้ไขรายชื่อผู้มีสิทธิ์ได้อีก',
        });
      }

      const { voters } = request.body || {};
      if (!Array.isArray(voters) || voters.length === 0) {
        return reply.code(400).send({ error: 'bad_request', message: 'ไม่พบรายชื่อที่จะนำเข้า' });
      }

      let inserted = 0;
      let skipped = 0;
      const credentials = [];

      for (const v of voters) {
        if (!v.student_id || !v.full_name) {
          skipped += 1;
          continue;
        }
        const username = v.username || v.student_id;
        const rawPassword = genPassword();
        const hash = await bcrypt.hash(rawPassword, 10);
        try {
          await query(
            `INSERT INTO voters (student_id, full_name, program, username, password_hash)
             VALUES (?, ?, ?, ?, ?)`,
            [v.student_id, v.full_name, v.program || null, username, hash]
          );
          inserted += 1;
          credentials.push({ student_id: v.student_id, username, tempPassword: rawPassword });
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            skipped += 1;
          } else {
            throw err;
          }
        }
      }

      await writeAuditLog(fastify, request, 'bulk_import_voters', 'voter', 'bulk', { inserted, skipped });
      const stats = await broadcastTurnout(fastify);

      return reply.send({
        message: `นำเข้าสำเร็จ ${inserted} รายการ (ข้าม ${skipped} รายการซ้ำ/ข้อมูลไม่ครบ)`,
        inserted,
        skipped,
        credentials,
        stats,
      });
    }
  );

  // Admin: แก้ไขผู้มีสิทธิ์
  fastify.patch('/api/admin/voters/:id', { preHandler: fastify.requireAdmin }, async (request, reply) => {
    const { id } = request.params;
    const { full_name, program, is_active } = request.body || {};

    const rows = await query('SELECT * FROM voters WHERE id = ?', [id]);
    if (rows.length === 0) return reply.code(404).send({ error: 'not_found' });

    await query(
      `UPDATE voters SET full_name = COALESCE(?, full_name),
                          program = COALESCE(?, program),
                          is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [full_name ?? null, program ?? null, is_active ?? null, id]
    );

    await writeAuditLog(fastify, request, 'edit_voter', 'voter', id, { full_name, program, is_active });
    const stats = await broadcastTurnout(fastify);

    return reply.send({ message: 'แก้ไขข้อมูลสำเร็จ', stats });
  });

  // Admin: รีเซ็ตรหัสผ่านผู้มีสิทธิ์ (สุ่มรหัสใหม่ให้ กรณีรหัสเดิมหาย/แจกซ้ำ)
  fastify.post(
    '/api/admin/voters/:id/reset-password',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      const { id } = request.params;
      const { password } = request.body || {};
      if (password && password.length < 6) {
        return reply.code(400).send({ error: 'bad_request', message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
      }
      const rows = await query('SELECT * FROM voters WHERE id = ?', [id]);
      if (rows.length === 0) return reply.code(404).send({ error: 'not_found' });

      const rawPassword = password && password.length >= 6 ? password : genPassword();
      const hash = await bcrypt.hash(rawPassword, 10);
      await query('UPDATE voters SET password_hash = ? WHERE id = ?', [hash, id]);

      await writeAuditLog(fastify, request, 'reset_voter_password', 'voter', id, {});

      return reply.send({
        message: 'รีเซ็ตรหัสผ่านสำเร็จ',
        voter: { id: rows[0].id, username: rows[0].username, tempPassword: rawPassword },
      });
    }
  );

  // Admin: ลบผู้มีสิทธิ์ — ห้ามลบถ้า has_voted = true (กันตัวเลข turnout ผิดเพี้ยนย้อนหลัง)
  fastify.delete('/api/admin/voters/:id', { preHandler: fastify.requireAdmin }, async (request, reply) => {
    const { id } = request.params;

    const rows = await query('SELECT * FROM voters WHERE id = ?', [id]);
    if (rows.length === 0) return reply.code(404).send({ error: 'not_found' });

    if (rows[0].has_voted) {
      return reply.code(400).send({
        error: 'cannot_delete_voted',
        message: 'ไม่สามารถลบรายชื่อที่ใช้สิทธิ์เลือกตั้งไปแล้วได้ เพื่อรักษาความถูกต้องของสถิติ',
      });
    }

    const state = await getElectionState();
    if (state.voting_status === 'closed') {
      return reply.code(400).send({
        error: 'locked',
        message: 'ระบบโหวตปิดแล้ว ไม่สามารถแก้ไขรายชื่อผู้มีสิทธิ์ได้อีก',
      });
    }

    await query('DELETE FROM voters WHERE id = ?', [id]);
    await writeAuditLog(fastify, request, 'delete_voter', 'voter', id, {});
    const stats = await broadcastTurnout(fastify);

    return reply.send({ message: 'ลบรายชื่อสำเร็จ', stats });
  });
}
