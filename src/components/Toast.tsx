import { useState, useEffect } from 'react';
import { toastSubscribe, toastKaldir } from '../store/toastStore';

const BG_RENKLERI: Record<string, string> = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#3b82f6',
};

export default function Toast() {
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string; leaving?: boolean }[]>([]);

  useEffect(() => {
    const unsubscribe = toastSubscribe(setToasts);
    return unsubscribe;
  }, []);

  const handleKaldir = (id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => toastKaldir(id), 200);
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 400,
        width: '90%',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => handleKaldir(t.id)}
          style={{
            backgroundColor: BG_RENKLERI[t.type] || '#3b82f6',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            animation: `${t.leaving ? 'fadeOut' : 'slideDown'} 0.2s ease forwards`,
          }}
        >
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
