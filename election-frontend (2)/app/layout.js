import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { kodchasal, sarabunNew } from '@/lib/fonts';

export const metadata = {
  title: 'เลือกตั้งประธานนักเรียน นักศึกษา แผนก IT วิทยาลัยเทคนิคหาดใหญ่',
  description: 'ระบบรับสมัครและเลือกตั้งประธานนักเรียน นักศึกษา แผนกเทคโนโลยีสารสนเทศ วิทยาลัยเทคนิคหาดใหญ่',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${kodchasal.variable} ${sarabunNew.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
