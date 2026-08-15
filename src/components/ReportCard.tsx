import { memo, useRef } from 'react';
import type { Rapor } from '../types';
import StatusBadge from './StatusBadge';
import { formatDateTime } from '../utils/helpers';
import { raporPdfExport } from '../utils/exportPdf';

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
          {showActions && (
            <button
              onClick={(e) => { e.stopPropagation(); if (cardRef.current) raporPdfExport(rapor, cardRef.current); }}
              style={{
                background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
                padding: '1px 6px', fontSize: 11, color: 'var(--text-faint)', cursor: 'pointer',
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
    </div>
  );
});

export default ReportCard;
