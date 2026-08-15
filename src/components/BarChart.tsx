import { memo } from 'react';

interface DataItem {
  name: string;
  value: number;
  color?: string;
}

interface Props {
  data: DataItem[];
  height?: number;
}

const BarChart = memo(function BarChart({ data, height = 200 }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: 14 }}>
        Henüz veri yok
      </div>
    );
  }

  const chartHeight = height - 24;

  return (
    <div style={{ width: '100%', height }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: chartHeight }}>
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.name}: %${d.value}`}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              height: '100%',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 30,
                height: `${Math.max(0, Math.min(100, d.value))}%`,
                minHeight: d.value > 0 ? 3 : 0,
                backgroundColor: d.color || '#3b82f6',
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                transition: 'height 0.3s ease',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--text-faint)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
});

export default BarChart;
