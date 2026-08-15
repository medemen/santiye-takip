import type { CSSProperties } from 'react';
import type { Blok } from '../../types';

interface Props {
  bloklar: Blok[];
  seciliTip: string;
  onTipSec: (tip: string) => void;
}

export default function BlokTipFilter({ bloklar, seciliTip, onTipSec }: Props) {
  const tipler = [...new Set(bloklar.map((b) => b.tip))];

  const chipStili = (aktif: boolean): CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 20,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    backgroundColor: aktif ? '#f59e0b' : 'var(--bg-subtle)',
    color: aktif ? '#fff' : 'var(--text-muted)',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
      <button onClick={() => onTipSec('')} style={chipStili(seciliTip === '')}>
        Tümü ({bloklar.length})
      </button>
      {tipler.map((t) => (
        <button key={t} onClick={() => onTipSec(t)} style={chipStili(seciliTip === t)}>
          {t} ({bloklar.filter((b) => b.tip === t).length})
        </button>
      ))}
    </div>
  );
}
