import { memo, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  FolderKanban,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

function RoomList({
  rooms = [],
  activeRoomId,
  loading = false,
  error = null,
  onSelectRoom,
  onRetry,
}) {
  const [search, setSearch] = useState("");

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => r.name?.toLowerCase().includes(q));
  }, [rooms, search]);

  const companyRooms = useMemo(
    () => filteredRooms.filter((r) => r.type === "company"),
    [filteredRooms]
  );
  const managementRooms = useMemo(
    () => filteredRooms.filter((r) => r.type === "management"),
    [filteredRooms]
  );
  const projectRooms = useMemo(
    () => filteredRooms.filter((r) => r.type === "project"),
    [filteredRooms]
  );

  const renderRoomGroup = (title, groupRooms, IconComponent) => {
    if (groupRooms.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
          <IconComponent size={14} className="opacity-70" />
          <span>{title}</span>
          <span className="ml-auto text-[11px] font-normal text-text-muted">
            {groupRooms.length}
          </span>
        </div>
        <div className="mt-1 space-y-1">
          {groupRooms.map((room) => {
            const isActive = room.roomId === activeRoomId;
            return (
              <button
                key={room.roomId}
                type="button"
                onClick={() => onSelectRoom(room)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary ${
                  isActive
                    ? "bg-accent-muted text-brand-primary font-semibold shadow-xs"
                    : "text-text-primary hover:bg-background-subtle"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                    isActive
                      ? "bg-brand-primary/10 text-brand-primary"
                      : "bg-background-subtle text-text-secondary group-hover:text-text-primary"
                  }`}
                >
                  <IconComponent size={16} />
                </div>
                <span className="truncate flex-1">{room.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface-base">
      {/* Search Header */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            aria-label="Search chat channels"
            className="input h-9 w-full rounded-xl pl-9 pr-3 text-xs"
          />
        </div>
      </div>

      {/* Content list area */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Loading Skeleton */}
        {loading && rooms.length === 0 && (
          <div className="space-y-3 p-2" aria-label="Loading channels">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-4 w-28 rounded-md mt-4" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        )}

        {/* Error State */}
        {error && rooms.length === 0 && (
          <div className="p-4 text-center">
            <AlertCircle size={28} className="mx-auto text-status-error mb-2" />
            <p className="text-xs font-semibold text-text-primary">
              Could not load rooms
            </p>
            <p className="text-xs text-text-secondary mt-1">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-3 py-1.5 text-xs font-medium text-text-inverse hover:opacity-90 transition"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && rooms.length === 0 && (
          <EmptyState
            title="No rooms yet"
            description="You don't have access to any chat channels yet."
          />
        )}

        {/* No search matches */}
        {!loading && rooms.length > 0 && filteredRooms.length === 0 && (
          <p className="py-8 text-center text-xs text-text-secondary">
            No rooms match &ldquo;{search}&rdquo;
          </p>
        )}

        {/* Grouped Rooms */}
        {!loading && (
          <>
            {renderRoomGroup("Company", companyRooms, Building2)}
            {renderRoomGroup("Management", managementRooms, ShieldCheck)}
            {renderRoomGroup("Projects", projectRooms, FolderKanban)}
          </>
        )}
      </div>
    </div>
  );
}

export default memo(RoomList);
