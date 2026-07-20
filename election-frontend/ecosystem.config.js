// PM2 config — รันทั้ง frontend (Next.js) และ backend (Fastify) พร้อมกัน
// วิธีใช้บนเซิร์ฟเวอร์ (หลัง build เสร็จแล้ว):
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup     <- ทำให้รันอัตโนมัติตอนเซิร์ฟเวอร์ reboot (ทำครั้งเดียว ทำตามคำสั่งที่มันแสดงผล)
//
// คำสั่งอื่นที่ใช้บ่อย:
//   pm2 status                 ดูสถานะ
//   pm2 logs                   ดู log ทั้งคู่
//   pm2 logs election-backend  ดู log เฉพาะ backend
//   pm2 restart all            รีสตาร์ททั้งคู่
//   pm2 stop all               หยุดทั้งคู่

module.exports = {
  apps: [
    {
      name: "election-backend",
      cwd: "./backend",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
    },
    {
      name: "election-frontend",
      cwd: ".",
      script: "npm",
      args: "start", // ต้อง `npm run build` ก่อนหน้านี้แล้ว (next start ต้องมี .next/ อยู่ก่อน)
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
    },
  ],
};
