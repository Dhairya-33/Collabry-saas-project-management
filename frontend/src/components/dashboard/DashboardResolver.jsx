// DashboardResolver.jsx

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import AdminOverview from "./AdminOverview";
import ManagerOverview from "./ManagerOverview";
import EmployeeOverview from "./EmployeeOverview";
import HybridOverview from "./HybridOverview";
import { getManagingProjects, getContributingProjects } from "@/store/projectSlice";

export default function DashboardResolver() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { managing, contributing, loading } = useSelector(s => s.projects);

  useEffect(() => {
    dispatch(getManagingProjects());
    dispatch(getContributingProjects());
  }, [dispatch]);

  const isAdmin = user?._id === user?.companyOwnerId; // TODO: backend doesn't send companyOwnerId yet — see gap 6
  const isManager = (managing?.length ?? 0) > 0;
  const isEmployee = (contributing?.length ?? 0) > 0;

  // Wait for the first fetch before deciding the empty state,
  // otherwise every user briefly (or permanently, on backend error) flashes EmptyState.
  if (loading && managing === null && contributing === null) return null;

  if (isAdmin) return <AdminOverview />;

  if (isManager && isEmployee) return <HybridOverview />;

  if (isManager) return <ManagerOverview />;

  if (isEmployee) return <EmployeeOverview />;

  return <EmptyState />;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <h2 className="text-lg font-semibold text-text-primary">No workspace activity yet</h2>
      <p className="text-sm text-text-secondary mt-1">
        You're not currently managing or contributing to any projects.
      </p>
    </div>
  );
}