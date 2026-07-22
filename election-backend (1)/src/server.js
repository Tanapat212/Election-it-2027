import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import path from 'node:path';

import authPlugin from './plugins/auth.js';
import realtimePlugin from './plugins/realtime.js';

import authRoutes from './routes/auth.js';
import candidatesRoutes from './routes/candidates.js';
import votersRoutes from './routes/voters.js';
import votingRoutes from './routes/voting.js';
import electionRoutes from './routes/election.js';
import overlayRoutes from './routes/overlay.js';
import auditRoutes from './routes/audit.js';
import adminsRoutes from './routes/admins.js';

const isProd = process.env.NODE_ENV === 'production';

// สำคัญมาก: ห้ามให้เซิร์ฟเวอร์ production รันด้วยค่า JWT_SECRET เริ่มต้น (ไม่ปลอดภัย)
// ถ้าลืมตั้งค่าใน .env ก่อน deploy จริง ให้เซิร์ฟเวอร์หยุดทำงานทันทีดีกว่าปล่อยให้รันด้วยความเสี่ยง
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-to-a-long-random-secret-string')) {
  console.error('FATAL: กรุณาตั้งค่า JWT_SECRET เป็นค่าสุ่มที่ปลอดภัยใน .env ก่อนรันบน production (ห้ามใช้ค่า default)');
  process.exit(1);
}

const fastify = Fastify({ logger: true });

// ซ่อนรายละเอียด error ภายใน (เช่น ข้อความ error จากฐานข้อมูล) ไม่ให้หลุดไปถึง client ตอนใช้งานจริง
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
  if (statusCode >= 500 && isProd) {
    return reply.code(statusCode).send({ error: 'internal_error', message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง' });
  }
  return reply.code(statusCode).send({
    error: error.code || 'error',
    message: error.message || 'เกิดข้อผิดพลาด',
  });
});

await fastify.register(helmet, {
  contentSecurityPolicy: false, // ปิดไว้เพราะ frontend แยกโดเมน/พอร์ตกัน (ไม่ได้เสิร์ฟ HTML จาก backend นี้)
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // อนุญาตให้ frontend คนละโดเมนโหลดรูปจาก /uploads ได้
});

await fastify.register(rateLimit, {
  max: 300, // ทุก IP เรียก API รวมได้ไม่เกิน 300 ครั้ง ต่อ 1 นาที (ป้องกัน spam/DDoS เบื้องต้น)
  timeWindow: '1 minute',
});

await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
});
await fastify.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB ต่อไฟล์
});
await fastify.register(staticPlugin, {
  root: path.resolve('uploads'),
  prefix: '/uploads/',
});

await fastify.register(authPlugin);
await fastify.register(realtimePlugin);

await fastify.register(authRoutes);
await fastify.register(candidatesRoutes);
await fastify.register(votersRoutes);
await fastify.register(votingRoutes);
await fastify.register(electionRoutes);
await fastify.register(overlayRoutes);
await fastify.register(auditRoutes);
await fastify.register(adminsRoutes);

fastify.get('/api/health', async () => ({ status: 'ok' }));

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';

fastify.listen({ port, host }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Backend API พร้อมใช้งานที่ ${address}`);
});
