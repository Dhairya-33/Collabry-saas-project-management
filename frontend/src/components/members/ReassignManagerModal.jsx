import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, UserCheck, AlertCircle } from "lucide-react";
import { getAllProjects } from "@/store/projectSlice";
import { reassignProjectManagerThunk } from "@/store/memberSlice";

export default function ReassignManagerModal({ open, onClose, members = [], onReassigned }) {
  const dispatch = useDispatch();
  const allProjects = useSelector((s) => s.projects.all);
  const projectsLoading = useSelector((s) => s.projects.loading);

  const [projectId, setProjectId] = useState("");
  const [newManagerUserId, setNewManagerUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load all projects when modal opens if not already loaded
  useEffect(() => {
    if (open && (!allProjects || allProjects.length === 0)) {
      dispatch(getAllProjects());
    }
  }, [open, allProjects, dispatch]);

  const activeProjects = useMemo(() => {
    if (!Array.isArray(allProjects)) return [];
    return allProjects.filter((p) => !p?.archived);
  }, [allProjects]);

  // Reset selection on open
  useEffect(() => {
    if (open) {
      setError("");
      setProjectId(activeProjects[0]?._id || "");
      setNewManagerUserId("");
    }
  }, [open, activeProjects]);

  // Selected project info
  const selectedProject = useMemo(() => {
    return activeProjects.find((p) => p._id === projectId);
  }, [activeProjects, projectId]);

  // Filter candidate managers (members excluding the current manager)
  const candidateMembers = useMemo(() => {
    const list = Array.isArray(members) ? members : [];
    const currentManagerId = selectedProject?.managerId?._id || selectedProject?.managerId;
    return list.filter((m) => m._id !== currentManagerId);
  }, [members, selectedProject]);

  useEffect(() => {
    if (candidateMembers.length > 0 && !newManagerUserId) {
      setNewManagerUserId(candidateMembers[0]._id);
    }
  }, [candidateMembers, newManagerUserId]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId || !newManagerUserId) {
      setError("Please select both a project and a new manager.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await dispatch(
        reassignProjectManagerThunk({ projectId, newManagerUserId })
      ).unwrap();
      onReassigned?.(projectId, newManagerUserId);
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to reassign manager.");
    } finally {
      setSubmitting(false);
    }
  };

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
        aria-labelledby="reassign-modal-title"
        className="w-full max-w-lg rounded-2xl bg-surface-base p-6 shadow-card border border-border"
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 text-brand-primary">
            <UserCheck size={20} aria-hidden="true" />
            <h2 id="reassign-modal-title" className="text-base font-semibold text-text-primary">
              Reassign Project Manager
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

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-status-error/20 bg-status-error/5 p-3 text-xs text-status-error"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="reassign-project-select" className="label">
              Select Active Project
            </label>
            {projectsLoading && activeProjects.length === 0 ? (
              <p className="text-xs text-text-secondary">Loading projects…</p>
            ) : activeProjects.length === 0 ? (
              <p className="text-xs text-text-secondary">No active projects available.</p>
            ) : (
              <select
                id="reassign-project-select"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setNewManagerUserId("");
                }}
                className="input"
              >
                {activeProjects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.projectName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="reassign-manager-select" className="label">
              Select New Manager
            </label>
            {candidateMembers.length === 0 ? (
              <p className="text-xs text-text-secondary">
                No other members available to assign.
              </p>
            ) : (
              <select
                id="reassign-manager-select"
                value={newManagerUserId}
                onChange={(e) => setNewManagerUserId(e.target.value)}
                className="input"
              >
                {candidateMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.fullname || m.username} ({m.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <p className="text-xs text-text-secondary">
            The previous manager will retain employee access on this project.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-background-subtle disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !projectId || !newManagerUserId}
              className="rounded-full bg-brand-primary px-5 py-2 text-sm font-medium text-text-inverse hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Reassigning…" : "Confirm Reassignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
