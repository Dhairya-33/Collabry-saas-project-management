import { NavLink, useLocation } from "react-router-dom";
import {
  Compass,
  Layers,
  Users,
  MessageSquare,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import React from "react";

function SidebarNav() {
  const location = useLocation();
  const projectActive = location.pathname.startsWith("/projects");

  const [open, setOpen] = useState(projectActive);

  // keep dropdown in sync with route
  useEffect(() => {
    if (projectActive) setOpen(true);
  }, [projectActive]);

  return (
    <nav className="space-y-4">

      <NavItem to="/dashboard" icon={Compass}>
        Overview
      </NavItem>

      {/* Projects */}
      <div>
        <button
          onClick={() => setOpen((s) => !s)}
          className={`flex items-center gap-3 w-full text-[15px] font-semibold px-3 py-3 rounded-lg transition ${
            projectActive
              ? "text-[rgb(var(--color-brand-primary))]"
              : "text-[rgb(var(--color-text-primary))]"
          }`}
        >
          <Layers size={20} strokeWidth={1.8} />
          Projects

          <span
            className={`ml-auto text-xs transition-transform ${
              open ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            open ? "max-h-96" : "max-h-0"
          }`}
        >
          <div className="pl-9 mt-2 space-y-2 border-l border-[rgb(var(--color-border-subtle))]">

            <SubItem to="/projects/active">Active</SubItem>
            <SubItem to="/projects/managing">Managing</SubItem>
            <SubItem to="/projects/contributing">Contributing</SubItem>
            <SubItem to="/projects/archived">Archived</SubItem>

          </div>
        </div>
      </div>

      <NavItem to="/members" icon={Users}>
        Members
      </NavItem>

      <NavItem to="/chat" icon={MessageSquare}>
        Chat
      </NavItem>

      <NavItem to="/settings" icon={Settings}>
        Settings
      </NavItem>

    </nav>
  );
}

/* ================= ITEMS ================= */

function NavItem({ to, icon: Icon, children }) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <div
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-semibold transition ${
            isActive
              ? "bg-[rgb(var(--color-accent-muted))] text-[rgb(var(--color-brand-primary))]"
              : "text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-background-subtle))]"
          }`}
        >
          <Icon size={20} strokeWidth={1.8} />
          {children}
        </div>
      )}
    </NavLink>
  );
}

function SubItem({ to, children }) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <div
          className={`px-3 py-2.5 rounded-lg text-[14px] transition ${
            isActive
              ? "bg-[rgb(var(--color-accent-muted))] text-[rgb(var(--color-brand-primary))] font-semibold"
              : "text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]"
          }`}
        >
          {children}
        </div>
      )}
    </NavLink>
  );
}

export default React.memo(SidebarNav);