import api from "../lib/axios";

const room = (id) => encodeURIComponent(id);

// body.data: [{ roomId, name, type: "company" | "management" | "project" }]
export const fetchChatRooms = async () => (await api.get("/chat")).data;

// oldest -> newest. body: { data: [...], pagination: { limit, hasMore, nextBefore } }
export const fetchRoomMessages = async (roomId, { limit = 50, before } = {}) =>
  (await api.get(`/chat/${room(roomId)}`, { params: { limit, ...(before ? { before } : {}) } })).data;

export const uploadChatFile = async (roomId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return (await api.post(`/chat/upload/${room(roomId)}`, formData)).data;
};

export const deleteChatMessage = async (messageId) => (await api.delete(`/chat/message/${messageId}`)).data;
