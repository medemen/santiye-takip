import { memo } from 'react';

interface DataItem {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: DataItem[];
  height?: number;
}

const DonutChart = memo(function DonutChart({ data, height = 220 }: Props) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: 14 }}>
        Henüz veri yok
      </div>
    );
  }

  const total = filtered.reduce((s, d) => s + d.value, 0);
  const RADIUS = 70;
  const STROKE = 30;
  const CIRC = 2 * Math.PI * RADIUS;
  const PADDING = 3;
  const size = RADIUS * 2 + STROKE + 8;
  const center = size / 2;

  let offset = 0;
  const segments = filtered.map((d) => {
    const seg = (d.value / total) * CIRC;
    const dash = Math.max(seg - PADDING, 0.5);
    const el = (
      <circle
        key={d.name}
        cx={center}
        cy={center}
        r={RADIUS}
        fill="none"
        stroke={d.color}
        strokeWidth={STROKE}
        strokeDasharray={`${dash} ${CIRC - dash}`}
        strokeDashoffset={-offset}
      >
        <title>{`${d.name}: ${d.value} adet`}</title>
      </circle>
    );
    offset += seg;
    return el;
  });

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${size} ${size}`}
        style={{ maxHeight: height, maxWidth: height }}
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle cx={center} cy={center} r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth={STROKE} />
          {segments}
        </g>
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8, justifyContent: 'center' }}>
        {filtered.map((d) => (
          <span key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: d.color }} />
            {d.name} ({d.value})
          </span>
        ))}
      </div>
    </div>
  );
});

export default DonutChart;
