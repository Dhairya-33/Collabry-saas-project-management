import api from "../lib/axios";

export const createCompany = async (data) => (await api.post("/company/create", data)).data;
export const joinCompany = async ({ token }) => (await api.post("/company/join", { token })).data;

// body: { inviteToken, expiresIn }  (top level, not under data)
export const fetchCompanyInviteToken = async () => (await api.get("/company/company-invite")).data;

export const removeCompanyMember = async (data) => (await api.post("/company/member/remove", data)).data;
export const reassignProjectManager = async (data) => (await api.post("/company/manager/reassign", data)).data;

// body.data: { totalMembers, members }
export const fetchCompanyMembers = async () => (await api.get("/company/members")).data;

// body.data: { roles, admin, manager, employee }
export const fetchOverview = async () => (await api.get("/company/overview")).data;
