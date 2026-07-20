'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import EmptyState from '@/components/EmptyState';

const ACTION_LABEL = {
  approve_candidate: 'อนุมัติผู้สมัคร',
  reject_candidate: 'ปฏิเสธผู้สมัคร',
  delete_candidate: 'ลบผู้สมัคร',
  admin_add_candidate: 'เพิ่มผู้สมัคร (โดยแอดมิน)',
  add_voter: 'เพิ่มผู้มีสิทธิ์',
  bulk_import_voters: 'นำเข้ารายชื่อผู้มีสิทธิ์',
  edit_voter: 'แก้ไขผู้มีสิทธิ์',
  delete_voter: 'ลบผู้มีสิทธิ์',
  reset_voter_password: 'รีเซ็ตรหัสผ่านผู้มีสิทธิ์',
  open_voting: 'เปิดระบบการโหวต',
  close_voting: 'ปิดระบบการโหวต',
  start_counting: 'เริ่มนับคะแนน',
  tie_resolve_vote: 'ยืนยันผลกรณีเสมอ',
  announce_results: 'ประกาศผลอย่างเป็นทางการ',
  reset_election: 'ล้างข้อมูลรอบเลือกตั้ง',
  set_overlay_scene: 'เปลี่ยนฉาก Overlay',
  add_admin: 'เพิ่มบัญชีผู้ดูแลระบบ',
  edit_admin: 'แก้ไขบัญชีผู้ดูแลระบบ',
  reset_admin_password: 'รีเซ็ตรหัสผ่านผู้ดูแลระบบ',
  delete_admin: 'ลบบัญชีผู้ดูแลระบบ',
};

const TARGET_LABEL = {
  candidate: 'ผู้สมัคร',
  voter: 'ผู้มีสิทธิ์',
  admin_user: 'บัญชีผู้ดูแลระบบ',
  election_state: 'สถานะการเลือกตั้ง',
  overlay_state: 'ฉาก Overlay',
};

export default function AuditSection({ token }) {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    apiFetch('/api/admin/audit-logs', { token }).then((d) => setLogs(d.logs)).catch(() => setLogs([]));
  }, [token]);

  return (
    <div className="it-fade-in">
      <h3 className="fw-bold mb-1" style={{ color: 'var(--it-blue-dark)' }}>ประวัติการทำงาน (Audit Log)</h3>
      <p className="text-secondary mb-4">
        บันทึกการกระทำของผู้ดูแลระบบ/กรรมการ เพื่อความโปร่งใส (แสดงล่าสุด 500 รายการ)
      </p>

      {logs === null && <div className="it-skeleton" style={{ height: 200 }} />}
      {logs && logs.length === 0 && <EmptyState icon="🕒" title="ยังไม่มีประวัติการทำงาน" />}

      {logs && logs.length > 0 && (
        <div className="it-card p-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr><th>เวลา</th><th>ผู้ดำเนินการ</th><th>การกระทำ</th><th>เป้าหมาย</th></tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="small text-nowrap">{new Date(l.created_at).toLocaleString('th-TH')}</td>
                    <td className="small text-nowrap">{l.admin_name || '-'}</td>
                    <td className="small text-nowrap">{ACTION_LABEL[l.action] || l.action}</td>
                    <td className="small">{TARGET_LABEL[l.target_type] || l.target_type} {l.target_id ? `#${l.target_id}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
