import { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import { X, Copy, RefreshCw, Check, Link as LinkIcon, AlertCircle } from "lucide-react";
import { generateCompanyInviteThunk } from "@/store/memberSlice";

export default function MemberInviteModal({ open, onClose }) {
  const dispatch = useDispatch();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const fetchInvite = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dispatch(generateCompanyInviteThunk()).unwrap();
      const newToken = res?.inviteToken;
      if (!newToken) throw new Error("Invalid token received from server");
      setToken(newToken);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to generate invite link");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (open) {
      fetchInvite();
    } else {
      setToken(null);
      setCopied(false);
      setError(null);
    }
  }, [open, fetchInvite]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const inviteUrl = useMemo(() => {
    if (!token) return "";
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `${baseUrl}/invite/${token}`;
  }, [token]);

  const copyToClipboard = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard permission denied");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-text-primary/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        className="w-full max-w-md rounded-2xl bg-surface-base p-6 shadow-card border border-border"
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 text-brand-primary">
            <LinkIcon size={20} aria-hidden="true" />
            <h2 id="invite-modal-title" className="text-base font-semibold text-text-primary">
              Company Invite Link
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1 text-text-secondary hover:bg-background-subtle hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-text-secondary">
              Generating secure invite link…
            </div>
          ) : error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-status-error/20 bg-status-error/5 p-3 text-xs text-status-error"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                Share this link to invite team members to your company. Link expires in 24 hours.
              </p>

              <div className="rounded-xl border border-border bg-background-subtle p-3 text-xs font-mono break-all text-text-primary select-all">
                {inviteUrl}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-inverse hover:opacity-90"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Link Copied!" : "Copy Invite Link"}
                </button>
                <button
                  type="button"
                  onClick={fetchInvite}
                  title="Generate new link"
                  aria-label="Generate new link"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-surface-base px-3.5 py-2.5 text-text-primary hover:bg-background-subtle"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </>
          )}

          <div className="flex justify-end pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-background-subtle"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
