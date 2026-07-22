'use client';

import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, variant = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

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
            className={`toast show align-items-center text-white border-0 mb-2 it-fade-in`}
            style={{
              background:
                t.variant === 'success' ? 'var(--it-success)' :
                t.variant === 'danger' ? 'var(--it-danger)' :
                t.variant === 'warning' ? 'var(--it-warning)' : 'var(--it-blue)',
            }}
          >
            <div className="d-flex">
              <div className="toast-body">{t.message}</div>
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
