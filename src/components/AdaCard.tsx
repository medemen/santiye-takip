import { memo } from 'react';
import type { Blok } from '../types';
import { getSantiyeSefi } from '../data/personelData';
import { getAdaGenelIlerleme } from '../store/reportStore';
import { IS_KALEMLERI } from '../data/isKalemleri';
import ProgressBar from './ProgressBar';

interface Props {
  ada: string;
  blokSayisi: number;
  toplamDaire: number;
  toplamKat: number;
  bloklar: Blok[];
  onClick?: () => void;
}

const AdaCard = memo(function AdaCard({ ada, blokSayisi, toplamDaire, toplamKat, bloklar, onClick }: Props) {
  const santiyeSefi = getSantiyeSefi(ada);
  const ilerleme = getAdaGenelIlerleme(ada, bloklar, IS_KALEMLERI);

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #f0f0f0',
        transition: 'transform 0.15s, box-shadow 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: ilerleme === 100 ? '#22c55e' : ilerleme > 50 ? '#3b82f6' : ilerleme > 0 ? '#f59e0b' : '#e5e7eb',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>{ada}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Şef: {santiyeSefi}</div>
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: ilerleme === 100 ? '#22c55e' : ilerleme > 50 ? '#3b82f6' : '#6b7280',
          }}
        >
          %{ilerleme}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13, color: '#4b5563' }}>
        <span>🏗️ {blokSayisi} Blok</span>
        <span>🏠 {toplamDaire} Daire</span>
        <span>📐 {toplamKat} Kat</span>
      </div>
      <ProgressBar value={ilerleme} height={6} />
    </div>
  );
});

export default AdaCard;
