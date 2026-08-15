import type { Personel } from '../../types';
import { ROL_RENKLERI, ROL_YAZI_RENKLERI } from './rolRenkleri';

interface Props {
  person: Personel;
  isAdmin: boolean;
  onClick: () => void;
  onEdit: () => void;
  bulkMode?: boolean;
  secili?: boolean;
  onToggleSelect?: () => void;
}

export default function PersonelKart({
  person,
  isAdmin,
  onClick,
  onEdit,
  bulkMode,
  secili,
  onToggleSelect,
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: secili ? 'var(--bg-accent)' : 'var(--bg-card)',
        borderRadius: 10,
        padding: '10px 14px',
        border: '1px solid',
        borderColor: secili ? '#f59e0b' : 'var(--border-soft)',
        transition: 'all 0.15s',
      }}
    >
      {bulkMode && (
        <input
          type="checkbox"
          checked={!!secili}
          onChange={onToggleSelect}
          style={{ marginRight: 10, accentColor: '#f59e0b', width: 18, height: 18, cursor: 'pointer' }}
        />
      )}
      <div onClick={bulkMode ? undefined : onClick} style={{ flex: 1, cursor: bulkMode ? 'default' : 'pointer' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{person.ad_soyad}</div>
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            padding: '1px 8px',
            borderRadius: 8,
            backgroundColor: ROL_RENKLERI[person.rol] || 'var(--bg-subtle)',
            color: ROL_YAZI_RENKLERI[person.rol] || 'var(--text-muted)',
            marginTop: 2,
          }}
        >
          {person.rol}
        </span>
      </div>
      {isAdmin && !bulkMode && (
        <button
          onClick={onEdit}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 13,
            color: 'var(--text-faint)',
            cursor: 'pointer',
            marginLeft: 8,
          }}
          title="Düzenle"
        >
          ✏️
        </button>
      )}
    </div>
  );
}
