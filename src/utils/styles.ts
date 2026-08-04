export const card = {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 16,
  border: '1px solid #f0f0f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

export const cardSm = {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 14,
  border: '1px solid #f0f0f0',
};

export const btnPrimary = {
  padding: '12px 20px',
  backgroundColor: '#f59e0b',
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
  color: '#f59e0b',
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
  border: '1px solid #e5e7eb',
  fontSize: 13,
  boxSizing: 'border-box',
};

export const label = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#4b5563',
  marginBottom: 6,
};

export const pageTitle = {
  fontSize: 20,
  fontWeight: 700,
  color: '#1f2937',
  margin: 0,
  marginBottom: 16,
};

export const emptyState = {
  textAlign: 'center' as const,
  padding: 40,
  color: '#9ca3af',
  backgroundColor: '#fff',
  borderRadius: 12,
  border: '1px solid #f0f0f0',
};

export const hover = {
  transition: 'transform 0.15s, box-shadow 0.15s',
};
