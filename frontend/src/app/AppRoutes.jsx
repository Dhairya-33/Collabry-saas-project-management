import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import AppLayout from "@/layouts/AppLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import LandingPage from "@/pages/landingPage/Index";
import AuthPage from "@/pages/auth/AuthPage";
import InviteRedirect from "@/pages/invite/InviteRedirect";
import DashboardResolver from "@/components/dashboard/DashboardResolver";
import CompanySetup from "@/pages/company-setup/Index";
import CompleteProfilePage from "@/pages/onboarding/CompleteProfilePage";
import ComingSoon from "@/pages/placeholder/ComingSoon";
import Skeleton from "@/components/ui/Skeleton";
import { EnterpriseLoader } from "@/pages/loader/Loader";

/* ================= GUARDS ================= */

/** Blocks unauthenticated users → /auth */
function RequireAuth() {
  const { user } = useSelector((s) => s.auth);
  return user ? <Outlet /> : <Navigate to="/auth" replace />;
}

/** Blocks authenticated users → /dashboard */
function GuestOnly() {
  const { user } = useSelector((s) => s.auth);
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

/** Blocks users with an incomplete profile → /complete-profile */
function RequireProfileComplete() {
  const { user } = useSelector((s) => s.auth);
  return !user?.isProfileComplete
    ? <Navigate to="/complete-profile" replace />
    : <Outlet />;
}

/** Blocks users with a complete profile → /dashboard */
function RequireProfileIncomplete() {
  const { user } = useSelector((s) => s.auth);
  return user?.isProfileComplete
    ? <Navigate to="/dashboard" replace />
    : <Outlet />;
}

/** Blocks users without a company → /company-setup */
function RequireCompany() {
  const { user } = useSelector((s) => s.auth);
  return user?.companyId ? <Outlet /> : <Navigate to="/company-setup" replace />;
}

/** Keeps users that already have a company out of /company-setup */
function NoCompany() {
  const { user } = useSelector((s) => s.auth);
  return user?.companyId ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

/** Allows a route only if the user holds one of the roles (from /company/overview) */
function RequireRole({ allow }) {
  const { data, loaded, error } = useSelector((s) => s.overview);

  if (!loaded && !error) return <Skeleton className="h-40 w-full" />;

  const allowed = loaded && allow.some((role) => data.roles[role]);
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

/* ================= ROUTES ================= */

export default function AppRoutes() {
  const { loading } = useSelector((s) => s.auth);

  if (loading) return <EnterpriseLoader />;

  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/invite/:token" element={<InviteRedirect />} />

      {/* ── Guest only ── */}
      <Route element={<GuestOnly />}>
        <Route path="/auth" element={<AuthPage />} />
      </Route>

      {/* ── Authenticated ── */}
      <Route element={<RequireAuth />}>

        {/* Profile incomplete only */}
        <Route element={<RequireProfileIncomplete />}>
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
        </Route>

        {/* Profile complete only */}
        <Route element={<RequireProfileComplete />}>

          {/* No company yet */}
          <Route element={<NoCompany />}>
            <Route element={<AppLayout />}>
              <Route path="/company-setup" element={<CompanySetup />} />
            </Route>
          </Route>

          {/* Has a company */}
          <Route element={<RequireCompany />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardResolver />} />

              <Route
                path="/projects"
                element={<Navigate to="/projects/active" replace />}
              />

              <Route element={<RequireRole allow={["isAdmin"]} />}>
                <Route
                  path="/projects/active"
                  element={<ComingSoon title="Active projects" />}
                />
                <Route
                  path="/projects/archived"
                  element={<ComingSoon title="Archived projects" />}
                />
                <Route
                  path="/members"
                  element={<ComingSoon title="Members" />}
                />
              </Route>

              <Route element={<RequireRole allow={["isManager"]} />}>
                <Route
                  path="/projects/managing"
                  element={<ComingSoon title="Managing projects" />}
                />
              </Route>

              <Route element={<RequireRole allow={["isEmployee"]} />}>
                <Route
                  path="/projects/contributing"
                  element={<ComingSoon title="Contributing projects" />}
                />
              </Route>

              <Route path="/chat" element={<ComingSoon title="Chat" />} />
              <Route path="/settings" element={<ComingSoon title="Settings" />} />
            </Route>
          </Route>

        </Route>
      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
