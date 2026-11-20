import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  UserMinus,
  UserCheck,
  UserPlus,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { getCompanyMembers, removeCompanyMemberThunk } from "@/store/memberSlice";
import { getOverview } from "@/store/overviewSlice";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MemberInviteModal from "@/components/members/MemberInviteModal";
import ReassignManagerModal from "@/components/members/ReassignManagerModal";

export default function MembersPage() {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.auth.user);
  const roles = useSelector((s) => s.overview.data?.roles);
  const isAdmin = Boolean(roles?.isAdmin);

  const { data, loading, error } = useSelector((s) => s.members);
  const members = data?.members;

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);

  // Modals & Dialogs
  const [inviteOpen, setInviteOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState({ open: false, member: null });
  const [busyMemberId, setBusyMemberId] = useState("");

  useEffect(() => {
    setInitialLoadFailed(false);
    dispatch(getCompanyMembers())
      .unwrap()
      .catch(() => {
        setInitialLoadFailed(true);
      });
  }, [dispatch]);

  const reload = async () => {
    setActionError("");
    setNotice("");
    setInitialLoadFailed(false);
    try {
      await dispatch(getCompanyMembers()).unwrap();
    } catch (err) {
      setActionError(
        typeof err === "string" ? err : "Could not refresh members. Please try again."
      );
    }
  };

  // Filter members by search input
  const filteredMembers = useMemo(() => {
    const list = Array.isArray(members) ? members : [];
    const query = search.trim().toLowerCase();
    if (!query) return list;

    return list.filter((m) => {
      const name = `${m.fullname || ""} ${m.username || ""}`.toLowerCase();
      const email = (m.email || "").toLowerCase();
      const skills = Array.isArray(m.skills) ? m.skills.join(" ").toLowerCase() : "";
      return name.includes(query) || email.includes(query) || skills.includes(query);
    });
  }, [members, search]);

  const handleRemoveClick = (member) => {
    setConfirmRemove({
      open: true,
      member,
      title: `Remove ${member.fullname || member.username}?`,
      message:
        "This will remove the user from your company and revoke their access to all company projects.",
    });
  };

  const confirmRemoveMember = async () => {
    const { member } = confirmRemove;
    setConfirmRemove({ open: false, member: null });
    if (!member) return;

    setBusyMemberId(member._id);
    setActionError("");
    setNotice("");

    try {
      await dispatch(removeCompanyMemberThunk({ userId: member._id })).unwrap();
      setNotice(
        `"${member.fullname || member.username}" was removed from the company.`
      );
      // Refresh members list and company overview counts
      await Promise.allSettled([
        dispatch(getCompanyMembers()).unwrap(),
        dispatch(getOverview()).unwrap(),
      ]);
    } catch (err) {
      const message =
        typeof err === "string"
          ? err
          : "Failed to remove member. Please check project assignments.";
      setActionError(message);
    } finally {
      setBusyMemberId("");
    }
  };

  const handleManagerReassigned = (pId, newMgrId) => {
    const assignedUser = members?.find((m) => m._id === newMgrId);
    const name = assignedUser ? assignedUser.fullname || assignedUser.username : "Member";
    setNotice(`Project manager reassigned successfully to ${name}.`);
    setActionError("");
    dispatch(getCompanyMembers());
    dispatch(getOverview());
  };

  // ── SKELETON: initial load ────────────────────────────────────────────────
  if (loading && members === undefined && !initialLoadFailed) {
    return <MembersSkeleton />;
  }

  // ── ERROR STATE: initial load failure with no cached data ─────────────────
  if (initialLoadFailed && members === undefined) {
    return (
      <section className="space-y-6">
        <PageHeader
          loading={loading}
          isAdmin={isAdmin}
          onReload={reload}
          onOpenInvite={() => setInviteOpen(true)}
          onOpenReassign={() => setReassignOpen(true)}
        />
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-2xl border border-status-error/20 bg-status-error/5 px-6 py-10 text-center"
        >
          <AlertCircle size={36} className="text-status-error" aria-hidden="true" />
          <div>
            <p className="font-semibold text-text-primary">Could not load members</p>
            <p className="mt-1 text-sm text-text-secondary">
              {error || "Something went wrong while fetching members. Please try again."}
            </p>
          </div>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-medium text-text-inverse hover:opacity-90"
          >
            <RefreshCw size={15} aria-hidden="true" />
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        loading={loading}
        isAdmin={isAdmin}
        totalCount={data?.totalMembers ?? members?.length ?? 0}
        onReload={reload}
        onOpenInvite={() => setInviteOpen(true)}
        onOpenReassign={() => setReassignOpen(true)}
      />

      {/* Success Notice */}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-status-success/20 bg-status-success/5 px-4 py-3 text-sm text-status-success"
        >
          {notice}
        </p>
      )}

      {/* Action / Backend Error Banner */}
      {(actionError || (!initialLoadFailed && error)) && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-status-error/20 bg-status-error/5 px-4 py-3 text-sm text-status-error sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{actionError || error}</span>
          <div className="flex items-center gap-3">
            {actionError?.toLowerCase().includes("reassign") && isAdmin && (
              <button
                type="button"
                onClick={() => setReassignOpen(true)}
                className="font-semibold underline hover:opacity-80"
              >
                Reassign manager now
              </button>
            )}
            <button
              type="button"
              onClick={reload}
              className="font-semibold underline hover:opacity-80"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members by name, email, skill..."
          aria-label="Search company members"
          className="input w-full py-2.5 pl-9 pr-3"
        />
      </div>

      {loading && members !== undefined && (
        <p role="status" className="text-xs text-text-secondary">
          Updating members list…
        </p>
      )}

      {/* Members Grid or Empty State */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          title={search ? "No matching members found" : "No company members found"}
          description={
            search
              ? "Try adjusting your search terms."
              : "Invite team members to collaborate on projects."
          }
          action={
            isAdmin && !search ? (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-inverse hover:opacity-90"
              >
                Invite team member
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => {
            const isSelf = member._id === currentUser?._id;
            const isOwner = isSelf && isAdmin;
            const roleBadge = member.role
              ? member.role
              : isOwner
                ? "Owner"
                : "Member";

            return (
              <article
                key={member._id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface-base p-5 shadow-soft transition"
              >
                <div>
                  {/* Top: Avatar, Name, Role badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        user={member}
                        className="h-12 w-12 bg-background-subtle text-base font-semibold text-text-primary"
                      />
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-text-primary">
                          {member.fullname || member.username}
                        </h2>
                        <p className="truncate text-xs text-text-secondary">
                          @{member.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-brand-primary capitalize">
                        {roleBadge}
                      </span>
                      {isSelf && (
                        <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium text-brand-primary">
                          You
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {member.bio && (
                    <p className="mt-3 text-xs leading-5 text-text-secondary line-clamp-2">
                      {member.bio}
                    </p>
                  )}

                  {/* Contact Info */}
                  <div className="mt-4 space-y-1.5 text-xs text-text-secondary">
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={14} className="shrink-0 text-text-muted" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <Phone size={14} className="shrink-0 text-text-muted" />
                        <span className="truncate">{member.phone}</span>
                      </div>
                    )}
                    {member.createdAt && (
                      <div className="flex items-center gap-2 text-text-muted">
                        <Calendar size={14} className="shrink-0" />
                        <span>
                          Joined {new Date(member.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Skills tags */}
                  {Array.isArray(member.skills) && member.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {member.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-background-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                        >
                          {skill}
                        </span>
                      ))}
                      {member.skills.length > 4 && (
                        <span className="rounded-full bg-background-subtle px-2 py-0.5 text-[11px] font-medium text-text-muted">
                          +{member.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Owner action buttons */}
                {isAdmin && (
                  <div className="mt-5 flex items-center justify-end border-t border-border pt-4">
                    {isSelf ? (
                      <span className="text-xs text-text-muted">
                        Workspace Owner
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveClick(member)}
                        disabled={busyMemberId === member._id}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-status-error hover:bg-status-error/10 transition disabled:opacity-50"
                      >
                        <UserMinus size={14} aria-hidden="true" />
                        {busyMemberId === member._id ? "Removing…" : "Remove"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={confirmRemove.open}
        title={confirmRemove.title}
        message={confirmRemove.message}
        confirmLabel="Remove Member"
        cancelLabel="Cancel"
        onConfirm={confirmRemoveMember}
        onCancel={() => setConfirmRemove({ open: false, member: null })}
        danger
      />

      {/* Invite Modal */}
      <MemberInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      {/* Reassign Manager Modal */}
      <ReassignManagerModal
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        members={members || []}
        onReassigned={handleManagerReassigned}
      />
    </section>
  );
}

/* ── Header ─────────────────────────────────────────────────────────── */
function PageHeader({
  loading,
  isAdmin,
  totalCount,
  onReload,
  onOpenInvite,
  onOpenReassign,
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-brand-primary">
          <Users size={20} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.12em]">
            Company
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary">
          Members {totalCount !== undefined ? `(${totalCount})` : ""}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Team members and project contributors across your workspace.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface-base px-3.5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-background-subtle disabled:opacity-60"
        >
          <RefreshCw size={15} aria-hidden="true" />
          Refresh
        </button>

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={onOpenReassign}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface-base px-3.5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-background-subtle"
            >
              <UserCheck size={16} aria-hidden="true" />
              Reassign Manager
            </button>

            <button
              type="button"
              onClick={onOpenInvite}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition hover:opacity-90"
            >
              <UserPlus size={16} aria-hidden="true" />
              Invite Member
            </button>
          </>
        )}
      </div>
    </header>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────────── */
function MembersSkeleton() {
  return (
    <section className="space-y-6" aria-label="Loading members">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="space-y-4 rounded-2xl border border-border bg-surface-base p-5"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </section>
  );
}
