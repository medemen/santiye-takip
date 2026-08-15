export const card = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: 16,
  padding: 16,
  border: '1px solid var(--border-soft)',
  boxShadow: 'var(--shadow-card)',
};

export const cardSm = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: 12,
  padding: 14,
  border: '1px solid var(--border-soft)',
};

export const btnPrimary = {
  padding: '12px 20px',
  backgroundColor: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

export const btnGhost = {
  background: 'none',
  border: 'none',
  color: 'var(--accent)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
};

export const backButton = {
  ...btnGhost,
  fontSize: 14,
  marginBottom: 12,
};

export const input = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  fontSize: 13,
  boxSizing: 'border-box',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
};

export const label = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-muted)',
  marginBottom: 6,
};

export const pageTitle = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: 0,
  marginBottom: 16,
};

export const emptyState = {
  textAlign: 'center' as const,
  padding: 40,
  color: 'var(--text-subtle)',
  backgroundColor: 'var(--bg-card)',
  borderRadius: 12,
  border: '1px solid var(--border-soft)',
};
