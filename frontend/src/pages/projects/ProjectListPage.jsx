import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Archive, FolderKanban, Plus, RefreshCw, RotateCcw, Search, X } from "lucide-react";
import {
  archiveProject,
  createProject,
} from "@/services/project.service";
import { fetchCompanyMembers } from "@/services/company.service";
import {
  getAllProjects,
  getManagingProjects,
  getContributingProjects,
  getArchivedProjects,
} from "@/store/projectSlice";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

const PAGE_CONFIG = {
  active: {
    title: "Active Projects",
    description: "All active projects across your company.",
    listKey: "all",
    load: getAllProjects,
    canCreate: true,
    canArchive: true,
  },
  managing: {
    title: "Managing Projects",
    description: "Projects where you are assigned as the manager.",
    listKey: "managing",
    load: getManagingProjects,
    canCreate: false,
    canArchive: false,
  },
  contributing: {
    title: "Contributing Projects",
    description: "Projects where you are a contributing team member.",
    listKey: "contributing",
    load: getContributingProjects,
    canCreate: false,
    canArchive: false,
  },
  archived: {
    title: "Archived Projects",
    description: "Projects archived by your company administrator.",
    listKey: "archived",
    load: getArchivedProjects,
    canCreate: false,
    canArchive: true,
  },
};

const getProjectLabel = (project) =>
  project?.projectName || "Untitled project";

