import { query } from '../db/pool.js';

// election_state เป็น singleton แถวเดียว (id คงที่จากที่ seed ไว้)
export async function getElectionState() {
  const rows = await query('SELECT * FROM election_state ORDER BY id LIMIT 1');
  if (rows.length === 0) throw new Error('ยังไม่ได้ seed election_state');
  return rows[0];
}

// อัปเดตชื่องาน/หัวข้อการเลือกตั้ง — ใช้แสดงในกล่องสีขาวบนหน้า overlay
export async function updateEventTitle(title) {
  await query('UPDATE election_state SET event_title = ?', [title]);
  return getElectionState();
}

export async function openVoting(durationMinutes) {
  if (durationMinutes && durationMinutes > 0) {
    await query(
      `UPDATE election_state
       SET voting_status = 'open', voting_start_at = NOW(),
           voting_deadline_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
           voting_duration_seconds = ?,
           is_paused = 0, paused_at = NULL
       WHERE voting_status != 'open'`,
      [durationMinutes * 60, durationMinutes * 60]
    );
  } else {
    // ไม่ตั้งเวลานับถอยหลัง — ปิดด้วยมือเท่านั้นเหมือนเดิม
    await query(
      `UPDATE election_state
       SET voting_status = 'open', voting_start_at = NOW(),
           voting_deadline_at = NULL, voting_duration_seconds = NULL,
           is_paused = 0, paused_at = NULL
       WHERE voting_status != 'open'`
    );
  }
  return getElectionState();
}

// หยุดนาฬิกานับถอยหลังชั่วคราว (ไม่ได้ปิดระบบโหวต นักเรียนยังโหวตต่อได้ตามปกติ
// แค่ตัวนับเวลาหยุดค้างไว้ ไม่ลดลง จนกว่าจะกด "เล่นต่อ")
export async function pauseVoting() {
  const state = await getElectionState();
  if (state.voting_status !== 'open' || !state.voting_deadline_at) {
    throw Object.assign(new Error('ไม่สามารถหยุดเวลาได้ ต้องเปิดโหวตแบบตั้งเวลานับถอยหลังไว้ก่อน'), { statusCode: 400 });
  }
  if (state.is_paused) return state; // หยุดอยู่แล้ว ไม่ต้องทำซ้ำ
  await query(`UPDATE election_state SET is_paused = 1, paused_at = NOW() WHERE id = ?`, [state.id]);
  return getElectionState();
}

// เล่นนาฬิกาต่อ — บวกเวลาที่หยุดไปกลับเข้า deadline เดิม (ชดเชยเวลาที่เสียไป)
export async function resumeVoting() {
  const state = await getElectionState();
  if (!state.is_paused) {
    throw Object.assign(new Error('ระบบไม่ได้อยู่ในสถานะหยุดชั่วคราว'), { statusCode: 400 });
  }
  await query(
    `UPDATE election_state
     SET voting_deadline_at = DATE_ADD(voting_deadline_at, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND),
         is_paused = 0, paused_at = NULL
     WHERE id = ?`,
    [state.id]
  );
  return getElectionState();
}

// คำนวณเวลาที่เหลือ (วินาที) ให้ frontend ใช้แสดงนับถอยหลังได้ตรงกันทุกเครื่อง
// (คำนวณฝั่ง server เสมอ กันปัญหานาฬิกาเครื่องผู้ใช้ไม่ตรงกัน)
export function computeRemainingSeconds(state) {
  if (!state.voting_deadline_at || state.voting_status !== 'open') return null;
  const deadline = new Date(state.voting_deadline_at).getTime();
  const now = state.is_paused && state.paused_at ? new Date(state.paused_at).getTime() : Date.now();
  return Math.max(0, Math.round((deadline - now) / 1000));
}

export async function closeVoting() {
  await query(
    `UPDATE election_state
     SET voting_status = 'closed', voting_end_at = NOW(), is_paused = 0, paused_at = NULL
     WHERE voting_status = 'open'`
  );
  return getElectionState();
}

/**
 * ปลดล็อกโหมด "เริ่มนับคะแนน" — ต้องปิดระบบโหวตแล้วเท่านั้น
 * ช่วงนี้กรรมการเห็นยอดคะแนนแยกเบอร์ได้ (สำหรับตรวจสอบภายใน)
 * แต่ยังไม่เปิดเผยต่อสาธารณะ/Overlay จนกว่าจะประกาศผล
 */
