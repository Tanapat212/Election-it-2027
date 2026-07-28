import { query } from '../db/pool.js';

/**
 * บันทึก audit log — ห้ามเรียกใช้ฟังก์ชันนี้กับข้อมูลที่โยง student_id เข้ากับ candidate_number ที่ถูกเลือกโหวต
 * ใช้ได้เฉพาะการกระทำเชิงบริหารจัดการ (อนุมัติผู้สมัคร, เปิด/ปิดโหวต, แก้ไขรายชื่อ ฯลฯ)
 */
export async function writeAuditLog(fastify, request, action, targetType, targetId, detail = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        request.user?.sub || null,
        action,
        targetType,
        String(targetId),
        JSON.stringify(detail),
        request.ip || null,
      ]
    );
  } catch (err) {
    fastify.log.error({ err }, 'เขียน audit log ล้มเหลว');
  }
}
