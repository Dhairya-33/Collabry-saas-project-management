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


// import FullPageSpinner from "@/pages/loader/Loader";

/* ================= GUARDS ================= */

/** Blocks unauthenticated users → /auth */
function RequireAuth() {
  const { user } = useSelector(s => s.auth);
  return user ? <Outlet /> : <Navigate to="/auth" replace />;
}

/** Blocks authenticated users → /dashboard */
function GuestOnly() {
  const { user } = useSelector(s => s.auth);
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

/** Blocks users with an incomplete profile → /complete-profile */
function RequireProfileComplete() {
  const { user } = useSelector(s => s.auth);
  return !user?.isProfileComplete
    ? <Navigate to="/complete-profile" replace />
    : <Outlet />;
}

/** Blocks users with a complete profile → /dashboard */
function RequireProfileIncomplete() {
  const { user } = useSelector(s => s.auth);
  return user?.isProfileComplete
    ? <Navigate to="/dashboard" replace />
    : <Outlet />;
}

/* ================= ROUTES ================= */

export default function AppRoutes() {
  const { loading } = useSelector(s => s.auth);

  if (loading) return null;

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
          <Route element={<AppLayout />}>
            <Route path="/company-setup" element={<CompanySetup />} />
          </Route>

          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardResolver />} />

            {/* <Route path="/projects">
              <Route path="active" element={<ActiveProjects />} />
              <Route path="managing" element={<Managing />} />
              <Route path="contributing" element={<Contributing />} />
              <Route path="archived" element={<Archived />} />
            </Route>

            <Route path="/members" element={<Members />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} /> */}
          </Route>
        </Route>

      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}