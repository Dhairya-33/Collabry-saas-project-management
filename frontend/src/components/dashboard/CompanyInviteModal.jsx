import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { X, Copy, RefreshCw, Check } from "lucide-react";
import { fetchCompanyInviteToken } from "@/services/company.service";

export default function CompanyInviteModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  /* =========================================================
     FETCH TOKEN
  ========================================================= */

  const fetchInvite = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchCompanyInviteToken();
      const newToken = res?.inviteToken;

      if (!newToken) throw new Error("Invalid token response");

      setToken(newToken);
    } catch (err) {
      setError(err?.message || "Failed to generate invite link");
    } finally {
      setLoading(false);
    }
  }, []);

  /* =========================================================
     OPEN EFFECT
  ========================================================= */

  useEffect(() => {
    if (open) fetchInvite();
  }, [open, fetchInvite]);

  /* =========================================================
     ESC CLOSE
  ========================================================= */

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  /* =========================================================
     OUTSIDE CLICK CLOSE
  ========================================================= */

  useEffect(() => {
    const handleClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  /* =========================================================
     URL + MASK
  ========================================================= */

  const inviteUrl = useMemo(() => {
  if (!token) return "";

  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  if (!baseUrl) return "";

  return `${baseUrl}/invite/${token}`;
}, [token]);

  const maskedUrl = useMemo(() => {
    if (!inviteUrl) return "";
    if (inviteUrl.length <= 50) return inviteUrl;

    const start = inviteUrl.slice(0, 35);
    const end = inviteUrl.slice(-12);
    return `${start}...${end}`;
  }, [inviteUrl]);

  /* =========================================================
     COPY
  ========================================================= */

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
    <div className="fixed inset-0 z-[100]">

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">

        <div
          ref={modalRef}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[rgb(var(--color-border-subtle)/0.1)] p-6"
        >

          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold text-[rgb(var(--color-text-primary))]">
              Company Invite Link
            </h2>
            <button
              onClick={onClose}
              className="text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-primary))]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          {loading ? (
            <div className="py-6 text-sm text-center text-[rgb(var(--color-text-secondary))]">
              Generating secure link...
            </div>
          ) : error ? (
            <div className="text-sm text-[rgb(var(--color-status-error))]">
              {error}
            </div>
          ) : (
            <>
              <div className="bg-[rgb(var(--color-background-subtle))] p-3 rounded-xl text-xs text-[rgb(var(--color-text-secondary))] font-mono tracking-wide">
                {maskedUrl}
              </div>

              <div className="text-xs mt-2 text-[rgb(var(--color-text-muted))]">
                Expires in 24 hours
              </div>

              <div className="flex gap-2 mt-4">

                <button
                  onClick={copyToClipboard}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[rgb(var(--color-brand-primary))] text-white text-sm"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>

                <button
                  onClick={fetchInvite}
                  className="px-3 py-2 rounded-xl border border-[rgb(var(--color-border-subtle)/0.2)] hover:bg-[rgb(var(--color-background-subtle))]"
                >
                  <RefreshCw size={14} />
                </button>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}