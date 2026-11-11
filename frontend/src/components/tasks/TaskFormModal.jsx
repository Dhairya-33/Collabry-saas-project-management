import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { X, Paperclip, ExternalLink } from "lucide-react";
import { assign, edit } from "@/store/taskSlice";
import { getProjectMembersThunk } from "@/store/projectSlice";

function toDateInputValue(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

/**
 * Modal dialog for assigning or editing a task.
 *
 * Props:
 *   open      – boolean
 *   onClose   – () => void
 *   onSaved   – () => void
 *   task      – task object (null for create / assign)
 *   projectId – string
 *   members   – optional array of project members
 */
export default function TaskFormModal({
  open,
  onClose,
  onSaved,
  task = null,
  projectId,
  members: propMembers,
}) {
  const dispatch = useDispatch();
  const isEdit = Boolean(task?._id);

  const [projectMembers, setProjectMembers] = useState(propMembers || []);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  // Load project members if not provided
  const loadMembers = useCallback(async () => {
    if (propMembers && propMembers.length > 0) {
      setProjectMembers(propMembers);
      return;
    }
    setMembersError("");
    setLoadingMembers(true);
    try {
      const res = await dispatch(getProjectMembersThunk(projectId)).unwrap();
      const list = Array.isArray(res) ? res : [];
      setProjectMembers(list);
      if (!list.length) {
        setMembersError("No project members found.");
      }
    } catch (err) {
      setMembersError(typeof err === "string" ? err : "Could not load project members.");
    } finally {
      setLoadingMembers(false);
    }
  }, [dispatch, projectId, propMembers]);

  // Sync propMembers if they change
  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setProjectMembers(propMembers);
    }
  }, [propMembers]);

  // Reset form values when opening or when task changes
  useEffect(() => {
    if (!open) return;
    loadMembers();
    setSelectedFile(null);

    if (isEdit && task) {
      const assigneeId =
        task.assignedTo?._id ||
        task.assignedTo ||
        task.employee?._id ||
        task.employee ||
        "";
      reset({
        taskName: task.taskName || "",
        description: task.description || "",
        assignedTo: assigneeId,
        status: task.status === "overdue" ? "pending" : task.status || "pending",
        dueDate: toDateInputValue(task.dueDate),
      });
    } else {
      reset({
        taskName: "",
        description: "",
        empId: "",
        dueDate: "",
      });
    }
  }, [open, task, isEdit, loadMembers, reset]);

  // Only project members with role 'employee' can be assigned tasks
  const eligibleEmployees = useMemo(() => {
    return projectMembers.filter((m) => m.role === "employee");
  }, [projectMembers]);

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    setSelectedFile(null);
    onClose();
  };

  const isCompleted = task?.status === "completed";

  const onSubmit = async (data) => {
    const formData = new FormData();

    if (isEdit) {
      if (data.taskName?.trim()) {
        formData.append("taskName", data.taskName.trim());
      }
      if (data.description !== undefined) {
        formData.append("description", data.description.trim());
      }
      if (!isCompleted) {
        if (data.assignedTo) {
          formData.append("assignedTo", data.assignedTo);
        }
        if (data.dueDate) {
          formData.append("dueDate", data.dueDate);
        }
      }
      if (data.status) {
        formData.append("status", data.status);
      }
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      try {
        await dispatch(edit({ taskId: task._id, formData })).unwrap();
        reset();
        setSelectedFile(null);
        onClose();
        onSaved?.();
      } catch (err) {
        setError("root", { message: err || "Failed to update task." });
      }
    } else {
      if (!data.empId) {
        setError("empId", { message: "Please select an employee." });
        return;
      }

      formData.append("taskName", data.taskName.trim());
      if (data.description?.trim()) {
        formData.append("description", data.description.trim());
      }
      formData.append("empId", data.empId);
      formData.append("projectId", projectId);
      if (data.dueDate) {
        formData.append("dueDate", data.dueDate);
      }
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      try {
        await dispatch(assign(formData)).unwrap();
        reset();
        setSelectedFile(null);
        onClose();
        onSaved?.();
      } catch (err) {
        setError("root", { message: err || "Failed to assign task." });
      }
    }
  };

  if (!open) return null;

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
        aria-labelledby="task-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-base p-6 shadow-card"
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="task-form-title" className="text-lg font-semibold text-text-primary">
              {isEdit ? "Edit task" : "Assign task"}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {isEdit
                ? "Update task details, assignee, status, or reference file."
                : "Assign a new task to an employee in this project."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="rounded-full p-2 text-text-secondary hover:bg-background-subtle disabled:opacity-60"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Task Name */}
          <div>
            <label htmlFor="tf-task-name" className="label">
              Task name <span className="text-status-error">*</span>
            </label>
            <input
              id="tf-task-name"
              {...register("taskName", {
                required: "Task name is required.",
                maxLength: { value: 160, message: "Task name too long." },
              })}
              autoFocus
              placeholder="e.g. Design landing page hero"
              className="input w-full"
            />
            {errors.taskName && (
              <p role="alert" className="mt-1 text-xs text-status-error">
                {errors.taskName.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="tf-description" className="label">
              Description
            </label>
            <textarea
              id="tf-description"
              {...register("description", {
                maxLength: { value: 2000, message: "Description too long." },
              })}
              rows={3}
              placeholder="Provide context, acceptance criteria, or requirements (optional)"
              className="textarea w-full"
            />
            {errors.description && (
              <p role="alert" className="mt-1 text-xs text-status-error">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Assignee / Employee picker */}
          <div>
            <label htmlFor="tf-assignee" className="label">
              Assign to <span className="text-status-error">*</span>
            </label>
            {isEdit ? (
              <select
                id="tf-assignee"
                {...register("assignedTo", { required: "Select an employee." })}
                disabled={isSubmitting || loadingMembers || isCompleted}
                className="input w-full disabled:opacity-60"
              >
                <option value="">
                  {loadingMembers ? "Loading employees..." : "Select an employee"}
                </option>
                {eligibleEmployees.map((m) => {
                  const u = m.userId;
                  const id = u?._id || u;
                  const label = u?.fullname || u?.username || u?.email || "Employee";
                  return (
                    <option key={m._id} value={id}>
                      {label} {u?.email ? `(${u.email})` : ""}
                    </option>
                  );
                })}
              </select>
            ) : (
              <select
                id="tf-assignee"
                {...register("empId", { required: "Select an employee." })}
                disabled={isSubmitting || loadingMembers || eligibleEmployees.length === 0}
                className="input w-full disabled:opacity-60"
              >
                <option value="">
                  {loadingMembers
                    ? "Loading employees..."
                    : eligibleEmployees.length === 0
                    ? "No employees in this project"
                    : "Select an employee"}
                </option>
                {eligibleEmployees.map((m) => {
                  const u = m.userId;
                  const id = u?._id || u;
                  const label = u?.fullname || u?.username || u?.email || "Employee";
                  return (
                    <option key={m._id} value={id}>
                      {label} {u?.email ? `(${u.email})` : ""}
                    </option>
                  );
                })}
              </select>
            )}

            {isEdit && errors.assignedTo && (
              <p role="alert" className="mt-1 text-xs text-status-error">
                {errors.assignedTo.message}
              </p>
            )}
            {!isEdit && errors.empId && (
              <p role="alert" className="mt-1 text-xs text-status-error">
                {errors.empId.message}
              </p>
            )}
            {membersError && (
              <p role="alert" className="mt-1 text-xs text-status-error">
                {membersError}
              </p>
            )}
            {isCompleted && (
              <p className="mt-1 text-xs text-text-secondary">
                Assignee cannot be changed for completed tasks.
              </p>
            )}
            {!loadingMembers && eligibleEmployees.length === 0 && !membersError && (
              <p className="mt-1 text-xs text-status-warning">
                Add an employee to this project before assigning tasks.
              </p>
            )}
          </div>

          {/* Edit status (only when editing) */}
          {isEdit && (
            <div>
              <label htmlFor="tf-status" className="label">
                Status
              </label>
              <select
                id="tf-status"
                {...register("status")}
                disabled={isSubmitting}
                className="input w-full"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          {/* Due date */}
          <div>
            <label htmlFor="tf-due-date" className="label">
              Due date
            </label>
            <input
              id="tf-due-date"
              type="date"
              {...register("dueDate")}
              disabled={isSubmitting || isCompleted}
              className="input w-full disabled:opacity-60"
            />
            {isCompleted && (
              <p className="mt-1 text-xs text-text-secondary">
                Due date cannot be changed for completed tasks.
              </p>
            )}
          </div>

          {/* Reference file upload */}
          <div>
            <label htmlFor="tf-file" className="label">
              Reference file {isEdit ? "(optional update)" : "(optional)"}
            </label>
            <div className="flex items-center gap-2">
              <label
                htmlFor="tf-file"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-base px-4 py-2 text-xs font-medium text-text-primary hover:bg-background-subtle"
              >
                <Paperclip size={14} aria-hidden="true" />
                <span>{selectedFile ? selectedFile.name : "Choose file"}</span>
              </label>
              <input
                id="tf-file"
                type="file"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                }}
                disabled={isSubmitting}
                className="sr-only"
              />
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-status-error hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            {task?.fileUrl && !selectedFile && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                <span>Existing reference file:</span>
                <a
                  href={task.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-primary underline hover:opacity-80"
                >
                  View attachment <ExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
            )}
          </div>

          {/* Root / server error */}
          {errors.root && (
            <p role="alert" className="text-sm text-status-error">
              {errors.root.message}
            </p>
          )}

          {/* Footer actions */}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
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
              disabled={
                isSubmitting ||
                loadingMembers ||
                (!isEdit && eligibleEmployees.length === 0)
              }
              className="rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-inverse disabled:opacity-60"
            >
              {isSubmitting
                ? isEdit
                  ? "Saving..."
                  : "Assigning..."
                : isEdit
                ? "Save changes"
                : "Assign task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
