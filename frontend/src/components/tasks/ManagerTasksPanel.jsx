import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertCircle,
  Calendar,
  Clock,
  ExternalLink,
  FileCheck,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { managerTasks, deleteTask } from "@/store/taskSlice";
import TaskFormModal from "./TaskFormModal";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

/* ── Overdue check ────────────────────────────────────── */
function isTaskOverdue(task) {
  if (task.status === "overdue") return true;
  if (task.status === "completed") return false;
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  return !isNaN(due.getTime()) && due.getTime() < Date.now();
}

/* ── Status badge ─────────────────────────────────────── */
function StatusBadge({ status, isOverdue }) {
  const displayStatus = isOverdue ? "overdue" : status;

  const styles = {
    pending: "bg-background-subtle text-text-secondary",
    "in-progress": "bg-brand-primary/10 text-brand-primary",
    completed: "bg-status-success/10 text-status-success",
    overdue: "bg-status-error/10 text-status-error font-medium",
  };

  const labels = {
    pending: "Pending",
    "in-progress": "In Progress",
    completed: "Completed",
    overdue: "Overdue",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs ${
        styles[displayStatus] || styles.pending
      }`}
    >
      {labels[displayStatus] || displayStatus}
    </span>
  );
}

/* ── Date formatter ───────────────────────────────────── */
function formatDueDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

/**
 * Manager Tasks Panel — displays tasks grouped by assignee for admins & managers.
 *
 * Props:
 *   projectId – string (required)
 *   members   – optional array of project members
 */
export default function ManagerTasksPanel({ projectId, members }) {
  const dispatch = useDispatch();
  const reduxGroups = useSelector((s) => s.tasks?.managerTasks);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  // Modals & Dialogs
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, task: null });

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError("");
    try {
      await dispatch(managerTasks(projectId)).unwrap();
    } catch (err) {
      if (isMounted.current) {
        setError(typeof err === "string" ? err : "Failed to load tasks");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [dispatch, projectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const groups = Array.isArray(reduxGroups) ? reduxGroups : [];
  const totalTasks = groups.reduce((acc, g) => acc + (g.tasks?.length || 0), 0);

  const handleEditClick = (task, employee) => {
    setNotice("");
    setActionError("");
    setEditingTask({
      ...task,
      assignedTo: employee?._id || task.assignedTo,
      employee,
    });
  };

  const handleDeleteClick = (task) => {
    setNotice("");
    setActionError("");
    setConfirmDelete({
      open: true,
      task,
    });
  };

  const handleConfirmDelete = async () => {
    const task = confirmDelete.task;
    setConfirmDelete({ open: false, task: null });
    if (!task?._id) return;

    setActionError("");
    try {
      await dispatch(deleteTask(task._id)).unwrap();
      setNotice(`Task "${task.taskName}" deleted.`);
      await loadTasks();
    } catch (err) {
      setActionError(typeof err === "string" ? err : "Failed to delete task.");
    }
  };

  /* ── Loading Skeleton ─────────────────────────────────── */
  if (loading && totalTasks === 0) {
    return (
      <section className="mt-8 space-y-4" aria-label="Loading tasks">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface-base p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </section>
    );
  }

  /* ── Error state with retry ───────────────────────────── */
  if (error && totalTasks === 0) {
    return (
      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-text-primary">Tasks</h2>
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-2xl border border-status-error/20 bg-status-error/5 px-6 py-8 text-center"
        >
          <AlertCircle size={28} className="text-status-error" aria-hidden="true" />
          <p className="text-sm text-text-secondary">{error}</p>
          <button
            type="button"
            onClick={loadTasks}
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-text-inverse hover:opacity-90"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-4">
      {/* Panel header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Tasks</h2>
          <p className="text-xs text-text-secondary">
            Manage and track employee assignments for this project.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice("");
            setActionError("");
            setAssignModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-3.5 py-2 text-sm font-medium text-text-inverse transition hover:opacity-90"
        >
          <Plus size={15} aria-hidden="true" />
          Assign task
        </button>
      </div>

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-status-success/20 bg-status-success/5 px-4 py-2.5 text-sm text-status-success"
        >
          {notice}
        </p>
      )}

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-status-error/20 bg-status-error/5 px-4 py-2.5 text-sm text-status-error"
        >
          {actionError}
        </p>
      )}

      {/* Empty state */}
      {totalTasks === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-base p-8 text-center">
          <EmptyState
            title="No tasks yet"
            description="Assign tasks to employees to keep this project organized and on schedule."
          />
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setNotice("");
                setActionError("");
                setAssignModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:opacity-90"
            >
              <Plus size={15} aria-hidden="true" />
              Assign task
            </button>
          </div>
        </div>
      ) : (
        /* Tasks grouped by employee */
        <div className="space-y-5">
          {groups.map((group) => {
            const employee = group.employee;
            const empTasks = Array.isArray(group.tasks) ? group.tasks : [];
            if (!empTasks.length) return null;

            return (
              <div
                key={employee?._id || Math.random()}
                className="rounded-2xl border border-border bg-surface-base p-5 shadow-sm space-y-4"
              >
                {/* Employee Header */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      user={employee}
                      className="h-9 w-9 bg-accent-muted text-brand-primary text-sm font-semibold"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {employee?.fullname || employee?.username || "Unknown employee"}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        {employee?.email || ""}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-background-subtle px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    {empTasks.length} {empTasks.length === 1 ? "task" : "tasks"}
                  </span>
                </div>

                {/* Tasks List */}
                <ul className="space-y-3">
                  {empTasks.map((t) => {
                    const overdue = isTaskOverdue(t);
                    const formattedDate = formatDueDate(t.dueDate);

                    return (
                      <li
                        key={t._id}
                        className={`rounded-xl border p-4 transition ${
                          overdue
                            ? "border-status-error/40 bg-status-error/[0.02]"
                            : "border-border bg-background-app/50 hover:bg-background-subtle/50"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          {/* Task Info */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-text-primary">
                                {t.taskName}
                              </h3>
                              <StatusBadge status={t.status} isOverdue={overdue} />
                              {overdue && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-status-error">
                                  <Clock size={12} aria-hidden="true" />
                                  Overdue
                                </span>
                              )}
                            </div>

                            {t.description && (
                              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-text-secondary">
                                {t.description}
                              </p>
                            )}

                            {/* Meta & file links */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs">
                              {/* Due Date */}
                              {formattedDate ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 ${
                                    overdue
                                      ? "font-medium text-status-error"
                                      : "text-text-secondary"
                                  }`}
                                >
                                  <Calendar size={13} aria-hidden="true" />
                                  Due {formattedDate}
                                </span>
                              ) : (
                                <span className="text-text-muted">No due date</span>
                              )}

                              {/* Reference File Link */}
                              {t.fileUrl && (
                                <a
                                  href={t.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-brand-primary underline hover:opacity-80"
                                >
                                  <Paperclip size={13} aria-hidden="true" />
                                  Reference file
                                  <ExternalLink size={11} aria-hidden="true" />
                                </a>
                              )}

                              {/* Employee Submission Link */}
                              {t.submissionUrl && (
                                <a
                                  href={t.submissionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-status-success underline hover:opacity-80"
                                >
                                  <FileCheck size={13} aria-hidden="true" />
                                  Submission file
                                  <ExternalLink size={11} aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-start">
                            <button
                              type="button"
                              onClick={() => handleEditClick(t, employee)}
                              aria-label={`Edit ${t.taskName}`}
                              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-text-primary transition hover:bg-background-subtle"
                            >
                              <Pencil size={12} aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(t)}
                              aria-label={`Delete ${t.taskName}`}
                              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-status-error transition hover:bg-status-error/10"
                            >
                              <Trash2 size={12} aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Task Modal */}
      <TaskFormModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSaved={loadTasks}
        projectId={projectId}
        members={members}
      />

      {/* Edit Task Modal */}
      <TaskFormModal
        open={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSaved={loadTasks}
        task={editingTask}
        projectId={projectId}
        members={members}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDelete.open}
        title={
          confirmDelete.task
            ? `Delete "${confirmDelete.task.taskName}"?`
            : "Delete task?"
        }
        message="This task will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete({ open: false, task: null })}
        danger
      />
    </section>
  );
}
