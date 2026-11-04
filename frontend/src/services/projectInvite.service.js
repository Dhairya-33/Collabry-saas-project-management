import api from "../lib/axios";

export const createProjectInvite = async (data) => (await api.post("/project/invite", data)).data; // { inviteeId, projectId }
// accept: { projectInviteId, status: "accepted" }   decline: { projectInviteId, status: "rejected", reason }
export const respondToProjectInvite = async (data) => (await api.post("/project/invite/respond", data)).data;
// body.data: { invites }
export const fetchMyProjectInvites = async () => (await api.get("/project/invite/my")).data;
