import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function EmployeeOverview({ data, compact }) {
  if (!data) return null;

  const navigate = useNavigate();

  return (
    <div className="space-y-6">

      {/* HEADER */}
      {!compact && (
        <div>
          <h1 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">
            My Work
          </h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            Tasks assigned to you across projects.
          </p>
        </div>
      )}

      {/* STATS */}
      <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-4"} gap-5`}>

        <StatCard
          title="My Projects"
          value={data.projects.contributingCount}
          primary
          onClick={() => navigate("/projects/contributing")}
        />

        <StatCard
          title="Pending Tasks"
          value={data.tasks.pending}
        />

        <StatCard
          title="In Progress"
          value={data.tasks.inProgress}
        />

        <StatCard
          title="Completed"
          value={data.tasks.completed}
        />

      </div>

      {/* ALERT */}
      {!compact && (
        <RiskAlert overdue={data.tasks.overdue} />
      )}

    </div>
  );
}

/* ================= REUSABLE ================= */

const StatCard = memo(({ title, value, primary, danger, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl p-5 border transition
      ${primary
        ? "bg-[rgb(var(--color-brand-primary))] text-white border-[rgb(var(--color-brand-primary))]"
        : "bg-white border-[rgb(var(--color-border-subtle)/0.1)]"}
      ${onClick ? "hover:shadow-md cursor-pointer" : ""}
      `}
    >
      {onClick && (
        <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center
        ${primary ? "bg-white/20" : "bg-[rgb(var(--color-background-subtle))]"}`}>
          <ArrowUpRight size={14} />
        </div>
      )}

      <p className={`text-sm ${primary ? "text-white/80" : "text-[rgb(var(--color-text-secondary))]"}`}>
        {title}
      </p>

      <h2 className={`mt-3 text-3xl font-semibold
      ${primary ? "text-white"
        : danger ? "text-[rgb(var(--color-status-error))]"
        : "text-[rgb(var(--color-text-primary))]"}`}>
        {value}
      </h2>
    </div>
  );
});

const RiskAlert = ({ overdue }) => (
  <div className={`rounded-xl p-4 border
    ${overdue > 0
      ? "bg-[rgb(var(--color-status-error)/0.08)] border-[rgb(var(--color-status-error)/0.2)]"
      : "bg-[rgb(var(--color-status-success)/0.08)] border-[rgb(var(--color-status-success)/0.2)]"}
  `}>
    <p className="text-sm font-medium">
      {overdue > 0
        ? `${overdue} tasks overdue`
        : "Everything on track"}
    </p>
  </div>
);