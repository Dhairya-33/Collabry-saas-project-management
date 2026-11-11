import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm, useWatch } from "react-hook-form";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  Paperclip,
  Play,
  RefreshCw,
  UserCheck,
  X,
} from "lucide-react";
import { myTasks, respond } from "@/store/taskSlice";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

/* ── Overdue calculation ──────────────────────────────── */
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

/* ── Resolve assigner name ────────────────────────────── */
function getAssignerName(task, manager) {
  if (task.assignedBy && typeof task.assignedBy === "object") {
    return (
      task.assignedBy.fullname ||
      task.assignedBy.username ||
      task.assignedBy.email ||
      "Project Manager"
    );
  }
  if (manager && String(task.assignedBy) === String(manager._id)) {
    return manager.fullname || manager.username || manager.email || "Project Manager";
  }
  if (manager) {
    return manager.fullname || manager.username || manager.email || "Project Manager";
  }
  return "Project Manager";
}

/* ── Modal for completing a task with optional file ──── */
function CompleteTaskModal({ open, onClose, onCompleted, task }) {
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  const fileList = useWatch({ control, name: "file" });
  const selectedFileName = fileList?.[0]?.name || "";

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("status", "completed");

      const files = data.file;
      if (files && files[0]) {
        formData.append("file", files[0]);
      }

      await dispatch(respond({ taskId: task._id, formData })).unwrap();
      reset();
      onClose();
      onCompleted?.();
    } catch (err) {
      setError("root", {
        message:
          typeof err === "string" ? err : err?.message || "Failed to mark task as completed.",
      });
    }
  };

  if (!open || !task) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-text-primary/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-task-title"
        className="w-full max-w-md rounded-2xl bg-surface-base p-6 shadow-card"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 id="complete-task-title" className="text-base font-semibold text-text-primary">
            Mark task complete
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="rounded-full p-1 text-text-secondary transition hover:bg-background-subtle hover:text-text-primary disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
          <div className="rounded-xl border border-border bg-background-app/50 p-3">
            <p className="text-xs font-medium text-text-secondary">Task</p>
            <p className="mt-0.5 text-sm font-semibold text-text-primary">{task.taskName}</p>
          </div>

          <div>
            <label htmlFor="complete-file-input" className="label">
              Submission file <span className="text-xs font-normal text-text-secondary">(optional)</span>
            </label>
            <input
              id="complete-file-input"
              type="file"
              {...register("file")}
              disabled={isSubmitting}
              className="input file:mr-3 file:rounded-full file:border-0 file:bg-brand-primary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-primary hover:file:bg-brand-primary/20 text-xs"
            />
            {selectedFileName ? (
              <p className="mt-1 text-xs text-brand-primary">Selected: {selectedFileName}</p>
            ) : (
              <p className="mt-1 text-xs text-text-secondary">
                Upload your deliverable, completed document, or work file.
              </p>
            )}
          </div>

          {errors.root && (
            <p
              role="alert"
              className="rounded-xl border border-status-error/20 bg-status-error/5 p-3 text-sm text-status-error"
            >
              {errors.root.message}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-background-subtle disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-medium text-text-inverse transition hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                "Mark complete"
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/**
 * Employee Tasks Panel — displays tasks assigned to current employee in this project.
 *
 * Props:
 *   projectId – string (required)
 *   manager   – manager object from project details (optional)
 */
export default function EmployeeTasksPanel({ projectId, manager }) {
  const dispatch = useDispatch();
  const reduxTasks = useSelector((s) => s.tasks?.myTasks);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [runningTaskId, setRunningTaskId] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);

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
      await dispatch(myTasks(projectId)).unwrap();
    } catch (err) {
      if (isMounted.current) {
        setError(typeof err === "string" ? err : "Failed to load employee tasks");
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

  const tasks = Array.isArray(reduxTasks) ? reduxTasks : [];

  const handleStartTask = async (task) => {
    setActionError("");
    setNotice("");
    setRunningTaskId(task._id);
    try {
      const formData = new FormData();
      formData.append("status", "in-progress");
      await dispatch(respond({ taskId: task._id, formData })).unwrap();
      setNotice(`Task "${task.taskName}" started.`);
      await loadTasks();
    } catch (err) {
      setActionError(
        typeof err === "string" ? err : err?.message || "Failed to start task."
      );
    } finally {
      if (isMounted.current) {
        setRunningTaskId(null);
      }
    }
  };

  const handleOpenComplete = (task) => {
    setActionError("");
    setNotice("");
    setCompletingTask(task);
  };

  const handleCompletedSuccess = async () => {
    setNotice("Task marked as completed.");
    await loadTasks();
  };

  if (loading && !tasks.length) {
    return (
      <section className="mt-8 space-y-4" aria-label="Loading tasks">
        <div className="space-y-1">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-2xl border border-border bg-surface-base p-5"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error && !tasks.length) {
    return (
      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">My Tasks</h2>
          <p className="text-xs text-text-secondary">
            View and update your assignments for this project.
          </p>
        </div>
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
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-text-primary">My Tasks</h2>
        <p className="text-xs text-text-secondary">
          Track and respond to tasks assigned to you in this project.
        </p>
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

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-base p-8 text-center">
          <EmptyState
            title="No tasks assigned yet"
            description="You have no tasks assigned to you in this project right now."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((t) => {
            const overdue = isTaskOverdue(t);
            const formattedDate = formatDueDate(t.dueDate);
            const assigner = getAssignerName(t, manager);
            const isCompleted = t.status === "completed";
            const isRunning = runningTaskId === t._id;

            return (
              <li
                key={t._id}
                className={`rounded-2xl border p-5 transition ${
                  overdue
                    ? "border-status-error/40 bg-status-error/[0.02]"
                    : "border-border bg-surface-base hover:bg-background-subtle/30"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Task Name & Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-text-primary">
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

                    {/* Task Description */}
                    {t.description ? (
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-secondary">
                        {t.description}
                      </p>
                    ) : (
                      <p className="text-xs italic text-text-muted">
                        No description provided.
                      </p>
                    )}

                    {/* Metadata & Links */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs">
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

                      {/* Who Assigned It */}
                      <span className="inline-flex items-center gap-1.5 text-text-secondary">
                        <UserCheck size={13} aria-hidden="true" />
                        <span>
                          Assigned by{" "}
                          <strong className="font-medium text-text-primary">
                            {assigner}
                          </strong>
                        </span>
                      </span>

                      {/* Reference File Link */}
                      {t.fileUrl && (
                        <a
                          href={t.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-primary underline hover:opacity-80"
                        >
                          <Paperclip size={13} aria-hidden="true" />
                          <span>Reference file</span>
                          <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      )}

                      {/* Submission File Link */}
                      {t.submissionUrl && (
                        <a
                          href={t.submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-status-success underline hover:opacity-80"
                        >
                          <FileCheck size={13} aria-hidden="true" />
                          <span>Submission file</span>
                          <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions (hidden once completed) */}
                  {!isCompleted && (
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                      {t.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleStartTask(t)}
                          disabled={runningTaskId !== null}
                          aria-label={`Start ${t.taskName}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-base px-3.5 py-1.5 text-xs font-medium text-text-primary transition hover:bg-background-subtle disabled:opacity-60"
                        >
                          {isRunning ? (
                            <RefreshCw
                              size={12}
                              className="animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Play size={12} aria-hidden="true" />
                          )}
                          Start
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenComplete(t)}
                        disabled={runningTaskId !== null}
                        aria-label={`Mark ${t.taskName} complete`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-3.5 py-1.5 text-xs font-medium text-text-inverse transition hover:opacity-90 disabled:opacity-60"
                      >
                        <CheckCircle2 size={12} aria-hidden="true" />
                        Mark complete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Complete Task Modal */}
      <CompleteTaskModal
        open={Boolean(completingTask)}
        onClose={() => setCompletingTask(null)}
        onCompleted={handleCompletedSuccess}
        task={completingTask}
      />
    </section>
  );
}
