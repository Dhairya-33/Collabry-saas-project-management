import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { X } from "lucide-react";
import { fetchCompanyMembers } from "@/services/company.service";
import { createProjectThunk } from "@/store/projectSlice";

/**
 * Shared modal for creating a project.
 *
 * Props:
 *   open          – boolean, whether the modal is visible
 *   onClose       – () => void, called when the user dismisses without creating
 *   onCreated     – (projectName: string) => void, called after successful creation
 *   afterCreate   – async () => void, optional side-effect to run after creation
 *                   (e.g. dispatch list refreshes or overview reload)
 */
export default function CreateProjectModal({ open, onClose, onCreated, afterCreate }) {
  const dispatch = useDispatch();

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { projectName: "", description: "", managerId: "" } });

  const loadMembers = useCallback(async () => {
    setMembersError("");
    setMembers([]);
    setMembersLoading(true);
    try {
      const res = await fetchCompanyMembers();
      const list = Array.isArray(res?.data?.members) ? res.data.members : [];
      setMembers(list);
      if (list.length === 0) {
        setMembersError("No company members are available to assign as project manager.");
      }
    } catch (err) {
      setMembersError(err?.message || "Could not load company members.");
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // Load company members whenever the modal opens
  useEffect(() => {
    if (!open) return;
    loadMembers();
  }, [open, loadMembers]);

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    setMembersError("");
    setMembers([]);
    onClose();
  };

  const onSubmit = async (data) => {
    if (!data.managerId || !members.some((m) => m._id === data.managerId)) {
      setError("managerId", { message: "Select a valid project manager from your company." });
      return;
    }

    try {
      await dispatch(
        createProjectThunk({
          projectName: data.projectName.trim(),
          description: data.description.trim(),
          managerId: data.managerId,
        })
      ).unwrap();

      const name = data.projectName.trim();
      reset();
      setMembers([]);
      onClose();
      onCreated?.(name);
      await afterCreate?.();
    } catch (err) {
      setError("root", { message: err || "Could not create the project." });
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
        aria-labelledby="create-project-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-base p-6 shadow-card"
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="create-project-title" className="text-lg font-semibold text-text-primary">
              Create project
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Create a project and assign a manager from your company.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close create project dialog"
            className="rounded-full p-2 text-text-secondary hover:bg-background-subtle disabled:opacity-60"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Project name */}
          <div>
            <label htmlFor="cp-project-name" className="label">
              Project name <span className="text-status-error">*</span>
            </label>
            <input
              id="cp-project-name"
              {...register("projectName", { required: "Project name is required.", maxLength: 120 })}
              autoFocus
              placeholder="Enter project name"
              className="input w-full"
            />
            {errors.projectName && (
              <p role="alert" className="mt-1 text-xs text-status-error">
                {errors.projectName.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="cp-description" className="label">
              Description
            </label>
            <textarea
              id="cp-description"
              {...register("description", { maxLength: 1000 })}
              rows={3}
              placeholder="Add a short project description (optional)"
              className="textarea w-full"
            />
          </div>

          {/* Manager */}
          <div>
            <label htmlFor="cp-manager" className="label">
              Project manager <span className="text-status-error">*</span>
            </label>
            <select
              id="cp-manager"
              {...register("managerId", { required: "Select a valid project manager." })}
              disabled={membersLoading || members.length === 0}
              className="input w-full disabled:opacity-60"
            >
              <option value="">
                {membersLoading ? "Loading company members..." : "Select a manager"}
              </option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.fullname || m.username || m.email}
                </option>
              ))}
            </select>
            {errors.managerId && (
              <p role="alert" className="mt-1 text-xs text-status-error">
                {errors.managerId.message}
              </p>
            )}
            {membersError && (
              <p role="alert" className="mt-1 text-xs text-status-error">
                {membersError}
              </p>
            )}
          </div>

          {/* Root / server error */}
          {errors.root && (
            <p role="alert" className="text-sm text-status-error">
              {errors.root.message}
            </p>
          )}

          {/* Actions */}
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
              disabled={isSubmitting || membersLoading || members.length === 0}
              className="rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-inverse disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
