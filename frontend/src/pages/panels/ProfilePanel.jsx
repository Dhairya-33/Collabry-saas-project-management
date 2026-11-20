import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "@/services/auth.service";
import { clearUser } from "@/store/authSlice";
import Avatar from "@/components/ui/Avatar";

export default function ProfilePanel({ open, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const roles = useSelector((s) => s.overview.data.roles);

  const roleLabel =
    [
      roles.isAdmin && "Admin",
      roles.isManager && "Manager",
      roles.isEmployee && "Employee",
    ]
      .filter(Boolean)
      .join(" · ") || "Workspace Member";

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const goTo = (path, state) => {
    onClose();
    navigate(path, { state });
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      /* the session may already be gone; clear local state anyway */
    } finally {
      dispatch(clearUser());
      navigate("/auth", { replace: true });
    }
  };

  return (
    <>
      {/* CLICK-CAPTURE LAYER (no blur, invisible) */}
      {open && (
        <div
          onClick={onClose}
          className="absolute inset-0 z-40"
        />
      )}

      {/* PANEL */}
      <div
        role="dialog"
        aria-label="Profile"
        aria-hidden={!open}
        inert={!open}
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-0 right-0 h-full w-[340px] bg-[#FFFFFF] z-50
        border-l border-[#E5E7EB]
        shadow-[0_10px_30px_rgba(0,0,0,0.06)]
        transition-all duration-300 ease-out
        ${open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
      >
        <div className="h-full flex flex-col justify-between px-6 py-6">

          {/* TOP */}
          <div>
            {/* USER */}
            <div className="flex items-center gap-3 mb-6">
              <Avatar
                user={user}
                className="w-10 h-10 bg-[#F1F5F9] text-sm font-semibold text-[#1F2933]"
              />

              <div>
                <div className="text-[15px] font-semibold text-[#1F2933] leading-tight">
                  {user?.fullname || user?.username || "User"}
                </div>
                <div className="text-[12px] text-[#6B7280]">
                  {roleLabel}
                </div>
              </div>
            </div>

            <div className="border-t border-[#F1F5F9] my-4" />

            {/* SECTION */}
            <div className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wide mb-2">
              Account
            </div>

            {/* ACTIONS */}
            <div className="space-y-1 text-[14px]">
              <button
                type="button"
                onClick={() => goTo("/settings", { tab: "profile" })}
                className="w-full text-left px-3 py-2 rounded-lg
                hover:bg-[#F6F4F0] active:scale-[0.98] transition"
              >
                Update Profile
              </button>

              <button
                type="button"
                onClick={() => goTo("/settings", { tab: "password" })}
                className="w-full text-left px-3 py-2 rounded-lg
                hover:bg-[#F6F4F0] active:scale-[0.98] transition"
              >
                Change Password
              </button>
            </div>
          </div>

          {/* BOTTOM */}
          <div>
            <div className="border-t border-[#F1F5F9] my-4" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg
              text-red-500 font-medium
              hover:bg-red-50 active:scale-[0.98] transition"
            >
              Logout
            </button>

            {/* UX Hint */}
            <div className="text-[11px] text-[#9CA3AF] mt-4">
              Click outside anywhere to close
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
