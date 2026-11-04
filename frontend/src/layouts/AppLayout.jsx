import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="h-screen flex flex-col bg-background-app text-text-primary">
      {/* Fixed Topbar */}
      <Topbar />

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 min-h-full">
          <Outlet />
        </div>
      </div>

      {/* Persistent Footer */}
      <Footer />
    </div>
  );
}

 function Topbar() {
  return (
    <header className="h-14 flex items-center justify-center bg-surface-base border-b border-border-subtle">
      <div className="text-center">
        <div className="text-base font-semibold tracking-wide text-text-primary">
          Collabry
        </div>
        <div className="text-[10px] uppercase tracking-widest text-text-muted">
          Workspace Platform
        </div>
      </div>
    </header>
  );
}


function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="h-12 flex items-center justify-between px-8 border-t border-border-subtle bg-background-subtle text-xs text-text-muted">
      {/* Left */}
      <div>
        © {year} Collabry
      </div>

      {/* Right */}
      <div>
        v1.0.0 · Production
      </div>
    </footer>
  );
}