export default function ProjectListPage({ mode = "active" }) {
  const config = PAGE_CONFIG[mode] || PAGE_CONFIG.active;
  const dispatch = useDispatch();
  const projectState = useSelector((state) => state.projects);
  const records = projectState[config.listKey];
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyProjectId, setBusyProjectId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [managerId, setManagerId] = useState("");
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    dispatch(config.load());
  }, [dispatch, config]);

  const projects = useMemo(() => {
    const list = Array.isArray(records) ? records : [];
    const activeOnly = mode !== "archived";
    const normalizedSearch = search.trim().toLowerCase();

    return list
      .filter((project) => (activeOnly ? !project?.archived : Boolean(project?.archived)))
      .filter((project) => {
        if (!normalizedSearch) return true;
        return `${project?.projectName || ""} ${project?.description || ""}`
          .toLowerCase()
          .includes(normalizedSearch);
      });
  }, [records, mode, search]);

  const reload = async () => {
    setActionError("");
    try {
      await dispatch(config.load()).unwrap();
    } catch (error) {
      setActionError(
        typeof error === "string" ? error : "Could not refresh projects. Please try again."
      );
    }
  };

  const openCreate = async () => {
    setCreateOpen(true);
    setCreateError("");
    setActionError("");
    setNotice("");
    setMembersLoading(true);

    try {
      const response = await fetchCompanyMembers();
      const companyMembers = Array.isArray(response?.data?.members)
        ? response.data.members
        : [];
      setMembers(companyMembers);
      setManagerId((current) =>
        current && companyMembers.some((member) => member._id === current)
          ? current
          : companyMembers[0]?._id || ""
      );
      if (companyMembers.length === 0) {
        setCreateError("No company members are available to assign as project manager.");
      }
    } catch (error) {
      setMembers([]);
      setCreateError(error?.message || "Could not load company members.");
    } finally {
      setMembersLoading(false);
    }
  };

  const closeCreate = () => {
    if (creating) return;
    setCreateOpen(false);
    setCreateError("");
    setProjectName("");
    setDescription("");
    setManagerId("");
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    const normalizedName = projectName.trim();

    if (!normalizedName) {
      setCreateError("Project name is required.");
      return;
    }
    if (!managerId || !members.some((member) => member._id === managerId)) {
      setCreateError("Select a valid project manager from your company.");
      return;
    }

    setCreating(true);
    setCreateError("");
    setActionError("");

    try {
      await createProject({
        projectName: normalizedName,
        description: description.trim(),
        managerId,
      });
      closeCreateAfterSuccess();
      setNotice(`Project "${normalizedName}" created successfully.`);

      try {
        await dispatch(getAllProjects()).unwrap();
      } catch {
        setActionError("Project was created, but the list could not be refreshed.");
      }
    } catch (error) {
      setCreateError(error?.message || "Could not create the project.");
    } finally {
      setCreating(false);
    }
  };

  const closeCreateAfterSuccess = () => {
    setCreateOpen(false);
    setProjectName("");
    setDescription("");
    setManagerId("");
    setMembers([]);
  };

  const toggleArchive = async (project) => {
    const nextArchived = !project.archived;
    const verb = nextArchived ? "archive" : "restore";
    const label = getProjectLabel(project);

    if (!window.confirm(`Are you sure you want to ${verb} "${label}"?`)) return;

    setBusyProjectId(project._id);
    setActionError("");
    setNotice("");

    try {
      await archiveProject({
        projectId: project._id,
        archived: nextArchived,
      });
      setNotice(
        nextArchived
          ? `"${label}" was archived.`
          : `"${label}" was restored to active projects.`
      );

      try {
        await dispatch(config.load()).unwrap();
      } catch {
        setActionError("The project was updated, but this list could not be refreshed.");
      }
    } catch (error) {
      setActionError(error?.message || `Could not ${verb} this project.`);
    } finally {
      setBusyProjectId("");
    }
  };

  if (projectState.loading && records === null) {
    return <ProjectListSkeleton title={config.title} />;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[rgb(var(--color-brand-primary))]">
            <FolderKanban size={20} aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">
              Workspace
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-[rgb(var(--color-text-primary))]">
            {config.title}
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--color-text-secondary))]">
            {config.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reload}
            disabled={projectState.loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--color-border-subtle)/0.2)] bg-white px-3.5 py-2.5 text-sm font-medium text-[rgb(var(--color-text-primary))] transition hover:bg-[rgb(var(--color-background-subtle))] disabled:opacity-60"
          >
            <RefreshCw size={15} aria-hidden="true" />
            Refresh
          </button>

          {config.canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--color-brand-primary))] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus size={16} aria-hidden="true" />
              Create Project
            </button>
          )}
        </div>
      </header>

      {notice && (
        <p role="status" className="rounded-xl border border-[rgb(var(--color-status-success)/0.2)] bg-[rgb(var(--color-status-success)/0.06)] px-4 py-3 text-sm text-[rgb(var(--color-status-success))]">
          {notice}
        </p>
      )}

      {(actionError || projectState.error) && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-[rgb(var(--color-status-error)/0.2)] bg-[rgb(var(--color-status-error)/0.05)] px-4 py-3 text-sm text-[rgb(var(--color-status-error))] sm:flex-row sm:items-center sm:justify-between">
          <span>{actionError || projectState.error}</span>
          <button type="button" onClick={reload} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects..."
          aria-label="Search projects"
          className="w-full rounded-xl border border-[rgb(var(--color-border-subtle)/0.2)] bg-white py-2.5 pl-9 pr-3 text-sm text-[rgb(var(--color-text-primary))] outline-none transition focus:border-[rgb(var(--color-brand-secondary))] focus:ring-2 focus:ring-[rgb(var(--color-brand-secondary)/0.15)]"
        />
      </div>

      {projectState.loading && records !== null && (
        <p role="status" className="text-xs text-[rgb(var(--color-text-secondary))]">
          Updating project list...
        </p>
      )}

      {projects.length === 0 ? (
        <EmptyState
          title={search ? "No matching projects" : "No projects yet"}
          description={
            search
              ? "Try another project name or description."
              : mode === "archived"
                ? "Archived projects will appear here."
                : "Projects assigned to this workspace will appear here."
          }
          action={
            config.canCreate && !search ? (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-xl bg-[rgb(var(--color-brand-primary))] px-4 py-2.5 text-sm font-medium text-white"
              >
                Create your first project
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <article
              key={project._id}
              className="min-w-0 rounded-2xl border border-[rgb(var(--color-border-subtle)/0.14)] bg-white p-5 shadow-[0_4px_18px_rgba(0,0,0,0.025)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-base font-semibold text-[rgb(var(--color-text-primary))]">
                    {getProjectLabel(project)}
                  </h2>
                  <p className="mt-1 text-xs text-[rgb(var(--color-text-secondary))]">
                    {project.createdAt
                      ? `Created ${new Date(project.createdAt).toLocaleDateString()}`
                      : "Project"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  project.archived
                    ? "bg-[rgb(var(--color-background-subtle))] text-[rgb(var(--color-text-secondary))]"
                    : "bg-[rgb(var(--color-status-success)/0.08)] text-[rgb(var(--color-status-success))]"
                }`}>
                  {project.archived ? "Archived" : "Active"}
                </span>
              </div>

              <p className="mt-4 min-h-10 whitespace-pre-wrap break-words text-sm leading-6 text-[rgb(var(--color-text-secondary))]">
                {project.description || "No description provided."}
              </p>

              {config.canArchive && (
                <div className="mt-5 flex justify-end border-t border-[rgb(var(--color-border-subtle)/0.1)] pt-4">
                  <button
                    type="button"
                    onClick={() => toggleArchive(project)}
                    disabled={busyProjectId === project._id}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-brand-primary))] transition hover:bg-[rgb(var(--color-background-subtle))] disabled:opacity-60"
                  >
                    {project.archived ? (
                      <RotateCcw size={15} aria-hidden="true" />
                    ) : (
                      <Archive size={15} aria-hidden="true" />
                    )}
                    {busyProjectId === project._id
                      ? "Saving..."
                      : project.archived
                        ? "Restore"
                        : "Archive"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {createOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreate();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 id="create-project-title" className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">
                  Create project
                </h2>
                <p className="mt-1 text-sm text-[rgb(var(--color-text-secondary))]">
                  Create a project and assign a manager from your company.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                disabled={creating}
                aria-label="Close create project dialog"
                className="rounded-lg p-2 text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-background-subtle))] disabled:opacity-60"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <label htmlFor="phase3a-project-name" className="mb-1.5 block text-sm font-medium text-[rgb(var(--color-text-primary))]">
                  Project name
                </label>
                <input
                  id="phase3a-project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  maxLength={120}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-[rgb(var(--color-border-subtle)/0.2)] px-3 py-2.5 text-sm outline-none focus:border-[rgb(var(--color-brand-secondary))] focus:ring-2 focus:ring-[rgb(var(--color-brand-secondary)/0.15)]"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label htmlFor="phase3a-project-description" className="mb-1.5 block text-sm font-medium text-[rgb(var(--color-text-primary))]">
                  Description
                </label>
                <textarea
                  id="phase3a-project-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="w-full resize-y rounded-xl border border-[rgb(var(--color-border-subtle)/0.2)] px-3 py-2.5 text-sm outline-none focus:border-[rgb(var(--color-brand-secondary))] focus:ring-2 focus:ring-[rgb(var(--color-brand-secondary)/0.15)]"
                  placeholder="Add a short project description (optional)"
                />
              </div>

              <div>
                <label htmlFor="phase3a-project-manager" className="mb-1.5 block text-sm font-medium text-[rgb(var(--color-text-primary))]">
                  Project manager
                </label>
                <select
                  id="phase3a-project-manager"
                  value={managerId}
                  onChange={(event) => setManagerId(event.target.value)}
                  disabled={membersLoading || members.length === 0}
                  required
                  className="w-full rounded-xl border border-[rgb(var(--color-border-subtle)/0.2)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[rgb(var(--color-brand-secondary))] disabled:opacity-60"
                >
                  <option value="">
                    {membersLoading ? "Loading company members..." : "Select a manager"}
                  </option>
                  {members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.fullname || member.username || member.email}
                    </option>
                  ))}
                </select>
              </div>

              {createError && (
                <p role="alert" className="text-sm text-[rgb(var(--color-status-error))]">
                  {createError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreate}
                  disabled={creating}
                  className="rounded-xl border border-[rgb(var(--color-border-subtle)/0.2)] px-4 py-2.5 text-sm font-medium text-[rgb(var(--color-text-primary))] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || membersLoading || members.length === 0 || !managerId}
                  className="rounded-xl bg-[rgb(var(--color-brand-primary))] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function ProjectListSkeleton({ title }) {
  return (
    <section className="space-y-6" aria-label={`Loading ${title.toLowerCase()}`}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-4 rounded-2xl border border-[rgb(var(--color-border-subtle)/0.12)] bg-white p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </section>
  );
}