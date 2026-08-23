import { memo } from 'react';

interface Props {
  value: number;
  height?: number;
  label?: string;
  color?: string;
}

const ProgressBar = memo(function ProgressBar({ value, height = 8, label, color }: Props) {
  // NaN/negatif/100 ustu degerlerde CSS width gecersiz olur veya tasarsin
  const guvenli = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const barColor = color || (guvenli === 100 ? '#22c55e' : guvenli > 50 ? '#3b82f6' : guvenli > 0 ? '#f59e0b' : 'var(--border)');
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span>{label}</span>
          <span style={{ fontWeight: 600 }}>%{guvenli}</span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height,
          backgroundColor: 'var(--border)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${guvenli}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
});

export default ProgressBar;
