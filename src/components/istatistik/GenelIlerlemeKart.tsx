import { card } from '../../utils/styles';

interface Props {
  ilerleme: number;
}

export default function GenelIlerlemeKart({ ilerleme }: Props) {
  return (
    <div style={{ ...card, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>Genel İlerleme</span>
        <span style={{ fontSize: 28, fontWeight: 700, color: ilerleme === 100 ? '#22c55e' : '#f59e0b' }}>
          %{ilerleme}
        </span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: 'var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${ilerleme}%`,
            height: '100%',
            borderRadius: 5,
            backgroundColor: ilerleme === 100 ? '#22c55e' : '#f59e0b',
            transition: 'width 0.5s',
          }}
        />
      </div>
    </div>
  );
}
