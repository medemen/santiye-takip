import TrendChart from '../TrendChart';
import { card } from '../../utils/styles';

export interface TrendNokta {
  label: string;
  value: number;
}

interface Props {
  veri: TrendNokta[];
}

export default function TrendKart({ veri }: Props) {
  return (
    <div style={{ ...card }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', margin: 0, marginBottom: 8 }}>
        Zaman Trendi
      </h3>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Son 14 gün rapor hacmi</div>
      <TrendChart data={veri} />
    </div>
  );
}
