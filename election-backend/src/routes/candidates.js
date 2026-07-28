import fs from 'node:fs';
import path from 'node:path';
import { query } from '../db/pool.js';
import { writeAuditLog } from '../services/auditService.js';

// รหัสนักศึกษาของวิทยาลัยเป็นตัวเลข 11 หลักเสมอ
const STUDENT_ID_REGEX = /^\d{11}$/;
function isValidStudentId(id) {
  return typeof id === 'string' && STUDENT_ID_REGEX.test(id.trim());
}

const UPLOAD_DIR = path.resolve('uploads');

function ensureUploadDir(sub) {
  const dir = path.join(UPLOAD_DIR, sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// จำกัดชนิดไฟล์ที่รับอัปโหลดได้ ป้องกันมีคนแอบอัปโหลดไฟล์อันตราย (เช่น .exe, .php) มาสวมชื่อเป็นรูป/เอกสาร
const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_POLICY_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

// ตรวจ "ลายเซ็นไฟล์จริง" (magic bytes) จากเนื้อไฟล์ ไม่เชื่อแค่ mimetype ที่ client ส่งมา
// (mimetype จาก client ปลอมได้ง่ายมาก เช่นแนบไฟล์ .exe แต่ตั้ง header เป็น image/jpeg ก็ผ่านการเช็คแบบเดิมได้)
function detectRealFileType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') {
    return 'application/pdf';
  }
  return null;
}

// อ่าน stream ทั้งไฟล์เป็น buffer (ไฟล์จำกัดไว้แล้วไม่เกิน 10MB ที่ server.js จึงบัฟเฟอร์ในแรมได้อย่างปลอดภัย)
async function bufferStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/**
 * ตรวจสอบและบันทึกไฟล์ที่อัปโหลดอย่างปลอดภัย:
 * 1. เช็คว่า mimetype ที่ client อ้างอยู่ในชนิดที่อนุญาต (เช็คคร่าวๆ ก่อน กันไฟล์ผิดชนิดชัดเจน)
 * 2. อ่านเนื้อไฟล์จริงมาตรวจ "ลายเซ็นไฟล์" (magic bytes) ว่าเป็นชนิดที่อ้างจริงหรือไม่
 * 3. ถ้าเนื้อไฟล์จริงไม่ตรงกับชนิดที่อนุญาต -> ปฏิเสธ ไม่บันทึกลงดิสก์เด็ดขาด
 * คืนค่า relative path ('/uploads/...') ถ้าผ่าน หรือโยน error ที่มี .statusCode/.message ถ้าไม่ผ่าน
 */
async function saveUploadedFilePart(part) {
  const isPhoto = part.fieldname === 'photo';
  const allowed = isPhoto ? ALLOWED_PHOTO_MIME : ALLOWED_POLICY_MIME;
  const typeErrorMessage = isPhoto
    ? 'รูปถ่ายผู้สมัครต้องเป็นไฟล์ JPG, PNG หรือ WEBP เท่านั้น'
    : 'ไฟล์นโยบายหาเสียงต้องเป็น PDF, JPG, PNG หรือ WEBP เท่านั้น';

  if (!allowed.includes(part.mimetype)) {
    part.file.resume();
    throw Object.assign(new Error(typeErrorMessage), { statusCode: 400, code: 'invalid_file_type' });
  }

  const buffer = await bufferStream(part.file);

  if (part.file.truncated) {
    throw Object.assign(new Error('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)'), { statusCode: 400, code: 'file_too_large' });
  }

  const realType = detectRealFileType(buffer);
  if (!realType || !allowed.includes(realType)) {
    throw Object.assign(
      new Error(`${typeErrorMessage} (เนื้อไฟล์ที่อัปโหลดไม่ตรงกับชนิดไฟล์จริง กรุณาอัปโหลดไฟล์ต้นฉบับ ไม่ใช่ไฟล์ที่เปลี่ยนนามสกุลเอง)`),
      { statusCode: 400, code: 'file_content_mismatch' }
    );
  }

  const dir = ensureUploadDir(isPhoto ? 'photos' : 'policy-files');
  const safeName = `${Date.now()}-${part.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const filePath = path.join(dir, safeName);
  await fs.promises.writeFile(filePath, buffer);

  return `/uploads/${isPhoto ? 'photos' : 'policy-files'}/${safeName}`;
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
        if (!part.filename) continue;
        let relPath;
        try {
          relPath = await saveUploadedFilePart(part);
        } catch (err) {
          return reply.code(err.statusCode || 400).send({ error: err.code || 'invalid_file', message: err.message });
        }
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
    if (!isValidStudentId(student_id)) {
      return reply.code(400).send({ error: 'bad_request', message: 'รหัสนักศึกษาต้องเป็นตัวเลข 11 หลักเท่านั้น' });
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
          let relPath;
          try {
            relPath = await saveUploadedFilePart(part);
          } catch (err) {
            return reply.code(err.statusCode || 400).send({ error: err.code || 'invalid_file', message: err.message });
          }
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
      if (!isValidStudentId(student_id)) {
        return reply.code(400).send({ error: 'bad_request', message: 'รหัสนักศึกษาต้องเป็นตัวเลข 11 หลักเท่านั้น' });
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
