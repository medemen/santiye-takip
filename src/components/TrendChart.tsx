import { memo } from 'react';

export interface TrendPoint {
  label: string;
  value: number;
}

interface Props {
  data: TrendPoint[];
  height?: number;
}

const W = 560;
const H = 210;
const PL = 30;
const PR = 12;
const PT = 14;
const PB = 22;
const plotW = W - PL - PR;
const plotH = H - PT - PB;

const TrendChart = memo(function TrendChart({ data, height = H }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
        Henüz veri yok
      </div>
    );
  }

  const yMax = Math.max(5, Math.ceil(Math.max(...data.map((d) => d.value)) / 5) * 5);
  const stepX = plotW / Math.max(1, data.length - 1);
  const x = (i: number) => PL + i * stepX;
  const y = (v: number) => PT + plotH - (v / yMax) * plotH;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${PT + plotH} L ${PL} ${PT + plotH} Z`;

  return (
    <div style={{ width: '100%' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Zaman trendi">
        {[0, 0.5, 1].map((f) => {
          const gy = y(yMax * f);
          return (
            <line key={f} x1={PL} x2={W - PR} y1={gy} y2={gy} stroke="#f3f4f6" strokeWidth={1} />
          );
        })}
        <text x={PL - 6} y={y(yMax) + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{yMax}</text>
        <text x={PL - 6} y={y(yMax / 2) + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{yMax / 2}</text>
        <text x={PL - 6} y={PT + plotH} textAnchor="end" fontSize={9} fill="#9ca3af">0</text>
        <path d={area} fill="rgba(245,158,11,0.14)" />
        <path d={line} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.value)} r={2.5} fill="#f59e0b">
            <title>{`${d.label}: ${d.value} rapor`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: 'flex', marginLeft: PL - 2, marginRight: PR - 2 }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 9,
              color: '#9ca3af',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
});

export default TrendChart;
