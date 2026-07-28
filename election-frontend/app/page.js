'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import SiteNavbar from '@/components/SiteNavbar';
import SiteFooter from '@/components/SiteFooter';
import TurnoutWidget from '@/components/TurnoutWidget';

export default function LandingPage() {
  const heroRef = useRef(null);
  const stepsRef = useRef(null);

  useEffect(() => {
    if (!heroRef.current) return;
    const targets = heroRef.current.querySelectorAll('.it-reveal');
    gsap.fromTo(
      targets,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.12 }
    );
  }, []);

  useEffect(() => {
    if (!stepsRef.current || typeof IntersectionObserver === 'undefined') return;
    const cards = stepsRef.current.querySelectorAll('.it-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.fromTo(
              entry.target,
              { opacity: 0, y: 24 },
              { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
            );
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    cards.forEach((c) => { gsap.set(c, { opacity: 0 }); io.observe(c); });
    return () => io.disconnect();
  }, []);

  return (
    <>
      <SiteNavbar />

      <section className="it-hero py-5 mt-3" ref={heroRef}>
        <div className="container py-4">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div className="d-flex align-items-center gap-3 mb-3 it-reveal">
                <Image src="/images/logo-department.png" alt="โลโก้แผนกเทคโนโลยีสารสนเทศ" width={72} height={72} />
                <Image src="/images/logo-club.png" alt="โลโก้ชมรมวิชาชีพเทคโนโลยีสารสนเทศ" width={72} height={72} />
              </div>
              <h1 className="fw-bold mb-3 it-reveal" style={{ color: 'var(--it-blue-dark)' }}>
                การเลือกตั้งประธาน
                <br />
                นักเรียน นักศึกษา
                <br />
                แผนกเทคโนโลยีสารสนเทศ
                <br />
                วิทยาลัยเทคนิคหาดใหญ่
              </h1>
              <p className="text-secondary fs-5 mb-4 it-reveal">
                 ร่วมกันใช้สิทธิ์ของคุณ เลือกผู้นำที่จะขับเคลื่อนแผนกของเราไปข้างหน้า
              </p>
              <div className="d-flex flex-wrap gap-2 it-reveal">
                <Link href="/candidates" className="btn it-btn-primary px-4 py-2">
                  ดูรายชื่อผู้สมัคร
                </Link>
                <Link href="/voter-login" className="btn btn-outline-primary px-4 py-2">
                  เข้าสู่ระบบเพื่อลงคะแนน
                </Link>
                <Link href="/register" className="btn btn-outline-secondary px-4 py-2">
                  สมัครรับเลือกตั้ง
                </Link>
              </div>
            </div>
            <div className="col-lg-6 it-reveal">
              <TurnoutWidget />
            </div>
          </div>
        </div>
      </section>

      <section className="container py-5" ref={stepsRef}>
        <div className="row g-4 text-center">
          <div className="col-md-4">
            <div className="it-card p-4 h-100 it-reveal">
              <div className="fs-2 mb-2">📝</div>
              <h5 className="fw-semibold">1. รับสมัคร</h5>
              <p className="text-secondary mb-0">ผู้สมัครกรอกใบสมัครออนไลน์พร้อมนโยบายหาเสียง</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="it-card p-4 h-100 it-reveal">
              <div className="fs-2 mb-2">🗳️</div>
              <h5 className="fw-semibold">2. ลงคะแนนเสียง</h5>
              <p className="text-secondary mb-0">นักศึกษาผู้มีสิทธิ์ล็อกอินและโหวตออนไลน์อย่างปลอดภัย เป็นความลับ</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="it-card p-4 h-100 it-reveal">
              <div className="fs-2 mb-2">📊</div>
              <h5 className="fw-semibold">3. ประกาศผล</h5>
              <p className="text-secondary mb-0">ผลการเลือกตั้งอย่างเป็นทางการ โปร่งใส ตรวจสอบได้</p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}