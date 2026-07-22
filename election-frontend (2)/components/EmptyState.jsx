export default function EmptyState({ icon = '📭', title, subtitle }) {
  return (
    <div className="text-center py-5 it-fade-in">
      <div style={{ fontSize: '3rem' }}>{icon}</div>
      <h5 className="fw-semibold mt-2">{title}</h5>
      {subtitle && <p className="text-muted">{subtitle}</p>}
    </div>
  );
}
