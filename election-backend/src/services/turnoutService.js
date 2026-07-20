import { query } from '../db/pool.js';

/**
 * คำนวณจำนวนผู้มีสิทธิ์ทั้งหมดและจำนวนที่ใช้สิทธิ์แล้วแบบสดจากฐานข้อมูลเสมอ
 * ห้ามมีค่าคงที่ hardcode ที่ใดในระบบ — ทุกจุดต้องเรียกฟังก์ชันนี้
 */
export async function getTurnoutStats() {
  const rows = await query(
    `SELECT
       COUNT(*) AS totalVoters,
       SUM(CASE WHEN has_voted = 1 THEN 1 ELSE 0 END) AS votedCount
     FROM voters
     WHERE is_active = 1`
  );
  const totalVoters = Number(rows[0].totalVoters) || 0;
  const votedCount = Number(rows[0].votedCount) || 0;
  const percentage = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 1000) / 10 : 0;

  return { totalVoters, votedCount, percentage };
}

/**
 * เรียกทุกครั้งหลังมีการโหวต หรือ Admin แก้ไขรายชื่อผู้มีสิทธิ์
 * broadcast ผ่าน channel เดียวกันให้ทุกหน้าจอ (Control, Overlay, Public) พร้อมกัน
 */
export async function broadcastTurnout(fastify) {
  const stats = await getTurnoutStats();
  fastify.io.emit('turnout:update', stats);
  return stats;
}
