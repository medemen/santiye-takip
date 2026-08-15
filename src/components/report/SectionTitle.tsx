export default function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>{children}</div>
  );
}
