export default function NotificationPanel({ open, onClose }) {
  const invites = [
    { id: 1, project: "Project Alpha" },
    { id: 2, project: "Project Beta" },
  ];

  return (
    <div
      className={`absolute top-0 right-0 h-full w-80 bg-surface-elevated border-l border-border-subtle shadow-card transition-transform duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-6 space-y-6">
        <div className="text-lg font-semibold">
          Notifications
        </div>

        {invites.length === 0 && (
          <div className="text-sm text-text-muted">
            No new invites
          </div>
        )}

        {invites.map((invite) => (
          <div
            key={invite.id}
            className="border border-border-subtle rounded-xl p-4 space-y-3"
          >
            <div className="text-sm">
              {invite.project} invited you
            </div>
            <div className="flex gap-3 text-xs">
              <button className="text-brand-primary">
                Accept
              </button>
              <button className="text-text-muted">
                Decline
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={onClose}
          className="text-xs text-text-muted mt-6"
        >
          Close
        </button>
      </div>
    </div>
  );
}
