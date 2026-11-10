import { memo, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Sector,
} from "recharts";
import { ArrowUpRight } from "lucide-react";
import CompanyInviteModal from "@/components/dashboard/CompanyInviteModal";
import { getOverview } from "@/store/overviewSlice";
import { getAllProjects } from "@/store/projectSlice";
import CreateProjectModal from "@/components/projects/CreateProjectModal";
import EmptyState from "@/components/ui/EmptyState";

/* =========================================================
   MAIN
========================================================= */

export default function AdminOverview({ admin }) {
  if (!admin) {
    return (
      <EmptyState
        title="No data yet"
        description="Company statistics will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">

      <Header />

      <StatsGrid admin={admin} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProjectHealthDonut projects={admin.projects} />
        <TaskDistributionBar tasks={admin.tasks} />
      </div>

      <RiskAlert tasks={admin.tasks} />

    </div>
  );
}

/* =========================================================
   HEADER
========================================================= */

const Header = memo(() => {
  const dispatch = useDispatch();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleCreated = async (name) => {
    setSuccessMessage(`Project "${name}" created successfully.`);
    dispatch(getOverview());
    dispatch(getAllProjects());
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Company performance and operational overview.
          </p>
          {successMessage && (
            <p role="status" className="mt-2 text-sm text-status-success">
              {successMessage}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-4 py-2.5 rounded-full bg-brand-primary text-text-inverse text-sm font-medium hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
          >
            Invite Link
          </button>

          <button
            type="button"
            onClick={() => { setSuccessMessage(""); setCreateOpen(true); }}
            className="px-4 py-2.5 rounded-full border border-border bg-surface-base hover:bg-background-subtle transition text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
          >
            Create Project
          </button>
        </div>
      </div>

      <CompanyInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
});
/* =========================================================
   STATS GRID
========================================================= */

const StatsGrid = memo(({ admin }) => {
  const navigate = useNavigate();
  const overdue = admin.tasks?.overdue ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

      <StatCard
        title="Total Projects"
        value={admin.projects?.total ?? 0}
        primary
        onClick={() => navigate("/projects")}
      />

      <StatCard
        title="Active Projects"
        value={admin.projects?.active ?? 0}
        onClick={() => navigate("/projects/active")}
      />

      <StatCard
        title="Total Members"
        value={admin.members?.total ?? 0}
        onClick={() => navigate("/members")}
      />

      <StatCard
        title="Overdue Tasks"
        value={overdue}
        danger={overdue > 0}
      />

    </div>
  );
});

const StatCard = memo(({ title, value, primary, danger, onClick }) => {
  const clickable = !!onClick;

  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`
        relative rounded-2xl p-5 border transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-brand-secondary))]
        ${
          primary
            ? "bg-[rgb(var(--color-brand-primary))] text-white border-[rgb(var(--color-brand-primary))]"
            : "bg-white border-[rgb(var(--color-border-subtle)/0.1)]"
        }
        ${clickable ? "hover:shadow-md cursor-pointer" : ""}
      `}
    >

      {clickable && (
        <div
          className={`
            absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center
            ${
              primary
                ? "bg-white/20"
                : "bg-[rgb(var(--color-background-subtle))]"
            }
          `}
        >
          <ArrowUpRight
            size={14}
            className={
              primary
                ? "text-white"
                : "text-[rgb(var(--color-text-secondary))]"
            }
          />
        </div>
      )}

      <p
        className={`text-sm ${
          primary
            ? "text-white/80"
            : "text-[rgb(var(--color-text-secondary))]"
        }`}
      >
        {title}
      </p>

      <h2
        className={`mt-3 text-3xl font-semibold ${
          primary
            ? "text-white"
            : danger
            ? "text-[rgb(var(--color-status-error))]"
            : "text-[rgb(var(--color-text-primary))]"
        }`}
      >
        {value}
      </h2>

      {danger && (
        <p className="mt-2 text-xs text-[rgb(var(--color-text-muted))]">
          Needs attention
        </p>
      )}

    </div>
  );
});

/* =========================================================
   PROJECT HEALTH DONUT
========================================================= */

const ProjectHealthDonut = memo(({ projects }) => {
  const data = useMemo(
    () => [
      { name: "Active", value: projects?.active ?? 0 },
      { name: "Archived", value: projects?.archived ?? 0 },
    ],
    [projects]
  );

  const COLORS = [
    "rgb(var(--color-brand-primary))",
    "rgb(var(--color-brand-accent))",
  ];

  const renderShape = (props) => {
    const { index } = props;
    return <Sector {...props} fill={COLORS[index]} />;
  };

  return (
    <Card title="Project Health">

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
            shape={renderShape}
            isAnimationActive={false}
          />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
        <div className="text-2xl font-semibold">
          {projects?.total ?? 0}
        </div>
        <div className="text-xs text-[rgb(var(--color-text-secondary))]">
          Total Projects
        </div>
      </div>

    </Card>
  );
});

/* =========================================================
   TASK DISTRIBUTION BAR
========================================================= */

const TaskDistributionBar = memo(({ tasks }) => {
  const data = useMemo(
    () => [
      {
        name: "Tasks",
        completed: tasks?.completed ?? 0,
        inProgress: tasks?.inProgress ?? 0,
        pending: tasks?.pending ?? 0,
        overdue: tasks?.overdue ?? 0,
      },
    ],
    [tasks]
  );

  return (
    <Card title="Task Distribution">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis hide dataKey="name" />
          <YAxis hide />
          <Tooltip />
          <Bar stackId="a" dataKey="completed" fill="rgb(var(--color-status-success))" />
          <Bar stackId="a" dataKey="inProgress" fill="rgb(var(--color-brand-secondary))" />
          <Bar stackId="a" dataKey="pending" fill="rgb(var(--color-brand-accent))" />
          <Bar stackId="a" dataKey="overdue" fill="rgb(var(--color-status-error))" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
});

/* =========================================================
   RISK ALERT
========================================================= */

const RiskAlert = memo(({ tasks }) => {
  const overdue = tasks?.overdue ?? 0;

  return (
    <div
      className={`rounded-xl p-4 border ${
        overdue > 0
          ? "bg-[rgb(var(--color-status-error)/0.08)] border-[rgb(var(--color-status-error)/0.2)]"
          : "bg-[rgb(var(--color-status-success)/0.08)] border-[rgb(var(--color-status-success)/0.2)]"
      }`}
    >
      <p className="text-sm font-medium">
        {overdue > 0
          ? `${overdue} tasks require attention`
          : "All tasks are on track"}
      </p>
    </div>
  );
});

/* =========================================================
   CARD WRAPPER
========================================================= */

const Card = memo(({ title, children }) => (
  <div className="relative rounded-2xl bg-white border border-[rgb(var(--color-border-subtle)/0.1)] shadow-sm p-5 min-h-[240px]">
    <h3 className="text-sm font-medium mb-3 text-[rgb(var(--color-text-secondary))]">
      {title}
    </h3>
    <div className="h-[190px] relative">
      {children}
    </div>
  </div>
));
