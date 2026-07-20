import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { query } from '../db/pool.js';
import { writeAuditLog } from '../services/auditService.js';

const UPLOAD_DIR = path.resolve('uploads');

function ensureUploadDir(sub) {
  const dir = path.join(UPLOAD_DIR, sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// จำกัดชนิดไฟล์ที่รับอัปโหลดได้ ป้องกันมีคนแอบอัปโหลดไฟล์อันตราย (เช่น .exe, .php) มาสวมชื่อเป็นรูป/เอกสาร
const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_POLICY_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function isAllowedMime(fieldname, mimetype) {
  if (fieldname === 'photo') return ALLOWED_PHOTO_MIME.includes(mimetype);
  return ALLOWED_POLICY_MIME.includes(mimetype);
}

export default async function candidatesRoutes(fastify) {
  // สาธารณะ: รายชื่อผู้สมัครที่อนุมัติแล้วเท่านั้น
  fastify.get('/api/candidates', async (request, reply) => {
    const rows = await query(
      `SELECT id, candidate_number, full_name, program, team_name, policy_summary,
              photo_path, running_mates
       FROM candidates
       WHERE status = 'approved'
       ORDER BY candidate_number ASC`
    );
    return reply.send({ candidates: rows });
  });

  // Admin: รายชื่อผู้สมัครทั้งหมด (ทุกสถานะ)
  fastify.get(
    '/api/admin/candidates',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      const rows = await query(`SELECT * FROM candidates ORDER BY created_at DESC`);
      return reply.send({ candidates: rows });
    }
  );

  // สมัคร (multipart: fields + photo + policy file)
  fastify.post('/api/candidates', async (request, reply) => {
    const parts = request.parts();
    const fields = {};
    let photoPath = null;
    let policyFilePath = null;

    for await (const part of parts) {
      if (part.type === 'file') {
        if (!isAllowedMime(part.fieldname, part.mimetype)) {
          part.file.resume(); // ดึงข้อมูลไฟล์ทิ้งไม่ให้ค้าง แล้วปฏิเสธ
          return reply.code(400).send({
            error: 'invalid_file_type',
            message: part.fieldname === 'photo'
              ? 'รูปถ่ายผู้สมัครต้องเป็นไฟล์ JPG, PNG หรือ WEBP เท่านั้น'
              : 'ไฟล์นโยบายหาเสียงต้องเป็น PDF, JPG, PNG หรือ WEBP เท่านั้น',
          });
        }
        const dir = ensureUploadDir(part.fieldname === 'photo' ? 'photos' : 'policy-files');
        const safeName = `${Date.now()}-${part.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const filePath = path.join(dir, safeName);
        await pipeline(part.file, fs.createWriteStream(filePath));
        const relPath = `/uploads/${part.fieldname === 'photo' ? 'photos' : 'policy-files'}/${safeName}`;
        if (part.fieldname === 'photo') photoPath = relPath;
        else policyFilePath = relPath;
      } else {
        fields[part.fieldname] = part.value;
      }
    }

    const {
      full_name, student_id, program, team_name, policy_summary,
      running_mates, eligibility_confirmed,
    } = fields;

    if (!full_name || !student_id || !program || eligibility_confirmed !== 'true') {
      return reply.code(400).send({
        error: 'bad_request',
        message: 'กรุณากรอกข้อมูลให้ครบและยืนยันคุณสมบัติผู้สมัคร',
      });
    }

    let runningMatesJson = null;
    if (running_mates) {
      try {
        runningMatesJson = JSON.stringify(JSON.parse(running_mates));
      } catch {
        runningMatesJson = JSON.stringify([{ raw: running_mates }]);
      }
    }

    const result = await query(
      `INSERT INTO candidates
        (candidate_number, full_name, student_id, program, team_name, policy_summary,
         policy_file_path, photo_path, running_mates, eligibility_confirmed, status)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending')`,
      [full_name, student_id, program, team_name || null, policy_summary || null,
        policyFilePath, photoPath, runningMatesJson]
    );

    return reply.code(201).send({
      message: 'ส่งใบสมัครสำเร็จ รอการตรวจสอบจากผู้ดูแลระบบ',
      candidateId: result.insertId,
    });
  });

  // Admin: เพิ่มผู้สมัครเองโดยตรง (ไม่ต้องผ่านฟอร์ม /register) — สร้างเป็น approved ทันที
  fastify.post(
    '/api/admin/candidates',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      const parts = request.parts();
      const fields = {};
      let photoPath = null;
      let policyFilePath = null;

      for await (const part of parts) {
        if (part.type === 'file') {
          if (!part.filename) continue;
          if (!isAllowedMime(part.fieldname, part.mimetype)) {
            part.file.resume();
            return reply.code(400).send({
              error: 'invalid_file_type',
              message: part.fieldname === 'photo'
                ? 'รูปถ่ายผู้สมัครต้องเป็นไฟล์ JPG, PNG หรือ WEBP เท่านั้น'
                : 'ไฟล์นโยบายหาเสียงต้องเป็น PDF, JPG, PNG หรือ WEBP เท่านั้น',
            });
          }
          const dir = ensureUploadDir(part.fieldname === 'photo' ? 'photos' : 'policy-files');
          const safeName = `${Date.now()}-${part.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
          const filePath = path.join(dir, safeName);
          await pipeline(part.file, fs.createWriteStream(filePath));
          const relPath = `/uploads/${part.fieldname === 'photo' ? 'photos' : 'policy-files'}/${safeName}`;
          if (part.fieldname === 'photo') photoPath = relPath;
          else policyFilePath = relPath;
        } else {
          fields[part.fieldname] = part.value;
        }
      }

      const { full_name, student_id, program, team_name, policy_summary, running_mates } = fields;
      let { candidate_number } = fields;

      if (!full_name || !student_id || !program) {
        return reply.code(400).send({
          error: 'bad_request',
          message: 'กรุณากรอกชื่อ-นามสกุล, รหัสนักศึกษา และสาขา/ระดับชั้น',
        });
      }

      if (!candidate_number) {
        const rows = await query('SELECT MAX(candidate_number) AS maxNum FROM candidates');
        candidate_number = (Number(rows[0].maxNum) || 0) + 1;
      } else {
        candidate_number = Number(candidate_number);
        const dup = await query('SELECT id FROM candidates WHERE candidate_number = ?', [candidate_number]);
        if (dup.length > 0) {
          return reply.code(409).send({ error: 'conflict', message: 'หมายเลขผู้สมัครนี้ถูกใช้แล้ว' });
        }
      }

      let runningMatesJson = null;
      if (running_mates) {
        try {
          runningMatesJson = JSON.stringify(JSON.parse(running_mates));
        } catch {
          runningMatesJson = JSON.stringify([{ raw: running_mates }]);
        }
      }

      const result = await query(
        `INSERT INTO candidates
          (candidate_number, full_name, student_id, program, team_name, policy_summary,
           policy_file_path, photo_path, running_mates, eligibility_confirmed, status,
           reviewed_by, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'approved', ?, NOW())`,
        [candidate_number, full_name, student_id, program, team_name || null, policy_summary || null,
          policyFilePath, photoPath, runningMatesJson, request.user.sub]
      );

      await writeAuditLog(fastify, request, 'admin_add_candidate', 'candidate', result.insertId, { candidate_number });

      const list = await query(
        `SELECT id, candidate_number, full_name, program, team_name, policy_summary, photo_path
         FROM candidates WHERE status = 'approved' ORDER BY candidate_number ASC`
      );
      fastify.io.emit('candidates:update', { candidates: list });

      return reply.code(201).send({ message: 'เพิ่มผู้สมัครสำเร็จ', candidateId: result.insertId, candidate_number });
    }
  );

  // Admin: อนุมัติผู้สมัคร (กำหนดเบอร์)
  fastify.patch(
    '/api/admin/candidates/:id/approve',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      const { id } = request.params;
      let { candidate_number } = request.body || {};

      if (!candidate_number) {
        const rows = await query('SELECT MAX(candidate_number) AS maxNum FROM candidates');
        candidate_number = (Number(rows[0].maxNum) || 0) + 1;
      }

      const dup = await query(
        'SELECT id FROM candidates WHERE candidate_number = ? AND id != ?',
        [candidate_number, id]
      );
      if (dup.length > 0) {
        return reply.code(409).send({ error: 'conflict', message: 'หมายเลขผู้สมัครนี้ถูกใช้แล้ว' });
      }

      await query(
        `UPDATE candidates
         SET status = 'approved', candidate_number = ?, reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [candidate_number, request.user.sub, id]
      );

      await writeAuditLog(fastify, request, 'approve_candidate', 'candidate', id, { candidate_number });

      const list = await query(
        `SELECT id, candidate_number, full_name, program, team_name, policy_summary, photo_path
         FROM candidates WHERE status = 'approved' ORDER BY candidate_number ASC`
      );
      fastify.io.emit('candidates:update', { candidates: list });

      return reply.send({ message: 'อนุมัติผู้สมัครสำเร็จ', candidate_number });
    }
  );

  // Admin: ปฏิเสธผู้สมัคร
  fastify.patch(
    '/api/admin/candidates/:id/reject',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      const { id } = request.params;
      const { reason } = request.body || {};

      await query(
        `UPDATE candidates
         SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [reason || null, request.user.sub, id]
      );

      await writeAuditLog(fastify, request, 'reject_candidate', 'candidate', id, { reason });

      return reply.send({ message: 'ปฏิเสธใบสมัครแล้ว' });
    }
  );

  // Admin: ลบผู้สมัคร
  fastify.delete(
    '/api/admin/candidates/:id',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      const { id } = request.params;
      await query('DELETE FROM candidates WHERE id = ?', [id]);
      await writeAuditLog(fastify, request, 'delete_candidate', 'candidate', id, {});

      const list = await query(
        `SELECT id, candidate_number, full_name, program, team_name, policy_summary, photo_path
         FROM candidates WHERE status = 'approved' ORDER BY candidate_number ASC`
      );
      fastify.io.emit('candidates:update', { candidates: list });

      return reply.send({ message: 'ลบผู้สมัครแล้ว' });
    }
  );
}
