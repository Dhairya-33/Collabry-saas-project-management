import { NavLink, useLocation } from "react-router-dom";
import {
  Compass,
  Layers,
  Users,
  MessageSquare,
  Settings,
} from "lucide-react";
import { memo, useState } from "react";
import { useSelector } from "react-redux";

function SidebarNav() {
  const location = useLocation();
  const roles = useSelector((s) => s.overview.data.roles);
  const projectActive = location.pathname.startsWith("/projects");

  const [open, setOpen] = useState(projectActive);
  const [wasActive, setWasActive] = useState(projectActive);

  // open the group when the route moves into /projects
  if (projectActive !== wasActive) {
    setWasActive(projectActive);
    if (projectActive) setOpen(true);
  }

  const projectLinks = [
    roles.isAdmin && { to: "/projects/active", label: "Active" },
    roles.isManager && { to: "/projects/managing", label: "Managing" },
    roles.isEmployee && { to: "/projects/contributing", label: "Contributing" },
    roles.isAdmin && { to: "/projects/archived", label: "Archived" },
  ].filter(Boolean);

  return (
    <nav className="space-y-4">

      <NavItem to="/dashboard" icon={Compass}>
        Overview
      </NavItem>

      {/* Projects */}
      {projectLinks.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            aria-expanded={open}
            className={`flex items-center gap-3 w-full text-[15px] font-semibold px-3 py-3 rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-brand-secondary))] ${
              projectActive
                ? "text-[rgb(var(--color-brand-primary))]"
                : "text-[rgb(var(--color-text-primary))]"
            }`}
          >
            <Layers size={20} strokeWidth={1.8} />
            Projects

            <span
              aria-hidden="true"
              className={`ml-auto text-xs transition-transform ${
                open ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>
          </button>

          <div
            inert={!open}
            className={`overflow-hidden transition-all duration-300 ${
              open ? "max-h-96" : "max-h-0"
            }`}
          >
            <div className="pl-9 mt-2 space-y-2 border-l border-[rgb(var(--color-border-subtle))]">
              {projectLinks.map((link) => (
                <SubItem key={link.to} to={link.to}>
                  {link.label}
                </SubItem>
              ))}
            </div>
          </div>
        </div>
      )}

      {roles.isAdmin && (
        <NavItem to="/members" icon={Users}>
          Members
        </NavItem>
      )}

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
    <NavLink to={to} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-brand-secondary))]">
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
    <NavLink to={to} className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-brand-secondary))]">
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

export default memo(SidebarNav);
