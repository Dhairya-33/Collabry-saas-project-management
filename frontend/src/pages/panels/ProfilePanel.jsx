import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "@/services/auth.service";
import { clearUser } from "@/store/authSlice";

export default function ProfilePanel({ open, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    finally {
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
              <div className="w-10 h-10 rounded-full bg-[#F1F5F9] flex items-center justify-center text-sm font-semibold text-[#1F2933]">
                {user?.fullname?.[0] || user?.username?.[0] || "U"}
              </div>

              <div>
                <div className="text-[15px] font-semibold text-[#1F2933] leading-tight">
                  {user?.fullname || user?.username || "User"}
                </div>
                <div className="text-[12px] text-[#6B7280]">
                  {/* TODO: replace with real role */}
                  Workspace Member
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
                onClick={() => {
                  // TODO: implement profile page
                  navigate("/profile");
                }}
                className="w-full text-left px-3 py-2 rounded-lg 
                hover:bg-[#F6F4F0] active:scale-[0.98] transition"
              >
                Update Profile
              </button>

              <button
                onClick={() => {
                  // TODO: implement change password page
                  navigate("/change-password");
                }}
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