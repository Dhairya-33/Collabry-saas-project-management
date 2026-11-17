import { io } from "socket.io-client";

const getSocketUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  try {
    const url = new URL(base, typeof window !== "undefined" ? window.location.origin : undefined);
    const pathname = url.pathname.replace(/\/api\/?$/, "");
    return `${url.origin}${pathname === "/" ? "" : pathname}`;
  } catch {
    return base.replace(/\/api\/?$/, "");
  }
};

export const socket = io(getSocketUrl(), {
  withCredentials: true,
  autoConnect: false,
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

/**
 * Subscribes to the Redux store to manage socket connection lifecycle:
 * - connects after login / initial session check
 * - disconnects on logout (clearUser)
 */
export const initSocketLifecycle = (store) => {
  let prevUser = store.getState().auth?.user;
  if (prevUser) {
    connectSocket();
  }

  store.subscribe(() => {
    const currentUser = store.getState().auth?.user;
    if (currentUser && !prevUser) {
      connectSocket();
    } else if (!currentUser && prevUser) {
      disconnectSocket();
    }
    prevUser = currentUser;
  });
};

/**
 * Join room helper matching backend room naming and events:
 * - company_<id> -> joinCompanyRoom(id)
 * - company_<id>_management -> joinManagementRoom(id)
 * - <projectId> -> joinProjectRoom(id)
 */
export const joinRoom = (roomOrId) => {
  if (!roomOrId || !socket.connected) return;
  const roomId = typeof roomOrId === "string" ? roomOrId : roomOrId.roomId;
  const type =
    (typeof roomOrId === "object" && roomOrId.type) ||
    (roomId.startsWith("company_")
      ? roomId.endsWith("_management")
        ? "management"
        : "company"
      : "project");

  if (type === "company") {
    const companyId = roomId.replace(/^company_/, "");
    socket.emit("joinCompanyRoom", companyId);
  } else if (type === "management") {
    const companyId = roomId.replace(/^company_/, "").replace(/_management$/, "");
    socket.emit("joinManagementRoom", companyId);
  } else if (type === "project") {
    socket.emit("joinProjectRoom", roomId);
  }
};
