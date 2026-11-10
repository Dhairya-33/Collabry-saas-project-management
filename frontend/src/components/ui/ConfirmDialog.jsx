/**
 * Lightweight inline confirm dialog — replaces window.confirm.
 *
 * Props:
 *   open        – boolean
 *   title       – string
 *   message     – string
 *   confirmLabel – string (default "Confirm")
 *   cancelLabel  – string (default "Cancel")
 *   onConfirm   – () => void
 *   onCancel    – () => void
 *   danger      – boolean — styles the confirm button as destructive
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-text-primary/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-2xl bg-surface-base p-6 shadow-card"
      >
        {title && (
          <h2 id="confirm-dialog-title" className="mb-2 text-base font-semibold text-text-primary">
            {title}
          </h2>
        )}
        {message && (
          <p className="text-sm text-text-secondary">{message}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-background-subtle"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-full px-4 py-2 text-sm font-medium text-text-inverse ${
              danger
                ? "bg-status-error hover:opacity-90"
                : "bg-brand-primary hover:opacity-90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
