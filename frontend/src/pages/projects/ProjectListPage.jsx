import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Archive, AlertCircle, FolderKanban, Plus, RefreshCw, RotateCcw, Search } from "lucide-react";
import {
  getAllProjects,
  getManagingProjects,
  getContributingProjects,
  getArchivedProjects,
  archiveProjectThunk,
} from "@/store/projectSlice";
import { getOverview } from "@/store/overviewSlice";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CreateProjectModal from "@/components/projects/CreateProjectModal";

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

const getProjectLabel = (project) => project?.projectName || "Untitled project";

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

  // confirm dialog state
  const [confirm, setConfirm] = useState({ open: false, project: null });

  // Track whether the initial load ever failed so we can show the error state
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);

  useEffect(() => {
    setInitialLoadFailed(false);
    dispatch(config.load())
      .unwrap()
      .catch(() => {
        // only mark failed if we still have no data
        setInitialLoadFailed(true);
      });
  }, [dispatch, config]);

  const projects = useMemo(() => {
    const list = Array.isArray(records) ? records : [];
    const activeOnly = mode !== "archived";
    const normalizedSearch = search.trim().toLowerCase();

    return list
      .filter((p) => (activeOnly ? !p?.archived : Boolean(p?.archived)))
      .filter((p) => {
        if (!normalizedSearch) return true;
        return `${p?.projectName || ""} ${p?.description || ""}`
          .toLowerCase()
          .includes(normalizedSearch);
      });
  }, [records, mode, search]);

  const reload = async () => {
    setActionError("");
    setInitialLoadFailed(false);
    try {
      await dispatch(config.load()).unwrap();
    } catch (err) {
      setActionError(typeof err === "string" ? err : "Could not refresh projects. Please try again.");
    }
  };

  const handleArchiveClick = (project) => {
    const verb = project.archived ? "restore" : "archive";
    const label = getProjectLabel(project);
    setConfirm({
      open: true,
      project,
      title: project.archived ? `Restore "${label}"?` : `Archive "${label}"?`,
      message: project.archived
        ? "This project will be moved back to active projects."
        : "This project will be hidden from active views. You can restore it later.",
      verb,
    });
  };

  const confirmToggleArchive = async () => {
    const { project, verb } = confirm;
    setConfirm({ open: false, project: null });
    if (!project) return;

    const label = getProjectLabel(project);
    const nextArchived = !project.archived;

    setBusyProjectId(project._id);
    setActionError("");
    setNotice("");

    try {
      await dispatch(archiveProjectThunk({ projectId: project._id, archived: nextArchived })).unwrap();
      setNotice(nextArchived ? `"${label}" was archived.` : `"${label}" was restored to active projects.`);

      // Refresh both the current list and the overview stats
      await Promise.allSettled([
        dispatch(config.load()).unwrap(),
        dispatch(getOverview()),
      ]);
    } catch (err) {
      setActionError(typeof err === "string" ? err : `Could not ${verb} this project.`);
    } finally {
      setBusyProjectId("");
    }
  };

  const handleCreated = async (name) => {
    setNotice(`Project "${name}" created successfully.`);
    setActionError("");
    await Promise.allSettled([
      dispatch(getAllProjects()),
      dispatch(getOverview()),
    ]);
  };

  // ── SKELETON: first load with no data yet ──────────────────────────────────
  if (projectState.loading && records === null && !initialLoadFailed) {
    return <ProjectListSkeleton title={config.title} />;
  }

  // ── ERROR STATE: initial load failed and nothing cached ────────────────────
  if (initialLoadFailed && records === null) {
    return (
      <section className="space-y-6">
        <PageHeader config={config} loading={projectState.loading} onReload={reload} onOpenCreate={() => setCreateOpen(true)} />
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-2xl border border-status-error/20 bg-status-error/5 px-6 py-10 text-center"
        >
          <AlertCircle size={36} className="text-status-error" aria-hidden="true" />
          <div>
            <p className="font-semibold text-text-primary">Could not load projects</p>
            <p className="mt-1 text-sm text-text-secondary">
              {projectState.error || "Something went wrong. Please try again."}
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
        config={config}
        loading={projectState.loading}
        onReload={reload}
        onOpenCreate={() => { setNotice(""); setActionError(""); setCreateOpen(true); }}
      />

      {notice && (
        <p role="status" className="rounded-xl border border-status-success/20 bg-status-success/5 px-4 py-3 text-sm text-status-success">
          {notice}
        </p>
      )}

      {(actionError || (!initialLoadFailed && projectState.error)) && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-status-error/20 bg-status-error/5 px-4 py-3 text-sm text-status-error sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{actionError || projectState.error}</span>
          <button type="button" onClick={reload} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          aria-label="Search projects"
          className="input w-full py-2.5 pl-9 pr-3"
        />
      </div>

      {projectState.loading && records !== null && (
        <p role="status" className="text-xs text-text-secondary">Updating project list…</p>
      )}

      {/* Project grid or empty state */}
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
                onClick={() => setCreateOpen(true)}
                className="rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-inverse"
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
              className="min-w-0 rounded-2xl border border-border bg-surface-base p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-base font-semibold text-text-primary">
                    <Link
                      to={`/projects/${project._id}`}
                      className="transition hover:text-brand-primary"
                    >
                      {getProjectLabel(project)}
                    </Link>
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    {project.createdAt
                      ? `Created ${new Date(project.createdAt).toLocaleDateString()}`
                      : "Project"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    project.archived
                      ? "bg-background-subtle text-text-secondary"
                      : "bg-status-success/10 text-status-success"
                  }`}
                >
                  {project.archived ? "Archived" : "Active"}
                </span>
              </div>

              <p className="mt-4 min-h-10 whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
                {project.description || "No description provided."}
              </p>

              {config.canArchive && (
                <div className="mt-5 flex justify-end border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => handleArchiveClick(project)}
                    disabled={busyProjectId === project._id}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-brand-primary transition hover:bg-background-subtle disabled:opacity-60"
                  >
                    {project.archived ? (
                      <RotateCcw size={15} aria-hidden="true" />
                    ) : (
                      <Archive size={15} aria-hidden="true" />
                    )}
                    {busyProjectId === project._id
                      ? "Saving…"
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

      {/* Confirm dialog (replaces window.confirm) */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.verb === "archive" ? "Archive" : "Restore"}
        onConfirm={confirmToggleArchive}
        onCancel={() => setConfirm({ open: false, project: null })}
        danger={confirm.verb === "archive"}
      />

      {/* Create project modal */}
      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </section>
  );
}

/* ── Extracted header sub-component ─────────────────────────────────────────── */
function PageHeader({ config, loading, onReload, onOpenCreate }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-brand-primary">
          <FolderKanban size={20} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.12em]">Workspace</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary">{config.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{config.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface-base px-3.5 py-2.5 text-sm font-medium text-text-primary transition hover:bg-background-subtle disabled:opacity-60"
        >
          <RefreshCw size={15} aria-hidden="true" />
          Refresh
        </button>

        {config.canCreate && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition hover:opacity-90"
          >
            <Plus size={16} aria-hidden="true" />
            Create Project
          </button>
        )}
      </div>
    </header>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function ProjectListSkeleton({ title }) {
  return (
    <section className="space-y-6" aria-label={`Loading ${title.toLowerCase()}`}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-4 rounded-2xl border border-border bg-surface-base p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </section>
  );
}
