import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchChatRooms,
  fetchRoomMessages,
  deleteChatMessage as deleteChatMessageService,
} from "@/services/chat.service";
import { clearUser } from "./authSlice";

// Helper to deduplicate messages by ID and file URL/timestamp
const mergeMessages = (existing = [], incoming = [], prepend = false) => {
  const map = new Map();
  const list = prepend ? [...incoming, ...existing] : [...existing, ...incoming];
  const result = [];

  for (const m of list) {
    if (!m) continue;
    const id = m._id ? String(m._id) : null;
    if (id && map.has(id)) continue;

    // Deduplicate file messages that may be broadcast twice within 5 seconds
    const isFileDup =
      m.fileUrl &&
      result.some(
        (prev) =>
          prev.fileUrl === m.fileUrl &&
          prev.room === m.room &&
          Math.abs(new Date(prev.createdAt || 0) - new Date(m.createdAt || 0)) < 5000
      );
    if (isFileDup) continue;

    if (id) map.set(id, true);
    result.push(m);
  }

  return result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
};

export const getChatRooms = createAsyncThunk(
  "chat/getRooms",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchChatRooms();
      return Array.isArray(res?.data) ? res.data : [];
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to load chat rooms");
    }
  }
);

export const getRoomMessagesThunk = createAsyncThunk(
  "chat/getMessages",
  async ({ roomId, before }, { rejectWithValue }) => {
    try {
      const res = await fetchRoomMessages(roomId, { limit: 50, before });
      return {
        roomId,
        messages: Array.isArray(res?.data) ? res.data : [],
        pagination: res?.pagination || { limit: 50, hasMore: false, nextBefore: null },
        isOlder: Boolean(before),
      };
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to load messages");
    }
  }
);

export const deleteChatMessageThunk = createAsyncThunk(
  "chat/deleteMessage",
  async ({ messageId, roomId }, { rejectWithValue }) => {
    try {
      await deleteChatMessageService(messageId);
      return { messageId, roomId };
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to delete message");
    }
  }
);

const initialState = {
  rooms: [],
  roomsLoading: false,
  roomsError: null,
  activeRoomId: null,
  messages: {}, // { [roomId]: [messages] }
  pagination: {}, // { [roomId]: { limit: 50, hasMore: false, nextBefore: null, loadingMore: false } }
  historyLoading: false,
  historyError: null,
  socketError: null,
  roomRevokedNotice: null,
  typingUsers: {}, // { [roomId]: [ { userId, userName } ] }
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveRoom: (state, action) => {
      state.activeRoomId = action.payload;
      state.socketError = null;
      state.roomRevokedNotice = null;
    },
    messageReceived: (state, action) => {
      const message = action.payload;
      if (!message || !message.room) return;
      const roomId = message.room;
      const current = state.messages[roomId] || [];
      state.messages[roomId] = mergeMessages(current, [message], false);
    },
    messageDeleted: (state, action) => {
      const { roomId, messageId } = action.payload || {};
      if (!roomId || !messageId || !state.messages[roomId]) return;
      state.messages[roomId] = state.messages[roomId].filter(
        (m) => String(m._id) !== String(messageId)
      );
    },
    setTypingUser: (state, action) => {
      const { roomId, userId, userName, isTyping } = action.payload || {};
      if (!roomId || !userId) return;
      const list = state.typingUsers[roomId] || [];
      if (isTyping) {
        if (!list.some((u) => u.userId === userId)) {
          state.typingUsers[roomId] = [...list, { userId, userName }];
        }
      } else {
        state.typingUsers[roomId] = list.filter((u) => u.userId !== userId);
      }
    },
    clearTypingUsers: (state, action) => {
      const roomId = action.payload;
      if (roomId) {
        state.typingUsers[roomId] = [];
      }
    },
    setSocketError: (state, action) => {
      state.socketError = action.payload;
    },
    clearSocketError: (state) => {
      state.socketError = null;
    },
    roomRevoked: (state, action) => {
      const revokedId = action.payload;
      state.rooms = state.rooms.filter((r) => r.roomId !== revokedId);
      if (state.activeRoomId === revokedId) {
        state.roomRevokedNotice = "Access to this room was revoked.";
        state.activeRoomId = state.rooms.length > 0 ? state.rooms[0].roomId : null;
      }
    },
    clearRevokedNotice: (state) => {
      state.roomRevokedNotice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Reset on logout
      .addCase(clearUser, () => initialState)

      // Rooms list
      .addCase(getChatRooms.pending, (state) => {
        state.roomsLoading = true;
        state.roomsError = null;
      })
      .addCase(getChatRooms.fulfilled, (state, action) => {
        state.roomsLoading = false;
        state.rooms = action.payload;
        state.roomsError = null;
        if (!state.activeRoomId && action.payload.length > 0) {
          state.activeRoomId = action.payload[0].roomId;
        }
      })
      .addCase(getChatRooms.rejected, (state, action) => {
        state.roomsLoading = false;
        state.roomsError = action.payload || "Failed to load rooms";
      })

      // Room messages history
      .addCase(getRoomMessagesThunk.pending, (state, action) => {
        const { before, roomId } = action.meta.arg;
        if (before) {
          if (!state.pagination[roomId]) {
            state.pagination[roomId] = { limit: 50, hasMore: false, nextBefore: null, loadingMore: true };
          } else {
            state.pagination[roomId].loadingMore = true;
          }
        } else {
          state.historyLoading = true;
          state.historyError = null;
        }
      })
      .addCase(getRoomMessagesThunk.fulfilled, (state, action) => {
        const { roomId, messages, pagination, isOlder } = action.payload;
        state.historyLoading = false;
        state.historyError = null;

        const current = state.messages[roomId] || [];
        state.messages[roomId] = mergeMessages(current, messages, isOlder);
        state.pagination[roomId] = {
          ...pagination,
          loadingMore: false,
        };
      })
      .addCase(getRoomMessagesThunk.rejected, (state, action) => {
        const { before, roomId } = action.meta.arg;
        state.historyLoading = false;
        if (before) {
          if (state.pagination[roomId]) {
            state.pagination[roomId].loadingMore = false;
          }
        } else {
          state.historyError = action.payload || "Failed to load messages";
        }
      })

      // Delete message
      .addCase(deleteChatMessageThunk.fulfilled, (state, action) => {
        const { roomId, messageId } = action.payload;
        if (roomId && messageId && state.messages[roomId]) {
          state.messages[roomId] = state.messages[roomId].filter(
            (m) => String(m._id) !== String(messageId)
          );
        }
      });
  },
});

export const {
  setActiveRoom,
  messageReceived,
  messageDeleted,
  setTypingUser,
  clearTypingUsers,
  setSocketError,
  clearSocketError,
  roomRevoked,
  clearRevokedNotice,
} = chatSlice.actions;

export default chatSlice.reducer;
