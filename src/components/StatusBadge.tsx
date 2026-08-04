import { memo } from 'react';
import type { IsDurumu } from '../types';
import { DURUM_RENKLERI, DURUM_LABELLARI } from '../data/isKalemleri';

interface Props {
  durum: IsDurumu;
  size?: 'sm' | 'md';
}

const StatusBadge = memo(function StatusBadge({ durum, size = 'md' }: Props) {
  const color = DURUM_RENKLERI[durum];
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
        color: '#fff',
        backgroundColor: color,
        borderRadius: 12,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
});

export default StatusBadge;
