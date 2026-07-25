import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

export default fp(async function authPlugin(fastify) {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  });

  // ต้อง login (ไม่สนบทบาท)
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'unauthorized', message: 'กรุณาเข้าสู่ระบบ' });
    }
  });

  // ต้องเป็น admin (super_admin หรือ committee)
  fastify.decorate('requireAdmin', async function (request, reply) {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'super_admin' && request.user.role !== 'committee') {
        reply.code(403).send({ error: 'forbidden', message: 'ต้องเป็นผู้ดูแลระบบ' });
      }
    } catch (err) {
      reply.code(401).send({ error: 'unauthorized', message: 'กรุณาเข้าสู่ระบบ' });
    }
  });

  // ต้องเป็น super_admin เท่านั้น
  fastify.decorate('requireSuperAdmin', async function (request, reply) {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'super_admin') {
        reply.code(403).send({ error: 'forbidden', message: 'ต้องเป็นผู้ดูแลระบบสูงสุด' });
      }
    } catch (err) {
      reply.code(401).send({ error: 'unauthorized', message: 'กรุณาเข้าสู่ระบบ' });
    }
  });

  // ต้องเป็น voter ที่ login แล้ว
  fastify.decorate('requireVoter', async function (request, reply) {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'voter') {
        reply.code(403).send({ error: 'forbidden', message: 'ต้องเป็นผู้มีสิทธิ์เลือกตั้ง' });
      }
    } catch (err) {
      reply.code(401).send({ error: 'unauthorized', message: 'กรุณาเข้าสู่ระบบ' });
    }
  });
});
