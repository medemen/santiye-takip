import { memo } from 'react';

export interface GrupVeri {
  label: string;
  uygulama: number | null;
  resmi: number | null;
}

interface Props {
  veri: GrupVeri[];
  height?: number;
}

const GroupedBarChart = memo(function GroupedBarChart({ veri, height = 220 }: Props) {
  const gecerli = veri.filter((v) => v.uygulama !== null || v.resmi !== null);
  if (gecerli.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: 14 }}>
        Henüz veri yok
      </div>
    );
  }

  const chartHeight = height - 24;

  return (
    <div style={{ width: '100%', height }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: chartHeight }}>
        {veri.map((v, i) => {
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%', justifyContent: 'center' }}>
                {v.uygulama !== null && (
                  <div
                    title={`${v.label} Uygulama: %${v.uygulama}`}
                    style={{ flex: 1, maxWidth: 12, height: `${Math.max(0, Math.min(100, v.uygulama))}%`, minHeight: v.uygulama > 0 ? 3 : 0, backgroundColor: '#f59e0b', borderTopLeftRadius: 3, borderTopRightRadius: 3 }}
                  />
                )}
                {v.resmi !== null && (
                  <div
                    title={`${v.label} Resmi: %${v.resmi}`}
                    style={{ flex: 1, maxWidth: 12, height: `${Math.max(0, Math.min(100, v.resmi))}%`, minHeight: v.resmi > 0 ? 3 : 0, backgroundColor: '#3b82f6', borderTopLeftRadius: 3, borderTopRightRadius: 3 }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {veri.map((v, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {v.label}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6, fontSize: 11, color: 'var(--text-faint)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#f59e0b' }} /> Uygulama
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#3b82f6' }} /> Resmi
        </span>
      </div>
    </div>
  );
});

export default GroupedBarChart;
