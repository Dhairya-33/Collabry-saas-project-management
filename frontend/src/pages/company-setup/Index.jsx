import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";

import { createCompany, joinCompany } from "@/services/company.service";
import { getCurrentUser } from "@/services/auth.service";
/* ================= UTIL ================= */

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

/* ================= MOTION ================= */

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] },
};

/* ================= COMPONENT ================= */

export default function CompanySetup() {
  const navigate = useNavigate();
  const query = useQuery();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [mode, setMode] = useState("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedToken, setConfirmedToken] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({ mode: "onSubmit" });

  const inviteInput = watch("invite");

  /* ================= ON MOUNT ================= */

  useEffect(() => {
    const tokenFromUrl = query.get("token");
    const tokenFromSession = sessionStorage.getItem("inviteToken");

    if (tokenFromUrl && !user) {
      sessionStorage.setItem("inviteToken", tokenFromUrl);
      navigate("/auth", { replace: true });
      return;
    }

    const resolved = tokenFromUrl || tokenFromSession;
    if (resolved) {
      setMode("join");
      setValue("invite", resolved);
    }
  }, [query, user, navigate, setValue]);

  /* ================= TOKEN PARSING ================= */

  const resolvedToken = useMemo(() => {
    if (!inviteInput) return "";
    try {
      const url = new URL(inviteInput);
      return url.searchParams.get("token") || inviteInput;
    } catch {
      return inviteInput;
    }
  }, [inviteInput]);

  /* ================= ACTIONS ================= */

  const refreshUser = async () => {
    const res = await getCurrentUser();
    dispatch(setUser(res.data));
  };

  const onCreate = async (data) => {
    setLoading(true);
    setError("");
    try {
      await createCompany({
        companyName: data.companyName,
        description: data.description || "",
      });
      await refreshUser();
      navigate("/", { replace: true });
    } catch (e) {
      setError(e?.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const confirmInvite = () => {
    if (!resolvedToken) {
      setError("Invite token required");
      return;
    }
    setConfirmedToken(resolvedToken);
  };

  const onJoin = async () => {
    if (!confirmedToken) return;
    setLoading(true);
    setError("");
    try {
      await joinCompany({ token: confirmedToken });
      sessionStorage.removeItem("inviteToken");
      await refreshUser();
      navigate("/", { replace: true });
    } catch (e) {
      setError(e?.message || "Invalid invite token");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="bg-background-app min-h-screen pt-4 px-4">
      <div className="mx-auto max-w-xl">
        <div className="bg-surface-base rounded-2xl border border-border-subtle shadow-card">
          {/* Header */}
          <div className="flex flex-col items-center justify-center px-8 pt-8 pb-6 border-b border-border-subtle">
            <h1 className="text-2xl font-semibold text-text-primary">
              Company setup
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Create a new company or join an existing workspace
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center items-center px-8 pt-4">
            <div className="inline-flex rounded-xl bg-background-subtle p-1">
              {["create", "join"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setMode(t);
                    setConfirmedToken(null);
                    setError("");
                    reset();
                  }}
                  className={`px-5 py-2.5 text-sm rounded-lg transition
                    ${
                      mode === t
                        ? "bg-surface-base shadow-soft text-brand-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                >
                  {t === "create" ? "Create company" : "Join company"}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <AnimatePresence mode="wait">
              {mode === "create" && (
                <motion.form
                  key="create"
                  {...fadeUp}
                  onSubmit={handleSubmit(onCreate)}
                  className="space-y-6"
                >
                  <Field
                    label="Company name"
                    error={errors.companyName?.message}
                  >
                    <input
                      {...register("companyName", { required: "Required" })}
                      className="input"
                      placeholder="Acme Inc."
                    />
                  </Field>

                  <Field label="Description">
                    <textarea
                      {...register("description")}
                      rows={3}
                      className="textarea"
                      placeholder="Optional"
                    />
                  </Field>

                  <PrimaryButton loading={loading}>
                    Create company
                  </PrimaryButton>
                </motion.form>
              )}

              {mode === "join" && (
                <motion.div key="join" {...fadeUp} className="space-y-6">
                  {!confirmedToken && (
                    <>
                      <Field label="Invite link or token">
                        <input
                          {...register("invite")}
                          className="input"
                          placeholder="Paste or type invite token"
                        />
                      </Field>

                      <PrimaryButton
                        loading={false}
                        disabled={!resolvedToken}
                        onClick={confirmInvite}
                      >
                        Continue
                      </PrimaryButton>
                    </>
                  )}

                  {confirmedToken && (
                    <div className="rounded-2xl border border-border-subtle bg-background-subtle p-6 space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-text-muted">
                          You are about to join
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-text-primary">
                           A company's workspace
                        </h3>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-surface-base border border-border-subtle px-4 py-3 text-sm">
                        <span className="font-mono text-text-primary">
                          {confirmedToken.slice(0, 6)}…
                          {confirmedToken.slice(-4)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmedToken(null);
                            setValue("invite", confirmedToken);
                          }}
                          className="text-text-secondary hover:text-text-primary"
                        >
                          Edit
                        </button>
                      </div>

                      <PrimaryButton loading={loading} onClick={onJoin}>
                        Join company
                      </PrimaryButton>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p className="mt-6 text-sm text-status-warning">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= PRIMITIVES ================= */

function Field({ label, error, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
        <label className="text-sm font-medium text-text-primary">
          {label}
        </label>
        <span className="text-xs text-text-muted">
          {error || ""}
        </span>
      </div>
      {children}
    </div>
  );
}

function PrimaryButton({ children, loading, disabled, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      {...props}
      className="w-full h-12 rounded-xl bg-brand-primary text-text-inverse font-medium transition
                 hover:brightness-[1.02]
                 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

