import { Fragment, memo, useMemo } from 'react';

export interface AdaMatris {
  ada: string;
  bloklar: number[];
}

interface Props {
  adalar: AdaMatris[];
  ilerleme: Record<string, Record<number, number>>;
  onBlokClick?: (ada: string, blokNo: number) => void;
}

function hucreRengi(v: number): string {
  if (v >= 100) return '#22c55e';
  if (v >= 75) return '#86efac';
  if (v >= 50) return '#fde047';
  if (v >= 25) return '#fdba74';
  if (v > 0) return '#fca5a5';
  return 'var(--bg-subtle)';
}

const hucreStil = {
  width: 30,
  height: 30,
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  fontWeight: 600,
} as const;

const BlokMatrisi = memo(function BlokMatrisi({ adalar, ilerleme, onBlokClick }: Props) {
  const bloklar = useMemo(
    () => Array.from(new Set(adalar.flatMap((a) => a.bloklar))).sort((a, b) => a - b),
    [adalar]
  );

  if (adalar.length === 0 || bloklar.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-subtle)', fontSize: 13 }}>
        Blok verisi yok
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `96px repeat(${bloklar.length}, 30px)`,
          gap: 4,
          width: 'max-content',
        }}
      >
        <div />
        {bloklar.map((b) => (
          <div
            key={b}
            style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, lineHeight: '20px' }}
          >
            {b}
          </div>
        ))}
        {adalar.map((a) => (
          <Fragment key={a.ada}>
            <div
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 1,
                backgroundColor: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              {a.ada}
            </div>
            {bloklar.map((b) => {
              if (!a.bloklar.includes(b)) {
                return <div key={b} style={hucreStil} />;
              }
              const v = ilerleme[a.ada]?.[b] ?? 0;
              return (
                <button
                  key={b}
                  onClick={() => onBlokClick?.(a.ada, b)}
                  title={`${a.ada} - Blok ${b}: %${v}`}
                  style={{
                    ...hucreStil,
                    backgroundColor: hucreRengi(v),
                    color: v > 25 ? 'var(--text-primary)' : 'var(--text-faint)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {v > 0 ? v : '·'}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 10, color: 'var(--text-faint)', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>0%</span>
        {['#fca5a5', '#fdba74', '#fde047', '#86efac', '#22c55e'].map((c) => (
          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c, display: 'inline-block' }} />
          </span>
        ))}
        <span>100%</span>
        <span style={{ marginLeft: 'auto' }}>Hücreye tıklayın → blok sayfası</span>
      </div>
    </div>
  );
});

export default BlokMatrisi;
