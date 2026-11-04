export default function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-[rgb(var(--color-border-default)/0.12)] ${className}`}
    />
  );
}
