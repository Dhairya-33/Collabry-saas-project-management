import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MessageSquare } from "lucide-react";
import RoomList from "./RoomList";
import MessagePane from "./MessagePane";
import EmptyState from "@/components/ui/EmptyState";
import { connectSocket, joinRoom, socket } from "@/lib/socket";
import {
  getChatRooms,
  setActiveRoom,
  messageReceived,
  messageDeleted,
  setTypingUser,
  setSocketError,
  roomRevoked,
} from "@/store/chatSlice";

export default function ChatPage() {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.auth.user);
  const { rooms, roomsLoading, roomsError, activeRoomId } = useSelector((s) => s.chat);

  const [mobilePane, setMobilePane] = useState("rooms"); // "rooms" | "messages"

  // Load chat rooms on mount
  useEffect(() => {
    dispatch(getChatRooms());
  }, [dispatch]);

  // Connect socket and listen for realtime events
  useEffect(() => {
    if (currentUser) {
      connectSocket();
    }

    const onConnect = () => {
      if (activeRoomId) {
        joinRoom(activeRoomId);
      }
    };

    const onReceiveMessage = (message) => {
      if (message) {
        dispatch(messageReceived(message));
      }
    };

    const onFileShared = (message) => {
      if (message) {
        dispatch(messageReceived(message));
      }
    };

    const onTyping = (data) => {
      if (data && String(data.userId) !== String(currentUser?._id)) {
        dispatch(
          setTypingUser({
            roomId: activeRoomId,
            userId: data.userId,
            userName: data.userName,
            isTyping: data.isTyping,
          })
        );
      }
    };

    const onMessageDeleted = (data) => {
      if (data?._id && data?.room) {
        dispatch(messageDeleted({ roomId: data.room, messageId: data._id }));
      }
    };

    const onRoomRevoked = (revokedId) => {
      if (revokedId) {
        dispatch(roomRevoked(revokedId));
      }
    };

    const onError = (err) => {
      const message = typeof err === "string" ? err : err?.message || "Socket error";
      dispatch(setSocketError(message));
    };

    socket.on("connect", onConnect);
    socket.on("receiveMessage", onReceiveMessage);
    socket.on("fileShared", onFileShared);
    socket.on("typing", onTyping);
    socket.on("messageDeleted", onMessageDeleted);
    socket.on("roomRevoked", onRoomRevoked);
    socket.on("error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("receiveMessage", onReceiveMessage);
      socket.off("fileShared", onFileShared);
      socket.off("typing", onTyping);
      socket.off("messageDeleted", onMessageDeleted);
      socket.off("roomRevoked", onRoomRevoked);
      socket.off("error", onError);
    };
  }, [dispatch, currentUser, activeRoomId]);

  // When active room changes, join room on socket
  useEffect(() => {
    if (activeRoomId) {
      joinRoom(activeRoomId);
    }
  }, [activeRoomId]);

  const activeRoom = useMemo(
    () => rooms.find((r) => r.roomId === activeRoomId) || null,
    [rooms, activeRoomId]
  );

  const handleSelectRoom = (room) => {
    dispatch(setActiveRoom(room.roomId));
    setMobilePane("messages");
  };

  const handleRetryRooms = () => {
    dispatch(getChatRooms());
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.28))]">
      {/* Page Title for Context */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-2 text-brand-primary">
          <MessageSquare size={20} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Collaboration
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">Chat</h1>
      </div>

      {/* Main Chat Container */}
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-2xl border border-border bg-surface-base shadow-soft">
        {/* Left Pane: Room List */}
        <aside
          className={`w-full md:w-80 shrink-0 border-r border-border flex flex-col ${
            mobilePane === "messages" ? "hidden md:flex" : "flex"
          }`}
          aria-label="Chat Channels"
        >
          <RoomList
            rooms={rooms}
            activeRoomId={activeRoomId}
            loading={roomsLoading}
            error={roomsError}
            onSelectRoom={handleSelectRoom}
            onRetry={handleRetryRooms}
          />
        </aside>

        {/* Right Pane: Messages + Composer */}
        <main
          className={`flex-1 min-w-0 flex flex-col ${
            mobilePane === "rooms" ? "hidden md:flex" : "flex"
          }`}
          aria-label="Conversation"
        >
          {activeRoom ? (
            <MessagePane
              activeRoom={activeRoom}
              onBackToRooms={() => setMobilePane("rooms")}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState
                title="Select a conversation"
                description="Choose a chat channel from the left to start messaging your team."
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
