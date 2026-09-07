import { useTema } from '../hooks/useTema';
import type { TemaSecim } from '../stores/themeStore';

const temaSecenekler: { deger: TemaSecim; ikon: string; etiket: string }[] = [
  { deger: 'light', ikon: '☀️', etiket: 'Açık' },
  { deger: 'dark', ikon: '🌙', etiket: 'Koyu' },
  { deger: 'system', ikon: '🖥️', etiket: 'Sistem' },
];

export default function TemaSecici() {
  const { secim: temaSecim, setSecim: setTemaSecim } = useTema();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        borderRadius: 10,
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
      }}
    >
      {temaSecenekler.map((s) => (
        <button
          key={s.deger}
          onClick={() => setTemaSecim(s.deger)}
          title={`${s.etiket} tema`}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            background: temaSecim === s.deger ? 'var(--bg-card)' : 'transparent',
            border: 'none',
            borderRadius: 7,
            padding: '5px 8px',
            fontSize: 12,
            color: temaSecim === s.deger ? 'var(--accent)' : 'var(--text-faint)',
            fontWeight: temaSecim === s.deger ? 600 : 400,
            cursor: 'pointer',
            minHeight: 44,
            minWidth: 44,
            boxShadow: temaSecim === s.deger ? 'var(--shadow-card)' : 'none',
          }}
        >
          <span style={{ fontSize: 13 }}>{s.ikon}</span>
          <span>{s.etiket}</span>
        </button>
      ))}
    </div>
  );
}