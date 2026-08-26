import { memo, useRef } from 'react';
import type { Rapor } from '../types';
import StatusBadge from './StatusBadge';
import { formatDateTime } from '../utils/helpers';
import { raporPdfExport } from '../utils/exportPdf';
import { toastGoster } from '../stores/toastStore';

interface Props {
  rapor: Rapor;
  onClick?: () => void;
  showActions?: boolean;
}

const ReportCard = memo(function ReportCard({ rapor, onClick, showActions }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 12,
        padding: 14,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {rapor.ada} - {rapor.blok_no === 0 ? (
            <span
              style={{
                backgroundColor: 'var(--bg-accent)',
                color: 'var(--accent-dark)',
                padding: '1px 6px',
                borderRadius: 6,
                fontSize: 11,
              }}
            >
              Ada Geneli
            </span>
          ) : (
            <>Blok {rapor.blok_no}</>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {rapor.onay_durumu === 'beklemede' && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#f59e0b', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}>Onay Bekliyor</span>
          )}
          {rapor.onay_durumu === 'onaylandi' && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>✓</span>
          )}
          {rapor.onay_durumu === 'reddedildi' && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}>Reddedildi</span>
          )}
          {showActions && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!cardRef.current) return;
                Promise.resolve(raporPdfExport(rapor, cardRef.current)).catch(() => {
                  toastGoster('PDF dosyası oluşturulamadı', 'error');
                });
              }}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                padding: '6px 10px', fontSize: 13, lineHeight: 1, color: 'var(--text-faint)', cursor: 'pointer',
                minHeight: 44, minWidth: 44,
              }}
              title="PDF Aktar"
            >
              📄
            </button>
          )}
          <StatusBadge durum={rapor.durum} size="sm" />
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{rapor.is_kalemi}</span>
        {rapor.ilerleme_yuzde > 0 && rapor.durum !== 'tamamlandi' && (
          <span style={{ marginLeft: 8, color: 'var(--text-faint)' }}>%{rapor.ilerleme_yuzde}</span>
        )}
      </div>
      {rapor.aciklama && (
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 6, lineHeight: 1.4 }}>
          {rapor.aciklama}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-subtle)' }}>
        <span>{rapor.raporlayan}</span>
        <span>{formatDateTime(rapor.olusturma_tarihi)}</span>
      </div>
      {rapor.fotograflar && rapor.fotograflar.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {rapor.fotograflar.slice(0, 3).map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <img
                src={url}
                alt={`Fotoğraf ${i + 1}`}
                style={{
                  width: 40, height: 40, objectFit: 'cover',
                  borderRadius: 6, border: '1px solid var(--border-soft)',
                }}
              />
            </a>
          ))}
          {rapor.fotograflar.length > 3 && (
            <span style={{
              width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, border: '1px solid var(--border-soft)',
              fontSize: 10, color: 'var(--text-faint)',
            }}>
              +{rapor.fotograflar.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export default ReportCard;
