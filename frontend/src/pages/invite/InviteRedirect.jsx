import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";

export default function InviteRedirect() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useSelector((s) => s.auth);

  useEffect(() => {
    // wait until auth state is resolved
    if (loading) return;

    // invalid invite URL
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    /**
     * Always persist token.
     * This guarantees:
     * - survives login / register
     * - survives refresh
     * - survives auth redirects
     */
    sessionStorage.setItem("inviteToken", token);

    /**
     * Routing decision:
     * - logged out → auth
     * - logged in  → system entry (DecisionLayout handles rest)
     */
    if (!user) {
      navigate("/auth", { replace: true });
    } else {
      navigate("/company-setup", { replace: true });
    }
  }, [token, user, loading, navigate]);

  return null;
}
