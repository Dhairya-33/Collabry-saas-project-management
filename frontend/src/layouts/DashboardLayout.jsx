import { useState } from "react";
import { Outlet } from "react-router-dom";
import Topbar from "@/components/layout/Topbar";
import Sidebar from "@/components/layout/Sidebar";
import ProfilePanel from "@/pages/panels/ProfilePanel";
import NotificationPanel from "@/pages/panels/NotificationPanel";

export default function AppLayout() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <div className="h-screen bg-[rgb(var(--color-background-app))] p-1">
  <div className="h-full rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.06)] flex">

      {/* ===== SIDEBAR COLUMN ===== */}
      <div className="w-72 bg-[rgb(var(--color-surface-base))] border-r border-[rgb(var(--color-border-subtle)/0.08)] flex flex-col">

        {/* Collabry Block */}
       {/* Collabry Block */}
      <div className="h-[64px] flex items-center justify-center border-b border-[rgb(var(--color-border-subtle)/0.08)]">
        <h1 className="text-[25px] italic font-semibold tracking-tight text-[rgb(var(--color-brand-primary))]">
          Collabry
        </h1>
      </div>


        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <Sidebar/>
        </div>
      </div>

      {/* ===== RIGHT SIDE ===== */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Topbar aligned with Collabry block */}
        <div className="h-[64px] bg-[rgb(var(--color-surface-base))] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center">
         <Topbar
           onProfileClick={() => setProfileOpen((prev) => !prev)}
            onNotificationClick={() => setNotificationsOpen((prev) => !prev)}
          />
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          <main className="h-full overflow-y-auto px-10 py-8">
            <Outlet />
          </main>

          <ProfilePanel
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
          />

          <NotificationPanel
            open={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </div>
      </div>
    </div>
    </div>

  );
}
