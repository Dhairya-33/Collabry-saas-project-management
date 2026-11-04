export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {description && (
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
