import { memo } from "react";
import ManagerOverview from "./ManagerOverview";
import EmployeeOverview from "./EmployeeOverview";

export default function HybridOverview({ manager, employee }) {
  if (!manager && !employee) return null;

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">
          Dashboard
        </h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Combined overview of your managing and contributing roles.
        </p>
      </div>

      {/* MANAGER SECTION */}
      {manager && (
        <Section title="Managing">
          <ManagerOverview data={manager} compact />
        </Section>
      )}

      {/* EMPLOYEE SECTION */}
      {employee && (
        <Section title="My Work">
          <EmployeeOverview data={employee} compact />
        </Section>
      )}

    </div>
  );
}

/* ================= SECTION WRAPPER ================= */

const Section = memo(({ title, children }) => (
  <div className="space-y-3">

    <div className="flex items-center justify-between">
      <h2 className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">
        {title}
      </h2>

      <div className="h-px flex-1 ml-4 bg-[rgb(var(--color-border-subtle)/0.15)]" />
    </div>

    <div className="rounded-2xl border border-[rgb(var(--color-border-subtle)/0.1)] bg-white p-4">
      {children}
    </div>

  </div>
));