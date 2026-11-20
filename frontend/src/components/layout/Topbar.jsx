import { Bell, Sun } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Avatar from "@/components/ui/Avatar";

export default function Topbar({
  onProfileClick,
  onNotificationClick,
}) {
  const location = useLocation();
  const user = useSelector((s) => s.auth.user);
  const inviteCount = useSelector((s) => s.invites.data?.length ?? 0);

  const getTitle = () => {
    if (location.pathname.startsWith("/projects/active"))
      return "Active Projects";
    if (location.pathname.startsWith("/projects/managing"))
      return "Managing Projects";
    if (location.pathname.startsWith("/projects/contributing"))
      return "Contributing Projects";
    if (location.pathname.startsWith("/projects/archived"))
      return "Archived Projects";
    if (location.pathname.startsWith("/members"))
      return "Members";
    if (location.pathname.startsWith("/chat"))
      return "Chat";
    if (location.pathname.startsWith("/settings"))
      return "Settings";
    return "Overview";
  };

  return (
    <div className="w-full h-full px-8 grid grid-cols-[1fr_auto_1fr] items-center">

      {/* LEFT (empty for balance) */}
      <div />

      {/* CENTER TITLE */}
      <div className="text-center">
        <h1 className="text-[20px] font-semibold tracking-tight text-[rgb(var(--color-text-primary))]">
          {getTitle()}
        </h1>
      </div>

      {/* RIGHT ACTIONS */}
      <div className="flex justify-end items-center gap-5">

        {/* Notification */}
        <button
          type="button"
          onClick={onNotificationClick}
          aria-label={
            inviteCount > 0
              ? `Notifications, ${inviteCount} new`
              : "Notifications"
          }
          className="relative p-2 rounded-full transition hover:bg-[rgb(var(--color-background-subtle))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-brand-secondary))]"
        >
          <Bell
            size={20}
            strokeWidth={1.8}
            className="text-[rgb(var(--color-text-secondary))]"
          />
          {inviteCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[rgb(var(--color-status-error))]" />
          )}
        </button>

        {/* Dark Mode (placeholder) */}
        <button
          type="button"
          aria-label="Theme"
          className="p-2 rounded-full transition hover:bg-[rgb(var(--color-background-subtle))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-brand-secondary))]"
        >
          <Sun
            size={20}
            strokeWidth={1.8}
            className="text-[rgb(var(--color-text-secondary))]"
          />
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={onProfileClick}
          aria-label="Open profile"
          className="rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-brand-secondary))]"
        >
          <Avatar
            user={user}
            className="h-9 w-9 bg-[rgb(var(--color-brand-secondary))] text-white font-semibold text-sm"
          />
        </button>

      </div>
    </div>
  );
}
