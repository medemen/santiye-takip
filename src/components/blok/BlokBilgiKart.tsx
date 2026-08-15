import type { BlokYapisi } from '../../config/types';

interface Props {
  ada: string;
  blok: BlokYapisi;
  santiyeSefi: string;
  tamamlanan: number;
  devamEden: number;
  geciken: number;
  genelIlerleme: number;
}

export default function BlokBilgiKart({ ada, blok, santiyeSefi, tamamlanan, devamEden, geciken, genelIlerleme }: Props) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {ada} - Blok {blok.blok_no}
        </h1>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6, fontSize: 13, color: 'var(--text-faint)' }}>
        <span style={{ fontWeight: 600 }}>{blok.tip}</span>
        <span>|</span>
        <span>{blok.daire_sayisi} Daire</span>
        <span>|</span>
        <span>{blok.kat_sayisi} Kat</span>
        <span>|</span>
        <span>{blok.yapi_konfigurasyonu}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 12 }}>
        Şantiye Şefi: {santiyeSefi}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: 10,
          backgroundColor: 'var(--bg-page)',
          borderRadius: 10,
          fontSize: 12,
        }}
      >
        <span>✅ {tamamlanan} tamam</span>
        <span>🔵 {devamEden} devam</span>
        <span>⚠️ {geciken} gecikme</span>
        <span style={{ fontWeight: 700, color: '#f59e0b' }}>%{genelIlerleme}</span>
      </div>
    </div>
  );
}
