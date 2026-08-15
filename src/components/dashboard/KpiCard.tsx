import ProgressBar from '../ProgressBar';
import { card } from '../../utils/styles';

interface Props {
  label: string;
  value: string | number;
  color: string;
  progress?: number;
}

export default function KpiCard({ label, value, color, progress }: Props) {
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      {progress !== undefined && (
        <div style={{ marginTop: 8 }}>
          <ProgressBar value={progress} height={8} />
        </div>
      )}
    </div>
  );
}
