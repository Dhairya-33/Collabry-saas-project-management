import { Bell, Sun } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function Topbar({
  onProfileClick,
  onNotificationClick,
}) {
  const location = useLocation();

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
          onClick={onNotificationClick}
          className="relative p-2 rounded-full transition hover:bg-[rgb(var(--color-background-subtle))]"
        >
          <Bell
            size={20}
            strokeWidth={1.8}
            className="text-[rgb(var(--color-text-secondary))]"
          />
        </button>

        {/* Dark Mode (placeholder) */}
        <button
          className="p-2 rounded-full transition hover:bg-[rgb(var(--color-background-subtle))]"
        >
          <Sun
            size={20}
            strokeWidth={1.8}
            className="text-[rgb(var(--color-text-secondary))]"
          />
        </button>

        {/* Profile */}
        <button
          onClick={onProfileClick}
          className="h-9 w-9 rounded-full bg-[rgb(var(--color-brand-secondary))] text-white font-semibold text-sm flex items-center justify-center transition hover:scale-105"
        >
          A
        </button>

      </div>
    </div>
  );
}
