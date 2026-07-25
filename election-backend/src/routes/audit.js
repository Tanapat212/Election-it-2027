import { query } from '../db/pool.js';

export default async function auditRoutes(fastify) {
  fastify.get('/api/admin/audit-logs', { preHandler: fastify.requireAdmin }, async (request, reply) => {
    const rows = await query(
      `SELECT al.id, al.action, al.target_type, al.target_id, al.detail, al.created_at,
              au.full_name AS admin_name
       FROM audit_logs al
       LEFT JOIN admin_users au ON au.id = al.admin_id
       ORDER BY al.created_at DESC
       LIMIT 500`
    );
    return reply.send({ logs: rows });
  });
}
