import { pool, query } from '../db/pool.js';
import { broadcastTurnout } from '../services/turnoutService.js';
import { getElectionState } from '../services/electionService.js';

/**
 * บันทึกสถานะ "ใช้สิทธิ์แล้ว" ของผู้โหวต — service นี้ "ไม่รู้" ว่าเลือกเบอร์อะไร
 * แยก service call ออกจาก recordBallot โดยสิ้นเชิงตามสเปกข้อ 5.1
 */
async function markVoterAsVoted(voterId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT has_voted FROM voters WHERE id = ? FOR UPDATE',
      [voterId]
    );
    if (rows.length === 0) {
      throw Object.assign(new Error('ไม่พบผู้มีสิทธิ์เลือกตั้งนี้'), { statusCode: 404 });
    }
    if (rows[0].has_voted) {
      throw Object.assign(new Error('คุณได้ใช้สิทธิ์เลือกตั้งไปแล้ว'), { statusCode: 409, code: 'already_voted' });
    }
    await conn.query(
      'UPDATE voters SET has_voted = 1, voted_at = NOW() WHERE id = ?',
      [voterId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * บันทึกคะแนนลงตาราง ballots — "ไม่ส่ง" reference ของผู้ใช้ไปด้วยเด็ดขาด
 * เวลาปัดหยาบระดับชั่วโมง กันไล่จับคู่จากลำดับเวลา
 */
async function recordBallot({ candidateNumber, isAbstain }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO ballots (candidate_number, is_abstain, cast_at_rounded)
       VALUES (?, ?, DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00'))`,
      [isAbstain ? null : candidateNumber, isAbstain ? 1 : 0]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export default async function votingRoutes(fastify) {
  fastify.post(
    '/api/voting/cast',
    { preHandler: fastify.requireVoter },
    async (request, reply) => {
      const state = await getElectionState();
      if (state.voting_status !== 'open') {
        return reply.code(400).send({ error: 'voting_closed', message: 'ขณะนี้ไม่อยู่ในช่วงเวลาเปิดลงคะแนน' });
      }

      const { candidate_number, abstain } = request.body || {};
      const isAbstain = !!abstain;

      if (!isAbstain) {
        if (!candidate_number) {
          return reply.code(400).send({ error: 'bad_request', message: 'กรุณาเลือกผู้สมัครหรือกดงดออกเสียง' });
        }
        const candRows = await query(
          `SELECT id FROM candidates WHERE candidate_number = ? AND status = 'approved'`,
          [candidate_number]
        );
        if (candRows.length === 0) {
          return reply.code(400).send({ error: 'bad_request', message: 'ไม่พบผู้สมัครหมายเลขนี้' });
        }
      }

      const voterId = request.user.sub;

      // ขั้นตอนที่ 1: เช็คสิทธิ์ + เขียน has_voted=true ทันที (transaction แยก)
      try {
        await markVoterAsVoted(voterId);
      } catch (err) {
        const code = err.statusCode || 500;
        return reply.code(code).send({ error: err.code || 'server_error', message: err.message });
      }

      // ขั้นตอนที่ 2: เปิด transaction แยกต่างหากเพื่อบันทึกคะแนน โดยไม่มี reference ผู้ใช้ใดๆ
      try {
        await recordBallot({ candidateNumber: candidate_number, isAbstain });
      } catch (err) {
        // has_voted ถูกบันทึกไปแล้วตามหลักการ "กันโหวตซ้ำ" มาก่อนความเสี่ยงนี้;
        // แจ้ง admin ผ่าน log เพื่อการตรวจสอบ (ไม่ log ผูกกับตัวเลือกที่กด)
        fastify.log.error({ err }, 'บันทึกคะแนนล้มเหลวหลังจากบันทึกสิทธิ์แล้ว');
        return reply.code(500).send({
          error: 'ballot_write_failed',
          message: 'เกิดข้อผิดพลาดในการบันทึกคะแนน กรุณาติดต่อกรรมการเลือกตั้งทันที',
        });
      }

      const stats = await broadcastTurnout(fastify);

      return reply.send({ message: 'บันทึกคะแนนเสียงสำเร็จ ขอบคุณที่ใช้สิทธิ์', stats });
    }
  );
}
