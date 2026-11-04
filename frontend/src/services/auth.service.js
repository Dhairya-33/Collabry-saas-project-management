import api from "../lib/axios";

export const registerUser = async (data) => (await api.post("/auth/register", data)).data;

export const loginUser = async ({ identifier, password }) =>
  (await api.post("/auth/login", { identifier, password })).data;

// body: { status, message, data: user }
export const getCurrentUser = async () => (await api.get("/auth/me")).data;

export const completeProfile = async (formData) =>
  (await api.put("/auth/profile/complete", formData)).data;

// formData fields: fullname, phone, bio, skills ("a,b,c"), profilePic (optional)
export const updateProfile = async (formData) =>
  (await api.put("/auth/profile/update", formData)).data;

// { currentPassword, newPassword } - server clears cookies, so send the user to /auth afterwards
export const updatePassword = async (data) => (await api.put("/auth/password", data)).data;

export const logoutUser = async () => (await api.post("/auth/logout")).data;
