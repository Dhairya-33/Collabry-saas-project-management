import { memo, useEffect, useRef, useState, useLayoutEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  FolderKanban,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import MessageItem from "./MessageItem";
import Composer from "./Composer";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  getRoomMessagesThunk,
  deleteChatMessageThunk,
  clearSocketError,
  clearRevokedNotice,
} from "@/store/chatSlice";

const formatDateLabel = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return "Today";

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

function MessagePane({ activeRoom, onBackToRooms }) {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.auth.user);
  const chatState = useSelector((s) => s.chat);

  const activeRoomId = activeRoom?.roomId;
  const messages = useMemo(
    () => chatState.messages[activeRoomId] || [],
    [chatState.messages, activeRoomId]
  );
  const pagination = chatState.pagination[activeRoomId];
  const historyLoading = chatState.historyLoading;
  const historyError = chatState.historyError;
  const socketError = chatState.socketError;
  const revokedNotice = chatState.roomRevokedNotice;
  const typingUsers = chatState.typingUsers[activeRoomId] || [];

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const scrollContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const isPrependingRef = useRef(false);

  // Initial load when room opens
  useEffect(() => {
    if (activeRoomId && !chatState.messages[activeRoomId]) {
      dispatch(getRoomMessagesThunk({ roomId: activeRoomId }));
    }
  }, [activeRoomId, dispatch, chatState.messages]);

  // Track scroll position to know if user is at the bottom
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 120;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  // Adjust scroll position after prepending older messages
  useLayoutEffect(() => {
    if (isPrependingRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const heightDifference = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop += heightDifference;
      isPrependingRef.current = false;
    }
  }, [messages]);

  // Auto-scroll to newest message when at bottom
  useEffect(() => {
    if (isAtBottomRef.current && scrollContainerRef.current && !isPrependingRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Scroll to bottom on initial room switch
  useEffect(() => {
    isAtBottomRef.current = true;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [activeRoomId]);

  const handleLoadOlder = async () => {
    if (!pagination?.nextBefore || pagination?.loadingMore || !activeRoomId) return;

    const container = scrollContainerRef.current;
    if (container) {
      prevScrollHeightRef.current = container.scrollHeight;
      isPrependingRef.current = true;
    }

    try {
      await dispatch(
        getRoomMessagesThunk({
          roomId: activeRoomId,
          before: pagination.nextBefore,
        })
      ).unwrap();
    } catch {
      isPrependingRef.current = false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !activeRoomId) return;
    setDeleteError("");
    try {
      await dispatch(
        deleteChatMessageThunk({
          messageId: deleteTarget._id,
          roomId: activeRoomId,
        })
      ).unwrap();
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(
        typeof err === "string" ? err : err?.message || "Failed to delete message"
      );
    }
  };

  const getRoomIcon = (type) => {
    switch (type) {
      case "company":
        return <Building2 size={18} className="text-brand-primary" />;
      case "management":
        return <ShieldCheck size={18} className="text-brand-secondary" />;
      default:
        return <FolderKanban size={18} className="text-brand-primary" />;
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-background-app/50">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface-base px-4 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            type="button"
            onClick={onBackToRooms}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-background-subtle transition"
            aria-label="Back to conversations"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background-subtle border border-border">
            {getRoomIcon(activeRoom?.type)}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-text-primary">
              {activeRoom?.name || "Chat Room"}
            </h2>
            <p className="truncate text-xs text-text-secondary capitalize">
              {activeRoom?.type === "company"
                ? "Company Wide"
                : activeRoom?.type === "management"
                ? "Management Only"
                : "Project Room"}
            </p>
          </div>
        </div>
      </header>

      {/* Socket Error Notice */}
      {socketError && (
        <div
          role="alert"
          className="mx-4 mt-2 flex items-center justify-between rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-2 text-xs text-status-error animate-fadeIn"
        >
          <span>{socketError}</span>
          <button
            type="button"
            onClick={() => dispatch(clearSocketError())}
            className="rounded-full p-1 hover:bg-status-error/10"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Revoked Notice */}
      {revokedNotice && (
        <div
          role="status"
          className="mx-4 mt-2 flex items-center justify-between rounded-xl border border-status-warning/20 bg-status-warning/10 px-4 py-2 text-xs text-status-warning animate-fadeIn"
        >
          <span>{revokedNotice}</span>
          <button
            type="button"
            onClick={() => dispatch(clearRevokedNotice())}
            className="rounded-full p-1 hover:bg-status-warning/10"
            aria-label="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Delete Error Notice */}
      {deleteError && (
        <div
          role="alert"
          className="mx-4 mt-2 flex items-center justify-between rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-2 text-xs text-status-error animate-fadeIn"
        >
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError("")}
            className="rounded-full p-1 hover:bg-status-error/10"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Message List Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 py-4"
      >
        {/* Loading history skeleton */}
        {historyLoading && messages.length === 0 && (
          <div className="space-y-4 px-4 py-6" aria-label="Loading messages">
            <div className="flex items-start gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24 rounded-lg" />
                <Skeleton className="h-10 w-48 rounded-2xl" />
              </div>
            </div>
            <div className="flex flex-row-reverse items-start gap-2.5">
              <div className="space-y-1.5 items-end flex flex-col">
                <Skeleton className="h-12 w-64 rounded-2xl" />
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20 rounded-lg" />
                <Skeleton className="h-14 w-56 rounded-2xl" />
              </div>
            </div>
          </div>
        )}

        {/* History Error State */}
        {historyError && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="rounded-2xl border border-status-error/20 bg-status-error/5 p-6 max-w-sm">
              <AlertCircle size={32} className="mx-auto text-status-error mb-2" />
              <p className="text-sm font-semibold text-text-primary">
                Could not load messages
              </p>
              <p className="text-xs text-text-secondary mt-1">{historyError}</p>
              <button
                type="button"
                onClick={() =>
                  dispatch(getRoomMessagesThunk({ roomId: activeRoomId }))
                }
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-4 py-2 text-xs font-medium text-text-inverse hover:opacity-90 transition"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* Load older messages button */}
        {pagination?.hasMore && (
          <div className="py-2 text-center">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={pagination?.loadingMore}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-base px-3.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-background-subtle hover:text-text-primary transition disabled:opacity-50"
            >
              {pagination?.loadingMore ? (
                <>
                  <Loader2 size={13} className="animate-spin text-brand-primary" />
                  <span>Loading older messages...</span>
                </>
              ) : (
                <span>Load older messages</span>
              )}
            </button>
          </div>
        )}

        {/* Empty state: No messages yet */}
        {!historyLoading && !historyError && messages.length === 0 && (
          <EmptyState
            title="No messages yet"
            description="Send a message to start the conversation."
          />
        )}

        {/* Messages with Day Separators */}
        {messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const currentDate = new Date(msg.createdAt).toDateString();
          const prevDate = prevMsg
            ? new Date(prevMsg.createdAt).toDateString()
            : null;
          const showDateSeparator = currentDate !== prevDate;
          const isOwn =
            String(msg.sender?._id || msg.sender) === String(currentUser?._id);

          return (
            <div key={msg._id || idx}>
              {showDateSeparator && (
                <div className="my-4 flex items-center justify-center">
                  <span className="rounded-full bg-background-subtle border border-border px-3 py-1 text-[11px] font-medium text-text-secondary">
                    {formatDateLabel(msg.createdAt)}
                  </span>
                </div>
              )}
              <MessageItem
                message={msg}
                isOwn={isOwn}
                onDelete={(target) => setDeleteTarget(target)}
              />
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <Composer activeRoomId={activeRoomId} typingUsers={typingUsers} />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete message?"
        message="Are you sure you want to delete this message? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError("");
        }}
      />
    </div>
  );
}

export default memo(MessagePane);
