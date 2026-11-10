import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  FolderKanban,
  RefreshCw,
  ShieldOff,
  Trash2,
  UserPlus,
  MailPlus,
} from "lucide-react";
import {
  getProjectByIdThunk,
  getProjectMembersThunk,
  addMemberThunk,
  removeMemberThunk,
  createInviteThunk,
} from "@/store/projectSlice";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getCompanyMembers } from "@/store/memberSlice";

/* ── helpers ──────────────────────────────────────────── */
const ROLE_LABEL = { admin: "Admin", manager: "Manager", employee: "Employee" };

function rolePill(role) {
  const base = "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium";
  if (role === "admin") return `${base} bg-brand-primary/10 text-brand-primary`;
  if (role === "manager") return `${base} bg-accent-muted text-brand-primary`;
  return `${base} bg-background-subtle text-text-secondary`;
}

function canManage(role) {
  return role === "admin" || role === "manager";
}

/* ── Add-member modal ─────────────────────────────────── */
function AddMemberModal({ open, onClose, onAdded, projectId }) {
  const dispatch = useDispatch();
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersErr, setMembersErr] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { empId: "" } });

  const loadMembers = useCallback(async () => {
    setMembersErr("");
    setCompanyMembers([]);
    setLoadingMembers(true);
    try {
      const res = await dispatch(getCompanyMembers()).unwrap();
      const list = Array.isArray(res?.members) ? res.members : [];
      setCompanyMembers(list);
      if (!list.length) setMembersErr("No company members available.");
    } catch {
      setMembersErr("Could not load company members.");
    } finally {
      setLoadingMembers(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (open) loadMembers();
  }, [open, loadMembers]);

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    setMembersErr("");
    setCompanyMembers([]);
    onClose();
  };

  const onSubmit = async ({ empId }) => {
    if (!empId) {
      setError("empId", { message: "Select a member." });
      return;
    }
    try {
      await dispatch(addMemberThunk({ empId, projectId })).unwrap();
      reset();
      onClose();
      onAdded?.();
    } catch (err) {
      setError("root", { message: err || "Could not add member." });
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-text-primary/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-member-title"
        className="w-full max-w-sm rounded-2xl bg-surface-base p-6 shadow-card"
      >
        <h2 id="add-member-title" className="mb-4 text-base font-semibold text-text-primary">
          Add member
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="am-empId" className="label">
              Company member <span className="text-status-error">*</span>
            </label>
            <select
              id="am-empId"
              {...register("empId", { required: "Select a member." })}
              disabled={loadingMembers || !companyMembers.length}
              className="input w-full disabled:opacity-60"
            >
              <option value="">
                {loadingMembers ? "Loading…" : "Select a member"}
              </option>
              {companyMembers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.fullname || m.username || m.email}
                </option>
              ))}
            </select>
            {errors.empId && (
              <p role="alert" className="mt-1 text-xs text-status-error">{errors.empId.message}</p>
            )}
            {membersErr && (
              <p role="alert" className="mt-1 text-xs text-status-error">{membersErr}</p>
            )}
          </div>

          {errors.root && (
            <p role="alert" className="text-sm text-status-error">{errors.root.message}</p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-primary disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loadingMembers || !companyMembers.length}
              className="rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-inverse disabled:opacity-60"
            >
              {isSubmitting ? "Adding…" : "Add member"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* ── Invite modal ─────────────────────────────────────── */
function InviteModal({ open, onClose, onInvited, projectId }) {
  const dispatch = useDispatch();
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersErr, setMembersErr] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { inviteeId: "" } });

  const loadMembers = useCallback(async () => {
    setMembersErr("");
    setCompanyMembers([]);
    setLoadingMembers(true);
    try {
      const res = await dispatch(getCompanyMembers()).unwrap();
      const list = Array.isArray(res?.members) ? res.members : [];
      setCompanyMembers(list);
      if (!list.length) setMembersErr("No company members available to invite.");
    } catch {
      setMembersErr("Could not load company members.");
    } finally {
      setLoadingMembers(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (open) loadMembers();
  }, [open, loadMembers]);

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    setMembersErr("");
    setCompanyMembers([]);
    onClose();
  };

  const onSubmit = async ({ inviteeId }) => {
    if (!inviteeId) {
      setError("inviteeId", { message: "Select a member to invite." });
      return;
    }
    try {
      await dispatch(createInviteThunk({ inviteeId, projectId })).unwrap();
      reset();
      onClose();
      onInvited?.();
    } catch (err) {
      setError("root", { message: err || "Could not send invite." });
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-text-primary/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        className="w-full max-w-sm rounded-2xl bg-surface-base p-6 shadow-card"
      >
        <h2 id="invite-title" className="mb-4 text-base font-semibold text-text-primary">
          Invite to project
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="inv-inviteeId" className="label">
              Company member <span className="text-status-error">*</span>
            </label>
            <select
              id="inv-inviteeId"
              {...register("inviteeId", { required: "Select a member to invite." })}
              disabled={loadingMembers || !companyMembers.length}
              className="input w-full disabled:opacity-60"
            >
              <option value="">
                {loadingMembers ? "Loading…" : "Select a member"}
              </option>
              {companyMembers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.fullname || m.username || m.email}
                </option>
              ))}
            </select>
            {errors.inviteeId && (
              <p role="alert" className="mt-1 text-xs text-status-error">{errors.inviteeId.message}</p>
            )}
            {membersErr && (
              <p role="alert" className="mt-1 text-xs text-status-error">{membersErr}</p>
            )}
          </div>

          {errors.root && (
            <p role="alert" className="text-sm text-status-error">{errors.root.message}</p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-primary disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loadingMembers || !companyMembers.length}
              className="rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-inverse disabled:opacity-60"
            >
              {isSubmitting ? "Sending…" : "Send invite"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* ── Members section ──────────────────────────────────── */
function MembersSection({ projectId }) {
  const dispatch = useDispatch();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  // confirm remove
  const [confirm, setConfirm] = useState({ open: false, member: null });

  // modals
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    setActionError("");
    try {
      const result = await dispatch(getProjectMembersThunk(projectId)).unwrap();
      if (isMounted.current) setMembers(Array.isArray(result) ? result : []);
    } catch {
      if (isMounted.current) setLoadFailed(true);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [dispatch, projectId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRemoveClick = (member) => {
    const name = member.userId?.fullname || member.userId?.username || "this member";
    setConfirm({
      open: true,
      member,
      title: `Remove "${name}"?`,
      message: "They will lose access to this project immediately.",
    });
  };

  const confirmRemove = async () => {
    const { member } = confirm;
    setConfirm({ open: false, member: null });
    if (!member) return;

    setActionError("");
    setNotice("");
    try {
      await dispatch(
        removeMemberThunk({ empId: member.userId?._id, projectId })
      ).unwrap();
      setNotice("Member removed.");
      await loadMembers();
    } catch (err) {
      setActionError(typeof err === "string" ? err : "Could not remove member.");
    }
  };

  if (loading && !members.length) {
    return (
      <div className="mt-6 space-y-3" aria-label="Loading members">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-base p-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div
        role="alert"
        className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-status-error/20 bg-status-error/5 px-6 py-8 text-center"
      >
        <AlertCircle size={28} className="text-status-error" aria-hidden="true" />
        <p className="text-sm text-text-secondary">Could not load members.</p>
        <button
          type="button"
          onClick={loadMembers}
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-text-inverse hover:opacity-90"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text-primary">Members</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setNotice(""); setActionError(""); setInviteOpen(true); }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-base px-3.5 py-2 text-sm font-medium text-text-primary transition hover:bg-background-subtle"
          >
            <MailPlus size={15} aria-hidden="true" />
            Invite
          </button>
          <button
            type="button"
            onClick={() => { setNotice(""); setActionError(""); setAddOpen(true); }}
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-3.5 py-2 text-sm font-medium text-text-inverse transition hover:opacity-90"
          >
            <UserPlus size={15} aria-hidden="true" />
            Add member
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-status-success/20 bg-status-success/5 px-4 py-2.5 text-sm text-status-success">
          {notice}
        </p>
      )}

      {actionError && (
        <p role="alert" className="rounded-xl border border-status-error/20 bg-status-error/5 px-4 py-2.5 text-sm text-status-error">
          {actionError}
        </p>
      )}

      {/* Member list */}
      {members.length === 0 ? (
        <EmptyState
          title="No members yet"
          description="Add or invite company members to collaborate on this project."
        />
      ) : (
        <ul className="space-y-3">
          {members.map((m) => {
            const user = m.userId;
            return (
              <li
                key={m._id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface-base p-4"
              >
                <Avatar
                  user={user}
                  className="h-9 w-9 bg-accent-muted text-brand-primary text-sm font-semibold"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {user?.fullname || user?.username || "Unknown"}
                  </p>
                  <p className="truncate text-xs text-text-secondary">{user?.email || ""}</p>
                </div>
                <span className={rolePill(m.role)}>{ROLE_LABEL[m.role] ?? m.role}</span>
                {/* Only allow removing employees; admins/managers cannot be removed this way */}
                {m.role === "employee" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveClick(m)}
                    aria-label={`Remove ${user?.fullname || user?.username || "member"}`}
                    className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-status-error transition hover:bg-status-error/10"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setConfirm({ open: false, member: null })}
        danger
      />

      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={loadMembers}
        projectId={projectId}
      />

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => setNotice("Invite sent.")}
        projectId={projectId}
      />
    </div>
  );
}

/* ── Skeleton for initial page load ──────────────────── */
function PageSkeleton() {
  return (
    <section className="space-y-6" aria-label="Loading project">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="rounded-2xl border border-border bg-surface-base p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </section>
  );
}

/* ── Main page ────────────────────────────────────────── */
export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const dispatch = useDispatch();

  const [data, setData] = useState(null);   // { project, role, manager }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);  // null | { status, message }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dispatch(getProjectByIdThunk(projectId)).unwrap();
      setData(result);
    } catch (err) {
      const status = typeof err === "object" && err?.status ? err.status : 0;
      const msg =
        typeof err === "object" && err?.message
          ? err.message
          : typeof err === "string"
            ? err
            : err?.message || "Failed to load project";
      const is403 =
        status === 403 ||
        msg.toLowerCase().includes("not a member") ||
        msg.toLowerCase().includes("403");
      setError({ status: is403 ? 403 : status, message: msg });
    } finally {
      setLoading(false);
    }
  }, [dispatch, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageSkeleton />;

  if (error) {
    if (error.status === 403) {
      return (
        <section className="space-y-6">
          <BackLink />
          <div
            role="alert"
            className="flex flex-col items-center gap-4 rounded-2xl border border-status-error/20 bg-status-error/5 px-6 py-14 text-center"
          >
            <ShieldOff size={40} className="text-status-error" aria-hidden="true" />
            <div>
              <p className="font-semibold text-text-primary">No access</p>
              <p className="mt-1 text-sm text-text-secondary">
                You are not a member of this project.
              </p>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="space-y-6">
        <BackLink />
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-2xl border border-status-error/20 bg-status-error/5 px-6 py-10 text-center"
        >
          <AlertCircle size={36} className="text-status-error" aria-hidden="true" />
          <div>
            <p className="font-semibold text-text-primary">Could not load project</p>
            <p className="mt-1 text-sm text-text-secondary">{error.message}</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-medium text-text-inverse hover:opacity-90"
          >
            <RefreshCw size={15} aria-hidden="true" />
            Retry
          </button>
        </div>
      </section>
    );
  }

  const { project, role, manager } = data ?? {};

  return (
    <section className="space-y-6">
      <BackLink />

      {/* Page heading */}
      <header>
        <div className="flex items-center gap-2 text-brand-primary">
          <FolderKanban size={20} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.12em]">Project</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary">
          {project?.projectName || "Untitled project"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {project?.createdAt
            ? `Created ${new Date(project.createdAt).toLocaleDateString()}`
            : "Project details"}
        </p>
      </header>

      {/* Info card */}
      <div className="rounded-2xl border border-border bg-surface-base p-6 space-y-5">
        {/* Status + viewer role badges */}
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              project?.archived
                ? "bg-background-subtle text-text-secondary"
                : "bg-status-success/10 text-status-success"
            }`}
          >
            {project?.archived ? "Archived" : "Active"}
          </span>
          {role && (
            <span className={rolePill(role)}>
              Your role: {ROLE_LABEL[role] ?? role}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
          {project?.description || "No description provided."}
        </p>

        {/* Manager */}
        {manager && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-text-secondary">
              Manager
            </p>
            <div className="flex items-center gap-3">
              <Avatar
                user={manager}
                className="h-9 w-9 bg-accent-muted text-brand-primary text-sm font-semibold"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {manager.fullname || manager.username}
                </p>
                <p className="truncate text-xs text-text-secondary">{manager.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Members — only for admin or manager */}
      {canManage(role) && (
        <MembersSection projectId={projectId} />
      )}
    </section>
  );
}

/* ── Back link ────────────────────────────────────────── */
function BackLink() {
  return (
    <Link
      to="/projects"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition hover:text-text-primary"
    >
      <ArrowLeft size={15} aria-hidden="true" />
      Back to projects
    </Link>
  );
}
