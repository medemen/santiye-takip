import { useRef, useState } from 'react';
import { fotografYukle, raporFotografEkle, fotografSil } from '../../stores/reportStore';
import { toastGoster } from '../../stores/toastStore';

interface Props {
  raporId: string;
  fotograflar: string[];
  onUpdate: (fotograflar: string[]) => void;
  disabled?: boolean;
}

export default function FotografEkle({ raporId, fotograflar, onUpdate, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [silinen, setSilinen] = useState<string | null>(null);

  const handleDosyaSec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    if (dosya.size > 5 * 1024 * 1024) {
      toastGoster('Dosya boyutu 5MB\'dan küçük olmalı', 'error');
      return;
    }
    // accept="image/*" sadece dosya diyalogu filtresidir; turu burada denetle
    if (!dosya.type.startsWith('image/')) {
      toastGoster('Yalnızca resim dosyası yüklenebilir', 'error');
      return;
    }
    setYukleniyor(true);
    try {
      const url = await fotografYukle(raporId, dosya);
      // Store reddederse (yetki) yerel aynaya ekleme; store zaten bildirir
      if (url && raporFotografEkle(raporId, url)) {
        onUpdate([...fotograflar, url]);
        toastGoster('Fotoğraf yüklendi', 'success');
      }
    } finally {
      setYukleniyor(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleSil = async (url: string) => {
    if (silinen) return;
    setSilinen(url);
    try {
      if (await fotografSil(raporId, url)) {
        onUpdate(fotograflar.filter((u) => u !== url));
        toastGoster('Fotoğraf silindi', 'success');
      }
    } finally {
      setSilinen(null);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleDosyaSec}
        style={{ display: 'none' }}
        id={`foto-${raporId}`}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {fotograflar.map((url, i) => (
          <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={`Fotoğraf ${i + 1}`}
                style={{
                  width: 64, height: 64, objectFit: 'cover',
                  borderRadius: 8, border: '1px solid var(--border-soft)',
                }}
              />
            </a>
            {!disabled && (
              <button
                onClick={() => void handleSil(url)}
                disabled={silinen === url}
                title="Fotoğrafı sil"
                aria-label={`Fotoğraf ${i + 1} sil`}
                style={{
                  position: 'absolute', top: -8, right: -8,
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: '#ef4444', color: '#fff',
                  border: '2px solid #fff', fontSize: 12, lineHeight: 1,
                  cursor: 'pointer', opacity: silinen === url ? 0.5 : 1,
                }}
              >
                ✕
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <label
            htmlFor={`foto-${raporId}`}
            title="Fotoğraf ekle"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 8,
              border: '2px dashed var(--border)', cursor: yukleniyor ? 'wait' : 'pointer',
              fontSize: 20, color: 'var(--text-subtle)', opacity: yukleniyor ? 0.5 : 1,
            }}
          >
            {yukleniyor ? '⏳' : '+'}
          </label>
        )}
      </div>
    </div>
  );
}
