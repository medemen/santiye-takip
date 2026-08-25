import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [cevrimdisi, setCevrimdisi] = useState(!navigator.onLine);

  useEffect(() => {
    const cevrimdisiOldu = () => setCevrimdisi(true);
    const cevrimiciOldu = () => setCevrimdisi(false);
    window.addEventListener('offline', cevrimdisiOldu);
    window.addEventListener('online', cevrimiciOldu);
    return () => {
      window.removeEventListener('offline', cevrimdisiOldu);
      window.removeEventListener('online', cevrimiciOldu);
    };
  }, []);

  if (!cevrimdisi) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'var(--color-warning, #f59e0b)',
        color: '#000',
        textAlign: 'center',
        padding: '6px 12px',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      Çevrimdışı — değişiklikler bağlantı gelince eşitlenecek
    </div>
  );
}
