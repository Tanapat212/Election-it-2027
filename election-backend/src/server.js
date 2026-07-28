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
  // เพิ่มจาก 300 เป็น 1000 ครั้ง/นาที ต่อ IP — เพราะนักเรียนจำนวนมากมักใช้ WiFi
  // โรงเรียนวงเดียวกัน (IP เดียวกัน) ช่วงเปิดโหวตพร้อมกัน ตัวนี้เป็นแค่ตัวกันสแปม/DDoS
  // เบื้องต้นเท่านั้น ส่วนการกันเดารหัสผ่านที่สำคัญกว่าไปอยู่ที่ rate limit เฉพาะ
  // หน้า login (นับตาม username) ที่ auth.js แล้ว
  max: 1000,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => ({
    error: 'rate_limited',
    message: `ลองเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง (ประมาณ ${Math.ceil(context.ttl / 1000)} วินาที)`,
    retryAfterSeconds: Math.ceil(context.ttl / 1000), // ตัวเลขดิบให้ frontend ใช้นับถอยหลังแบบ real-time ได้
  }),
});

// รองรับหลาย origin พร้อมกัน (คั่นด้วย , ใน .env) เผื่อกรณีมีทั้ง dev (localhost) และ prod (Vercel) พร้อมกัน
// ตัวอย่าง .env: FRONTEND_URL=https://election-gamma-nine.vercel.app,http://localhost:3001
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3001')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

await fastify.register(cors, {
  origin: (origin, cb) => {
    // อนุญาต request ที่ไม่มี origin (เช่น curl, server-to-server, health check)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    fastify.log.warn(`CORS blocked origin: ${origin} (allowed: ${allowedOrigins.join(', ')})`);
    return cb(new Error('Not allowed by CORS'), false);
  },
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
