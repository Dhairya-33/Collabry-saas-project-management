import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { respondToProjectInvite } from "@/services/projectInvite.service";
import {
  getProjectInvites,
  removeProjectInvite,
} from "@/store/projectInviteSlice";
import { getContributingProjects } from "@/store/projectSlice";
import { getOverview } from "@/store/overviewSlice";

const projectNameOf = (invite) =>
  invite.projectId?.projectName ??
  invite.project?.projectName ??
  invite.projectName ??
  "a project";

export default function NotificationPanel({ open, onClose }) {
  const dispatch = useDispatch();
  const { data: invites, loading, error } = useSelector((s) => s.invites);

  const [busyId, setBusyId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const respond = async (invite, payload) => {
    setBusyId(invite._id);
    setActionError("");
    try {
      await respondToProjectInvite({ projectInviteId: invite._id, ...payload });
      dispatch(removeProjectInvite(invite._id));
      setDecliningId(null);
      setReason("");
      if (payload.status === "accepted") {
        dispatch(getContributingProjects());
        dispatch(getOverview());
      }
    } catch (err) {
      setActionError(err.message || "Could not respond to the invite");
    } finally {
      setBusyId(null);
    }
  };

  const accept = (invite) => respond(invite, { status: "accepted" });

  const decline = (invite) => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setActionError("A reason is required to decline");
      return;
    }
    respond(invite, { status: "rejected", reason: trimmed });
  };

  const startDecline = (invite) => {
    setDecliningId(invite._id);
    setReason("");
    setActionError("");
  };

  return (
    <>
      {open && (
        <div onClick={onClose} className="absolute inset-0 z-40" />
      )}

      <div
        role="dialog"
        aria-label="Notifications"
        aria-hidden={!open}
        inert={!open}
        className={`absolute top-0 right-0 z-50 h-full w-80 overflow-y-auto bg-surface-elevated border-l border-border-subtle shadow-card transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 space-y-6">
          <div className="text-lg font-semibold">
            Notifications
          </div>

          {loading && invites === null && (
            <div className="text-sm text-text-muted">Loading invites…</div>
          )}

          {error && invites === null && !loading && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-status-error">
                {error}
              </p>
              <button
                type="button"
                onClick={() => dispatch(getProjectInvites())}
                className="text-xs text-brand-primary"
              >
                Try again
              </button>
            </div>
          )}

          {invites?.length === 0 && (
            <div className="text-sm text-text-muted">
              No new invites
            </div>
          )}

          {invites?.map((invite) => {
            const busy = busyId === invite._id;
            const declining = decliningId === invite._id;

            return (
              <div
                key={invite._id}
                className="border border-border-subtle rounded-xl p-4 space-y-3"
              >
                <div className="text-sm">
                  {projectNameOf(invite)} invited you
                </div>

                {declining ? (
                  <div className="space-y-2">
                    <label
                      htmlFor={`reason-${invite._id}`}
                      className="label"
                    >
                      Reason for declining
                    </label>
                    <textarea
                      id={`reason-${invite._id}`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="textarea !h-20"
                    />
                    <div className="flex gap-3 text-xs">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decline(invite)}
                        className="text-brand-primary font-medium disabled:opacity-60"
                      >
                        {busy ? "Sending…" : "Confirm decline"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDecliningId(null)}
                        className="text-text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => accept(invite)}
                      className="text-brand-primary font-medium disabled:opacity-60"
                    >
                      {busy ? "Sending…" : "Accept"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startDecline(invite)}
                      className="text-text-muted disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {actionError && (
            <p role="alert" className="text-xs text-status-error">
              {actionError}
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-text-muted mt-6"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
