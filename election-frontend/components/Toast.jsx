'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import gsap from 'gsap';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const elRefs = useRef(new Map());
  const refCallbacks = useRef(new Map());

  const removeToast = useCallback((id) => {
    const el = elRefs.current.get(id);
    if (el) {
      gsap.to(el, {
        x: 60, opacity: 0, duration: 0.25, ease: 'power2.in',
        onComplete: () => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          elRefs.current.delete(id);
          refCallbacks.current.delete(id);
        },
      });
    } else {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      refCallbacks.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message, variant = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  // สร้าง ref callback แค่ครั้งเดียวต่อ toast แต่ละอัน (แคชไว้ตาม id) กัน animation
  // เล่นซ้ำโดยไม่ตั้งใจตอน re-render จากการมี toast ใบใหม่เด้งเข้ามา
  function getRefCallback(id) {
    if (!refCallbacks.current.has(id)) {
      refCallbacks.current.set(id, (el) => {
        if (el && !elRefs.current.has(id)) {
          elRefs.current.set(id, el);
          gsap.fromTo(el, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.6)' });
        }
      });
    }
    return refCallbacks.current.get(id);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="toast-container position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 1080 }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            ref={getRefCallback(t.id)}
            className="toast show align-items-center text-white border-0 mb-2"
            style={{
              background:
                t.variant === 'success' ? 'var(--it-success)' :
                t.variant === 'danger' ? 'var(--it-danger)' :
                t.variant === 'warning' ? 'var(--it-warning)' : 'var(--it-blue)',
            }}
          >
            <div className="d-flex">
              <div className="toast-body">{t.message}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="ปิด"
                onClick={() => removeToast(t.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast ต้องใช้ภายใน ToastProvider');
  return ctx;
}