export async function startCounting() {
  const state = await getElectionState();
  if (state.voting_status !== 'closed') {
    const err = new Error('ต้องปิดระบบการโหวตก่อนจึงจะเริ่มนับคะแนนได้');
    err.statusCode = 400;
    throw err;
  }
  await query('UPDATE election_state SET counting_unlocked = 1');
  return getElectionState();
}

/**
 * คำนวณยอดคะแนนแยกเบอร์จากตาราง ballots
 * ฟังก์ชันนี้ "ต้องถูกเรียกใช้ก็ต่อเมื่อ counting_unlocked = 1 เท่านั้น"
 * (route layer เป็นผู้เช็ค gate ก่อนเรียก)
 */
export async function getBallotTally() {
  const rows = await query(
    `SELECT candidate_number, COUNT(*) AS votes
     FROM ballots
     WHERE is_abstain = 0
     GROUP BY candidate_number
     ORDER BY votes DESC`
  );
  const abstainRows = await query(
    `SELECT COUNT(*) AS abstainCount FROM ballots WHERE is_abstain = 1`
  );
  return {
    tally: rows.map((r) => ({ candidateNumber: r.candidate_number, votes: Number(r.votes) })),
    abstainCount: Number(abstainRows[0].abstainCount) || 0,
  };
}

export async function determineWinner() {
  const { tally } = await getBallotTally();
  if (tally.length === 0) return { winner: null, isTie: false, topVotes: 0 };

  const topVotes = tally[0].votes;
  const topCandidates = tally.filter((t) => t.votes === topVotes);
  const isTie = topCandidates.length > 1;

  return {
    winner: isTie ? null : topCandidates[0],
    isTie,
    tiedCandidates: isTie ? topCandidates : [],
    topVotes,
  };
}

/**
 * ประกาศผลอย่างเป็นทางการ — lock ถาวร ห้ามแก้ไขย้อนหลัง
 * กรณีเสมอ ต้องมีการยืนยันจากกรรมการ 2 คน (four-eyes) ก่อนเรียกฟังก์ชันนี้แบบระบุผู้ชนะ
 */
/**
 * ล้างข้อมูลรอบเลือกตั้งทั้งหมดเพื่อเตรียมใช้รอบถัดไป (ปีถัดไป)
 * ล้าง: ผู้สมัคร, ผู้มีสิทธิ์, คะแนนเสียง, การยืนยันกรณีเสมอ, สถานะรอบเลือกตั้ง, ฉาก overlay
 * "ไม่" ล้าง: บัญชีผู้ดูแลระบบ (admin_users) และ audit log — ประวัติการทำงานห้ามลบเด็ดขาด
 * เพื่อรักษาความโปร่งใส/ตรวจสอบย้อนหลังได้เสมอ ไม่มีตัวเลือกให้ล้าง audit log อีกต่อไป
 */
export async function resetElection() {
  await query('DELETE FROM ballots');
  await query('DELETE FROM tie_resolution_approvals');
  await query('DELETE FROM candidates');
  await query('DELETE FROM voters');

  await query(
    `UPDATE election_state
     SET voting_start_at = NULL, voting_end_at = NULL, voting_status = 'not_started',
         voting_deadline_at = NULL, is_paused = 0, paused_at = NULL, voting_duration_seconds = NULL,
         counting_unlocked = 0, results_announced = 0, results_announced_at = NULL,
         results_locked = 0, is_tie = 0, tie_resolved_winner_number = NULL`
  );
  await query(`UPDATE overlay_state SET current_scene = 'blank', countdown_target_at = NULL`);

  return getElectionState();
}

export async function announceResults({ tieResolvedWinnerNumber = null } = {}) {
  const state = await getElectionState();
  if (!state.counting_unlocked) {
    const err = new Error('ต้องเริ่มนับคะแนนก่อนจึงจะประกาศผลได้');
    err.statusCode = 400;
    throw err;
  }
  if (state.results_locked) {
    const err = new Error('ผลได้ถูกประกาศและล็อกไปแล้ว ไม่สามารถประกาศซ้ำได้');
    err.statusCode = 400;
    throw err;
  }

  const result = await determineWinner();
  const isTie = result.isTie && !tieResolvedWinnerNumber;

  await query(
    `UPDATE election_state
     SET results_announced = 1,
         results_announced_at = NOW(),
         results_locked = 1,
         is_tie = ?,
         tie_resolved_winner_number = ?
     WHERE id = ?`,
    [isTie ? 1 : 0, tieResolvedWinnerNumber, state.id]
  );

  return getElectionState();
}
