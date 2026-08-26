import { useRef, useState } from 'react';
import { fotografYukle, raporFotografEkle } from '../../stores/reportStore';
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

  const handleDosyaSec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    if (dosya.size > 5 * 1024 * 1024) {
      toastGoster('Dosya boyutu 5MB\'dan küçük olmalı', 'error');
      return;
    }
    setYukleniyor(true);
    try {
      const url = await fotografYukle(raporId, dosya);
      if (url) {
        raporFotografEkle(raporId, url);
        onUpdate([...fotograflar, url]);
        toastGoster('Fotoğraf yüklendi', 'success');
      }
    } finally {
      setYukleniyor(false);
      if (inputRef.current) inputRef.current.value = '';
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
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt={`Fotoğraf ${i + 1}`}
              style={{
                width: 64, height: 64, objectFit: 'cover',
                borderRadius: 8, border: '1px solid var(--border-soft)',
              }}
            />
          </a>
        ))}
        {!disabled && (
          <label
            htmlFor={`foto-${raporId}`}
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
