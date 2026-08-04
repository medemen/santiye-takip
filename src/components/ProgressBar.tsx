import { memo } from 'react';

interface Props {
  value: number;
  height?: number;
  label?: string;
  color?: string;
}

const ProgressBar = memo(function ProgressBar({ value, height = 8, label, color }: Props) {
  const barColor = color || (value === 100 ? '#22c55e' : value > 50 ? '#3b82f6' : value > 0 ? '#f59e0b' : '#e5e7eb');
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span>{label}</span>
          <span style={{ fontWeight: 600 }}>%{value}</span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height,
          backgroundColor: '#e5e7eb',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${value}%`,
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
