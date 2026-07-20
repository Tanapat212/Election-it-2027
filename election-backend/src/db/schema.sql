-- ============================================================
-- ระบบรับสมัครและเลือกตั้งประธานนักเรียน/นักศึกษา
-- แผนกเทคโนโลยีสารสนเทศ วิทยาลัยเทคนิคหาดใหญ่
-- Database: MySQL / MariaDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS it_htc_election
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE election1;

-- ------------------------------------------------------------
-- 1. ผู้ดูแลระบบ / กรรมการเลือกตั้ง
-- ------------------------------------------------------------
CREATE TABLE admin_users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  role          ENUM('super_admin', 'committee') NOT NULL DEFAULT 'committee',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. ผู้สมัคร (Candidate)
-- ------------------------------------------------------------
CREATE TABLE candidates (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_number    INT UNSIGNED NULL UNIQUE, -- เบอร์ผู้สมัคร (NULL จนกว่าจะอนุมัติ; MySQL อนุญาตหลาย NULL ใน UNIQUE index)
  full_name           VARCHAR(150) NOT NULL,
  student_id          VARCHAR(20)  NOT NULL,
  program             VARCHAR(150) NOT NULL, -- ระดับชั้น/สาขา
  team_name           VARCHAR(150) NULL,
  policy_summary      TEXT NULL,
  policy_file_path    VARCHAR(255) NULL, -- ไฟล์นโยบายหาเสียง PDF/รูป
  photo_path          VARCHAR(255) NULL,
  running_mates       JSON NULL, -- รายชื่อทีมบริหาร: รองประธาน, เลขาฯ ฯลฯ
  eligibility_confirmed TINYINT(1) NOT NULL DEFAULT 0, -- checkbox ยืนยันคุณสมบัติ
  status              ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  rejection_reason    VARCHAR(500) NULL,
  reviewed_by         INT UNSIGNED NULL,
  reviewed_at         DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_candidate_reviewer FOREIGN KEY (reviewed_by) REFERENCES admin_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. ผู้มีสิทธิ์เลือกตั้ง / สถานะการใช้สิทธิ์ (Turnout Table)
--    เก็บแค่ตัวตน + has_voted เท่านั้น "ห้าม" มีคอลัมน์เชื่อมไปยังคะแนน
-- ------------------------------------------------------------
CREATE TABLE voters (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id    VARCHAR(20)  NOT NULL UNIQUE,
  full_name     VARCHAR(150) NOT NULL,
  program       VARCHAR(150) NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  has_voted     TINYINT(1)   NOT NULL DEFAULT 0,
  voted_at      DATETIME     NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1, -- ใช้ soft-disable แทนการลบ ถ้า has_voted=1
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- จำนวนผู้มีสิทธิ์ทั้งหมด = SELECT COUNT(*) FROM voters WHERE is_active = 1
-- จำนวนผู้ใช้สิทธิ์แล้ว   = SELECT COUNT(*) FROM voters WHERE has_voted = 1
-- ห้ามมี view/join ใดๆ ที่เชื่อมตารางนี้เข้ากับ ballots

-- ------------------------------------------------------------
-- 4. คะแนนเสียง (Ballot Table)
--    ห้ามมีคอลัมน์ student_id / user_id / session_id เด็ดขาด
-- ------------------------------------------------------------
CREATE TABLE ballots (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_number  INT UNSIGNED NULL, -- NULL = งดออกเสียง/โหวตโน
  is_abstain        TINYINT(1) NOT NULL DEFAULT 0,
  cast_at_rounded   DATETIME NOT NULL -- เวลาปัดหยาบ (ปัดลงหลักชั่วโมง) กันไล่จับคู่จากลำดับเวลา
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. รอบ/ช่วงเวลาการเลือกตั้ง (Election Period)
-- ------------------------------------------------------------
CREATE TABLE election_state (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  voting_start_at       DATETIME NULL,
  voting_end_at         DATETIME NULL,
  voting_status         ENUM('not_started', 'open', 'closed') NOT NULL DEFAULT 'not_started',
  counting_unlocked     TINYINT(1) NOT NULL DEFAULT 0, -- true หลังกด "ปิดระบบการโหวต" -> "เริ่มนับคะแนน"
  results_announced     TINYINT(1) NOT NULL DEFAULT 0, -- true หลังกด "ประกาศผลอย่างเป็นทางการ"
  results_announced_at  DATETIME NULL,
  results_locked        TINYINT(1) NOT NULL DEFAULT 0, -- lock ถาวรหลังประกาศผล ห้ามแก้ไขย้อนหลัง
  is_tie                TINYINT(1) NOT NULL DEFAULT 0,
  tie_resolved_winner_number INT UNSIGNED NULL, -- บันทึกโดยกรรมการกรณีเสมอ (four-eyes)
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- แถวเดียวเท่านั้น (singleton) — seed ไว้ 1 แถวตอน migrate

-- ------------------------------------------------------------
-- 6. การยืนยันผลกรณีคะแนนเสมอ (four-eyes: กรรมการ 2 คนต้องยืนยัน)
-- ------------------------------------------------------------
CREATE TABLE tie_resolution_approvals (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  election_state_id INT UNSIGNED NOT NULL,
  admin_id        INT UNSIGNED NOT NULL,
  decided_winner_number INT UNSIGNED NOT NULL,
  method_note     VARCHAR(255) NULL, -- เช่น "จับสลาก" ตามระเบียบวิทยาลัย
  approved_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tie_election FOREIGN KEY (election_state_id) REFERENCES election_state(id),
  CONSTRAINT fk_tie_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id),
  UNIQUE KEY uq_tie_admin_once (election_state_id, admin_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. Overlay scene control (รีโมทคุมฉากที่แสดงอยู่)
-- ------------------------------------------------------------
CREATE TABLE overlay_state (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  current_scene ENUM(
    'countdown', 'candidate_carousel', 'turnout',
    'final_results', 'winner_announcement', 'blank'
  ) NOT NULL DEFAULT 'blank',
  countdown_target_at DATETIME NULL,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. Audit log (บันทึกการกระทำของ Admin/กรรมการเพื่อความโปร่งใส)
--    ห้าม log การกระทำที่โยง student_id กับ candidate_number ที่เลือก
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT UNSIGNED NULL,
  action      VARCHAR(100) NOT NULL, -- e.g. 'approve_candidate', 'close_voting'
  target_type VARCHAR(50)  NULL,     -- e.g. 'candidate', 'voter', 'election_state'
  target_id   VARCHAR(50)  NULL,
  detail      JSON NULL,
  ip_address  VARCHAR(45) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Seed: election_state และ overlay_state ต้องมีแถวเริ่มต้น
-- ------------------------------------------------------------
INSERT INTO election_state (voting_status) VALUES ('not_started');
INSERT INTO overlay_state (current_scene) VALUES ('countdown');

-- default super admin: username=admin / password=ChangeMe123! (ต้องเปลี่ยนทันทีหลังติดตั้งจริง)
-- password_hash ด้านล่างสร้างจาก bcrypt ในโค้ดตอน seed, ไม่ hardcode ที่นี่
