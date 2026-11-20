import api from "../lib/axios";

/* ===== ADMIN ===== */
export const createProject = async (data) => (await api.post("/project/create", data)).data;
export const fetchAllProjects = async () => (await api.get("/project/all")).data;
export const fetchArchivedProjects = async () => (await api.get("/project/archived")).data;
export const archiveProject = async (data) => (await api.post("/project/archive", data)).data; // { projectId, archived }

/* ===== MANAGER ===== */
export const fetchManagingProjects = async () => (await api.get("/project/my/manager")).data;
export const addProjectEmployee = async (data) => (await api.post("/project/member/add", data)).data; // { empId, projectId }
export const removeProjectEmployee = async (data) => (await api.delete("/project/member/remove", { data })).data;
export const fetchProjectEmployees = async (data) => (await api.post("/project/employees", data)).data; // { projectId }

/* ===== EMPLOYEE ===== */
export const fetchContributingProjects = async () => (await api.get("/project/my/employee")).data;

/* ===== ANY MEMBER ===== */
// body.data: { project, role, manager }
export const getProject = async (projectId) => (await api.get(`/project/${projectId}`)).data;

// body.data: invite
export const createProjectInvite = async (data) =>
  (await api.post("/project/invite", data)).data; // { inviteeId, projectId }
export const createProjectInviteService = createProjectInvite;
