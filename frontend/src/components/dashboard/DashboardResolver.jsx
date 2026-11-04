import { useDispatch, useSelector } from "react-redux";
import AdminOverview from "./AdminOverview";
import ManagerOverview from "./ManagerOverview";
import EmployeeOverview from "./EmployeeOverview";
import HybridOverview from "./HybridOverview";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { getOverview } from "@/store/overviewSlice";

export default function DashboardResolver() {
  const dispatch = useDispatch();
  const { data, loaded, error } = useSelector((s) => s.overview);

  if (!loaded && error) {
    return (
      <EmptyState
        title="Could not load your dashboard"
        description={error}
        action={
          <button
            type="button"
            onClick={() => dispatch(getOverview())}
            className="btn-primary"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (!loaded) return <DashboardSkeleton />;

  const { roles } = data;

  if (roles.isAdmin) return <AdminOverview admin={data.admin} />;

  if (roles.isManager && roles.isEmployee) {
    return <HybridOverview manager={data.manager} employee={data.employee} />;
  }

  if (roles.isManager) return <ManagerOverview data={data.manager} />;

  if (roles.isEmployee) return <EmployeeOverview data={data.employee} />;

  return (
    <EmptyState
      title="No workspace activity yet"
      description="You're not currently managing or contributing to any projects."
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading dashboard">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}
