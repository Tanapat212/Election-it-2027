import fp from 'fastify-plugin';
import { Server as SocketIOServer } from 'socket.io';

/**
 * Single source of truth pub/sub:
 * ทุก client (Control Panel, Overlay, หน้าสาธารณะ) subscribe event เดียวกัน
 * Backend เป็นผู้คำนวณตัวเลขทั้งหมด ไม่ให้ client คำนวณเอง
 *
 * Events ที่ broadcast:
 *  - "turnout:update"        -> { totalVoters, votedCount, percentage }
 *  - "candidates:update"     -> รายชื่อผู้สมัครที่อนุมัติแล้วเปลี่ยนแปลง
 *  - "election:state"        -> สถานะรอบเลือกตั้ง (open/closed/counting/announced)
 *  - "overlay:scene"         -> ฉากปัจจุบันของ Overlay { scene, payload }
 *  - "results:announced"     -> ยอดคะแนนแยกเบอร์ + ผู้ชนะ (ส่งครั้งเดียวตอนประกาศผลเท่านั้น)
 */
export default fp(async function realtimePlugin(fastify) {
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    fastify.log.info(`socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      fastify.log.info(`socket disconnected: ${socket.id}`);
    });
  });

  fastify.decorate('io', io);
});
