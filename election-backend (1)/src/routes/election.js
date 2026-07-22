import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import {
  getElectionState, openVoting, closeVoting, startCounting,
  getBallotTally, determineWinner, announceResults, resetElection,
  updateEventTitle,
} from '../services/electionService.js';
import { writeAuditLog } from '../services/auditService.js';
import { broadcastTurnout } from '../services/turnoutService.js';

export default async function electionRoutes(fastify) {
  fastify.get('/api/election/state', async (request, reply) => {
    const state = await getElectionState();
    // ส่งเฉพาะฟิลด์ที่ปลอดภัยให้ client ทั่วไป (ไม่รวมยอดคะแนน)
    return reply.send({
      eventTitle: state.event_title || '',
      votingStatus: state.voting_status,
      votingStartAt: state.voting_start_at,
      votingEndAt: state.voting_end_at,
      countingUnlocked: !!state.counting_unlocked,
      resultsAnnounced: !!state.results_announced,
      isTie: !!state.is_tie,
    });
  });

  // แอดมินแก้ชื่องาน/หัวข้อการเลือกตั้ง — sync สดไปหน้า overlay ผ่าน socket
  fastify.post('/api/admin/election/event-title', { preHandler: fastify.requireAdmin }, async (request, reply) => {
    const { event_title } = request.body || {};
    if (typeof event_title !== 'string' || event_title.trim().length === 0) {
      return reply.code(400).send({ error: 'bad_request', message: 'กรุณากรอกชื่องาน' });
    }
    if (event_title.length > 255) {
      return reply.code(400).send({ error: 'bad_request', message: 'ชื่องานยาวเกินไป (สูงสุด 255 ตัวอักษร)' });
    }
    const state = await updateEventTitle(event_title.trim());
    await writeAuditLog(fastify, request, 'update_event_title', 'election_state', state.id, { event_title: state.event_title });
    fastify.io.emit('election:state', { eventTitle: state.event_title });
    return reply.send({ message: 'บันทึกชื่องานแล้ว', eventTitle: state.event_title });
  });

  fastify.post('/api/admin/election/open', { preHandler: fastify.requireAdmin }, async (request, reply) => {
    const state = await openVoting();
    await writeAuditLog(fastify, request, 'open_voting', 'election_state', state.id, {});
    fastify.io.emit('election:state', { votingStatus: state.voting_status });
    return reply.send({ message: 'เปิดระบบการโหวตแล้ว', state });
  });

  fastify.post('/api/admin/election/close', { preHandler: fastify.requireAdmin }, async (request, reply) => {
    const state = await closeVoting();
    await writeAuditLog(fastify, request, 'close_voting', 'election_state', state.id, {});
    fastify.io.emit('election:state', { votingStatus: state.voting_status });
    return reply.send({ message: 'ปิดระบบการโหวตแล้ว', state });
  });

  // ปลดล็อกโหมดนับคะแนน — reject เสมอถ้ายังไม่ปิดโหวต (บังคับที่ backend ตามข้อ 5.2)
  fastify.post(
    '/api/admin/election/start-counting',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      try {
        const state = await startCounting();
        await writeAuditLog(fastify, request, 'start_counting', 'election_state', state.id, {});
        fastify.io.emit('election:state', { countingUnlocked: true });
        return reply.send({ message: 'เริ่มนับคะแนนแล้ว (ยังไม่เปิดเผยต่อสาธารณะ)', state });
      } catch (err) {
        return reply.code(err.statusCode || 400).send({ error: 'bad_request', message: err.message });
      }
    }
  );

  // ยอดคะแนนแยกเบอร์ — endpoint นี้ "reject ทุกครั้ง" ถ้า counting_unlocked = 0
  // แม้ผู้เรียกจะเป็น super_admin ก็ตาม (ตามข้อ 5.2 บังคับที่ backend)
  fastify.get(
    '/api/admin/election/tally',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      const state = await getElectionState();
      if (!state.counting_unlocked) {
        return reply.code(403).send({
          error: 'counting_locked',
          message: 'ยังไม่ถึงช่วงนับคะแนน ต้องปิดระบบการโหวตและกด "เริ่มนับคะแนน" ก่อน',
        });
      }
      const tally = await getBallotTally();
      const winnerInfo = await determineWinner();
      return reply.send({ ...tally, ...winnerInfo });
    }
  );

  // กรณีเสมอ: กรรมการยืนยันผล ต้องมีอย่างน้อย 2 คนก่อนบันทึกผล (four-eyes)
  fastify.post(
    '/api/admin/election/tie-resolve',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      const state = await getElectionState();
      if (!state.counting_unlocked) {
        return reply.code(403).send({ error: 'counting_locked', message: 'ยังไม่ถึงช่วงนับคะแนน' });
      }
      const { decided_winner_number, method_note } = request.body || {};
      if (!decided_winner_number) {
        return reply.code(400).send({ error: 'bad_request', message: 'กรุณาระบุหมายเลขผู้ชนะที่ตัดสินแล้ว' });
      }

      try {
        await query(
          `INSERT INTO tie_resolution_approvals
             (election_state_id, admin_id, decided_winner_number, method_note)
           VALUES (?, ?, ?, ?)`,
          [state.id, request.user.sub, decided_winner_number, method_note || null]
        );
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return reply.code(409).send({ error: 'conflict', message: 'คุณได้ยืนยันผลนี้ไปแล้ว รอกรรมการอีกท่านยืนยัน' });
        }
        throw err;
      }

      const approvals = await query(
        `SELECT DISTINCT decided_winner_number, COUNT(DISTINCT admin_id) AS approverCount
         FROM tie_resolution_approvals WHERE election_state_id = ? GROUP BY decided_winner_number`,
        [state.id]
      );

      const agreed = approvals.find((a) => Number(a.approverCount) >= 2);
      await writeAuditLog(fastify, request, 'tie_resolve_vote', 'election_state', state.id, {
        decided_winner_number,
      });

      if (agreed) {
        return reply.send({
          message: 'กรรมการยืนยันครบ 2 ท่านแล้ว พร้อมประกาศผลได้',
          readyToAnnounce: true,
          decidedWinnerNumber: agreed.decided_winner_number,
        });
      }

      return reply.send({
        message: 'บันทึกการยืนยันของท่านแล้ว รอกรรมการอีกท่านยืนยันตรงกัน (four-eyes principle)',
        readyToAnnounce: false,
      });
    }
  );

  // ประกาศผลอย่างเป็นทางการ — lock ถาวร, broadcast ครั้งเดียวผ่าน channel เดียวกัน
  fastify.post(
    '/api/admin/election/announce',
    { preHandler: fastify.requireAdmin },
    async (request, reply) => {
      const { tie_resolved_winner_number } = request.body || {};

      try {
        const state = await announceResults({ tieResolvedWinnerNumber: tie_resolved_winner_number || null });
        const tally = await getBallotTally();
        const winnerInfo = await determineWinner();

        const payload = {
          ...tally,
          isTie: !!state.is_tie,
          winner: state.tie_resolved_winner_number
            ? { candidateNumber: state.tie_resolved_winner_number, resolvedByCommittee: true }
            : winnerInfo.winner,
          announcedAt: state.results_announced_at,
        };

        await writeAuditLog(fastify, request, 'announce_results', 'election_state', state.id, {});
        fastify.io.emit('results:announced', payload);

        return reply.send({ message: 'ประกาศผลอย่างเป็นทางการแล้ว', ...payload });
      } catch (err) {
        return reply.code(err.statusCode || 400).send({ error: 'bad_request', message: err.message });
      }
    }
  );

  // ล้างข้อมูลรอบเลือกตั้งทั้งหมดเพื่อใช้ในปีถัดไป — super_admin เท่านั้น, ต้องพิมพ์วลียืนยัน
  fastify.post(
    '/api/admin/election/reset',
    { preHandler: fastify.requireSuperAdmin },
    async (request, reply) => {
      const { confirm_text, password } = request.body || {};
      if (confirm_text !== 'ล้างข้อมูลเลือกตั้ง') {
        return reply.code(400).send({
          error: 'bad_request',
          message: 'กรุณาพิมพ์ข้อความยืนยัน "ล้างข้อมูลเลือกตั้ง" ให้ตรงก่อนดำเนินการ',
        });
      }
      if (!password) {
        return reply.code(400).send({ error: 'bad_request', message: 'กรุณากรอกรหัสผ่านของคุณเพื่อยืนยันอีกชั้น' });
      }

      const rows = await query('SELECT * FROM admin_users WHERE id = ?', [request.user.sub]);
      const admin = rows[0];
      const validPassword = admin && (await bcrypt.compare(password, admin.password_hash));
      if (!validPassword) {
        return reply.code(401).send({ error: 'invalid_credentials', message: 'รหัสผ่านไม่ถูกต้อง ยกเลิกการล้างข้อมูล' });
      }

      await writeAuditLog(fastify, request, 'reset_election', 'election_state', null, {});
      const state = await resetElection();

      fastify.io.emit('election:state', { votingStatus: state.voting_status });
      fastify.io.emit('candidates:update', { candidates: [] });
      fastify.io.emit('overlay:scene', { scene: 'blank', countdownTargetAt: null });

      return reply.send({ message: 'ล้างข้อมูลรอบเลือกตั้งสำเร็จ พร้อมใช้งานรอบถัดไป', state });
    }
  );

  // ผลลัพธ์สาธารณะ (ดูย้อนหลังได้) — คืนค่าได้ก็ต่อเมื่อประกาศผลแล้วเท่านั้น
  fastify.get('/api/results', async (request, reply) => {
    const state = await getElectionState();
    if (!state.results_announced) {
      return reply.code(403).send({
        error: 'not_announced',
        message: 'ยังไม่มีการประกาศผลอย่างเป็นทางการ',
      });
    }
    const tally = await getBallotTally();
    const winnerInfo = await determineWinner();
    return reply.send({
      ...tally,
      isTie: !!state.is_tie,
      winner: state.tie_resolved_winner_number
        ? { candidateNumber: state.tie_resolved_winner_number, resolvedByCommittee: true }
        : winnerInfo.winner,
      announcedAt: state.results_announced_at,
    });
  });
}
