import { query } from '../db/pool.js';
import { getElectionState } from '../services/electionService.js';
import { writeAuditLog } from '../services/auditService.js';

// กลุ่ม A: แสดงได้ก่อน/ระหว่างเปิดโหวต (ไม่มีคะแนนแยกเบอร์)
const GROUP_A_SCENES = ['countdown', 'candidate_carousel', 'turnout', 'blank'];
// กลุ่ม B: unlock เฉพาะหลังประกาศผลอย่างเป็นทางการแล้วเท่านั้น
const GROUP_B_SCENES = ['final_results', 'winner_announcement'];

export default async function overlayRoutes(fastify) {
  fastify.get('/api/overlay/state', async (request, reply) => {
    const rows = await query('SELECT * FROM overlay_state ORDER BY id LIMIT 1');
    return reply.send(rows[0] || { current_scene: 'blank' });
  });

  // Admin: สลับฉาก — reject ถ้าฉากอยู่กลุ่ม B แต่ยังไม่ประกาศผล (บังคับที่ backend ไม่ใช่แค่ซ่อน UI)
  fastify.post('/api/admin/overlay/scene', { preHandler: fastify.requireAdmin }, async (request, reply) => {
    const { scene, countdown_target_at } = request.body || {};

    if (!GROUP_A_SCENES.includes(scene) && !GROUP_B_SCENES.includes(scene)) {
      return reply.code(400).send({ error: 'bad_request', message: 'ไม่รู้จักฉากนี้' });
    }

    if (GROUP_B_SCENES.includes(scene)) {
      const state = await getElectionState();
      if (!state.results_announced) {
        return reply.code(403).send({
          error: 'not_yet_announced',
          message: 'ยังไม่ถึงเวลาแสดงฉากนี้ ต้องประกาศผลอย่างเป็นทางการก่อน',
        });
      }
    }

    await query(
      `UPDATE overlay_state SET current_scene = ?, countdown_target_at = ?`,
      [scene, countdown_target_at || null]
    );

    await writeAuditLog(fastify, request, 'set_overlay_scene', 'overlay_state', scene, {});
    fastify.io.emit('overlay:scene', { scene, countdownTargetAt: countdown_target_at || null });

    return reply.send({ message: 'เปลี่ยนฉากสำเร็จ', scene });
  });
}
