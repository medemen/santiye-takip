import { card } from '../../utils/styles';
import BarChart from '../BarChart';
import type { DonutVeri } from './RaporDagilimiKart';

interface Props {
  data: DonutVeri[];
}

export default function AdaBazindaIlerlemeKart({ data }: Props) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 8 }}>
        Ada Bazında İlerleme
      </h3>
      <BarChart data={data} />
    </div>
  );
}
