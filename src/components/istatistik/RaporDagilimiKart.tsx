import { card } from '../../utils/styles';
import DonutChart from '../DonutChart';

export interface DonutVeri {
  name: string;
  value: number;
  color: string;
}

interface Props {
  donutData: DonutVeri[];
  tamamlanan: number;
  devam: number;
  plan: number;
  gecikme: number;
}

export default function RaporDagilimiKart({ donutData, tamamlanan, devam, plan, gecikme }: Props) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginBottom: 8 }}>
        Rapor Dağılımı
      </h3>
      <DonutChart data={donutData} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginTop: 12,
        }}
      >
        <div style={{ backgroundColor: 'var(--bg-success)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{tamamlanan}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Tamamlandı</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-info)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{devam}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Devam Ediyor</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-accent)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{plan}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Planlandı</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-danger)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{gecikme}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Gecikme</div>
        </div>
      </div>
    </div>
  );
}
