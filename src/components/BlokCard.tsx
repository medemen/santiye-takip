import { memo, useMemo } from 'react';
import type { Blok, IsDurumu } from '../types';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';
import { getBlokProgress, getBlokRaporlari } from '../store/reportStore';
import { IS_KALEMLERI } from '../data/isKalemleri';

interface Props {
  ada: string;
  blok: Blok;
  onClick?: () => void;
}

const BlokCard = memo(function BlokCard({ ada, blok, onClick }: Props) {
  const blokOzelRaporlar = useMemo(
    () => getBlokRaporlari(ada, blok.blok_no),
    [ada, blok.blok_no]
  );
  const progress = useMemo(
    () => getBlokProgress(ada, blok.blok_no, IS_KALEMLERI),
    [ada, blok.blok_no]
  );
  const isKalemleri = IS_KALEMLERI;

  const { tamamlanan, geciken, sonDurum } = useMemo(() => {
    let t = 0, g = 0;
    let son: IsDurumu | null = null;
    for (const ik of isKalemleri) {
      const sonRapor = progress[ik];
      if (sonRapor) {
        if (sonRapor.durum === 'tamamlandi') t++;
        if (sonRapor.durum === 'gecikme') g++;
        if (!son) son = sonRapor.durum;
      }
    }
    return { tamamlanan: t, geciken: g, sonDurum: son };
  }, [progress, isKalemleri]);

  const genelIlerleme = isKalemleri.length > 0 ? Math.round((tamamlanan / isKalemleri.length) * 100) : 0;
  const adaGenelinden = blokOzelRaporlar.length === 0;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
        transition: 'transform 0.15s, box-shadow 0.15s',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
            Blok {blok.blok_no}
          </div>
          {adaGenelinden && (
            <span
              style={{
                fontSize: 9,
                backgroundColor: '#fef3c7',
                color: '#92400e',
                padding: '1px 6px',
                borderRadius: 8,
                whiteSpace: 'nowrap',
              }}
              title="Bu blok için özel rapor yok; ada geneli DURUM TESPİT verileri gösteriliyor"
            >
              Ada Geneli
            </span>
          )}
        </div>
        {sonDurum && <StatusBadge durum={sonDurum} size="sm" />}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
        {blok.tip} | {blok.daire_sayisi} Daire | {blok.kat_sayisi} Kat
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
        {blok.yapi_konfigurasyonu}
      </div>
      <ProgressBar value={genelIlerleme} height={6} label={`${tamamlanan}/${isKalemleri.length} iş kalemi`} />
      {geciken > 0 && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444', fontWeight: 500 }}>
          ⚠ {geciken} gecikme
        </div>
      )}
    </div>
  );
});

export default BlokCard;
