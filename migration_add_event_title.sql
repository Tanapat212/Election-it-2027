-- ============================================================
-- Migration: เพิ่มคอลัมน์ event_title ในตาราง election_state
-- ใช้สำหรับ database ที่ import schema.sql ไปแล้วก่อนหน้านี้
-- (ถ้ายังไม่เคย import schema.sql เลย ไม่ต้องรันไฟล์นี้ เพราะ
--  schema.sql เวอร์ชันล่าสุดมีคอลัมน์นี้อยู่แล้วตั้งแต่แรก)
--
-- วิธีรัน: phpMyAdmin -> เลือกฐานข้อมูล election1 (หรือชื่อที่ตั้งไว้)
--          -> แท็บ SQL -> วางทั้งหมดนี้ -> กด Go
-- ============================================================

ALTER TABLE election_state
  ADD COLUMN event_title VARCHAR(255) NULL AFTER id;

UPDATE election_state
  SET event_title = 'เลือกตั้งประธานนักเรียน นักศึกษา แผนก IT'
  WHERE event_title IS NULL;
