import { useEffect, useState } from 'react';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';

// Android WebView'da navigator.onLine cihazin gercek baglantisini dogru
// yansitmaz (offline iken bile true doner). Bu nedenle salt istemci olayi
// + periyodik sunucu yoklamasi birlikte kullanilir.
export function OfflineBanner() {
  const [cevrimdisi, setCevrimdisi] = useState(false);

  useEffect(() => {
    if (!SUPABASE_URL) return;
    let iptal = false;
    let aralik = 0;

    const sunucuErisilebilir = async (): Promise<boolean> => {
      try {
        const c = new AbortController();
        const zamanlayici = setTimeout(() => c.abort(), 6000);
        await fetch(`${SUPABASE_URL}/rest/v1/`, { method: 'GET', signal: c.signal, cache: 'no-store' });
        clearTimeout(zamanlayici);
        return true;
      } catch {
        return false;
      }
    };

    const kontrol = async () => {
      const online = (navigator.onLine || !('onLine' in navigator)) && (await sunucuErisilebilir());
      if (!iptal) setCevrimdisi(!online);
    };

    void kontrol();
    aralik = window.setInterval(() => void kontrol(), 15000);
    const olay = () => void kontrol();
    window.addEventListener('online', olay);
    window.addEventListener('offline', olay);
    return () => {
      iptal = true;
      window.clearInterval(aralik);
      window.removeEventListener('online', olay);
      window.removeEventListener('offline', olay);
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