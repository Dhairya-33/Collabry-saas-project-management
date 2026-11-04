import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { EnterpriseLoader } from "@/pages/loader/Loader";

export default function AuthLayout() {
  const { user, loading } = useSelector(s => s.auth);

  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <Outlet />
      {loading && <EnterpriseLoader />}
    </>
  );
}
