import api from "../lib/axios";

/* Manager / Admin (formData: taskName, description, empId, projectId, dueDate, file?) */
export const assignTask = async (formData) => (await api.post("/tasks/assign", formData)).data;
export const editTask = async (taskId, formData) => (await api.put(`/tasks/edit/${taskId}`, formData)).data;
export const deleteTask = async (taskId) => (await api.delete(`/tasks/delete/${taskId}`)).data;
export const fetchManagerTasks = async (projectId) =>
  (await api.get(`/tasks/project/${projectId}/manager-tasks`)).data;

/* Employee (respond formData: status, file?) */
export const fetchMyTasks = async (projectId) => (await api.get(`/tasks/project/${projectId}/my-tasks`)).data;
export const respondToTask = async (taskId, formData) =>
  (await api.post(`/tasks/respond/${taskId}`, formData)).data;

/* Shared */
export const fetchSingleTask = async (taskId) => (await api.get(`/tasks/${taskId}`)).data;
