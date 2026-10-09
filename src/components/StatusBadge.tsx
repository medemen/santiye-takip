import { memo } from 'react';
import type { IsDurumu } from '../types';
import { DURUM_LABELLARI } from '../config/defaultConfig';

interface Props {
  durum: IsDurumu;
  size?: 'sm' | 'md';
}

// DURUM_RENKLERI grafiklerde (Donut/Bar) kullanilir; burada 4.5:1'i karsilayan
// sabit metin/zemin ciftleri verilir. Beyaz metin mavi/yesil pastel ustunde
// yeterli kontrasti bulamaz; koyu metin kezbanagi (amber) ustunde gecer.
const BADGE_RENKLERI: Record<IsDurumu, { bg: string; fg: string }> = {
  planlandi: { bg: '#f59e0b', fg: '#1f2937' },
  devam_ediyor: { bg: '#2563eb', fg: '#ffffff' },
  tamamlandi: { bg: '#15803d', fg: '#ffffff' },
  gecikme: { bg: '#ef4444', fg: '#ffffff' },
};

const StatusBadge = memo(function StatusBadge({ durum, size = 'md' }: Props) {
  const { bg, fg } = BADGE_RENKLERI[durum];
  const label = DURUM_LABELLARI[durum];
  const fontSize = size === 'sm' ? 11 : 13;
  const padding = size === 'sm' ? '2px 8px' : '4px 12px';

  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        fontSize,
        fontWeight: 600,
        color: fg,
        backgroundColor: bg,
        borderRadius: 12,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
});

export default StatusBadge;
