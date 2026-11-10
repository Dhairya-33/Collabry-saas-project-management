import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchAllProjects,
  fetchManagingProjects,
  fetchContributingProjects,
  fetchArchivedProjects,
  createProject as createProjectService,
  archiveProject as archiveProjectService,
  fetchProjectEmployees as fetchProjectEmployeesService,
  getProject,
  createProjectInviteService,
  addProjectEmployee,
  removeProjectEmployee,
} from "@/services/project.service";
import { clearUser } from "./authSlice";

// services return the body { status, results, data: [...] }; keep only the array
const toList = (body) => (Array.isArray(body?.data) ? body.data.filter(Boolean) : []);

const makeThunk = (type, call, fallback) =>
  createAsyncThunk(type, async (_, { rejectWithValue }) => {
    try {
      return toList(await call());
    } catch (err) {
      return rejectWithValue(err?.message || fallback);
    }
  });

export const getAllProjects = makeThunk("projects/getAll", fetchAllProjects, "Failed to load all projects");
export const getManagingProjects = makeThunk("projects/getManaging", fetchManagingProjects, "Failed to load managing projects");
export const getContributingProjects = makeThunk("projects/getContributing", fetchContributingProjects, "Failed to load contributing projects");
export const getArchivedProjects = makeThunk("projects/getArchived", fetchArchivedProjects, "Failed to load archived projects");

// Mutation thunks — callers can dispatch these and unwrap() the result
export const createProjectThunk = createAsyncThunk(
  "projects/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await createProjectService(payload);
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to create project");
    }
  }
);

export const archiveProjectThunk = createAsyncThunk(
  "projects/archive",
  async (payload, { rejectWithValue }) => {
    try {
      return await archiveProjectService(payload);
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to update project");
    }
  }
);

export const fetchProjectMembersThunk = createAsyncThunk(
  "projects/fetchMembers",
  async (payload, { rejectWithValue }) => {
    try {
      return await fetchProjectEmployeesService(payload);
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to fetch project members");
    }
  }
);

// Detail page thunks
export const getProjectById = createAsyncThunk(
  "projects/getById",
  async (projectId, { rejectWithValue }) => {
    try {
      const res = await getProject(projectId);
      // res.data = { project, role, manager }
      return res?.data ?? null;
    } catch (err) {
      return rejectWithValue({
        message: err?.message || "Failed to load project",
        status: err?.status || err?.response?.status || 0,
      });
    }
  }
);
export const getProjectByIdThunk = getProjectById;

export const getProjectMembers = createAsyncThunk(
  "projects/getMembers",
  async (projectId, { rejectWithValue }) => {
    try {
      const res = await fetchProjectEmployeesService({ projectId });
      // res.data is the array of members
      return Array.isArray(res?.data) ? res.data : [];
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to load members");
    }
  }
);
export const getProjectMembersThunk = getProjectMembers;

export const addMember = createAsyncThunk(
  "projects/addMember",
  async ({ empId, projectId }, { rejectWithValue }) => {
    try {
      return await addProjectEmployee({ empId, projectId });
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to add member");
    }
  }
);
export const addMemberThunk = addMember;

export const removeMember = createAsyncThunk(
  "projects/removeMember",
  async ({ empId, projectId }, { rejectWithValue }) => {
    try {
      return await removeProjectEmployee({ empId, projectId });
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to remove member");
    }
  }
);
export const removeMemberThunk = removeMember;

export const createProjectInviteThunk = createAsyncThunk(
  "projects/createInvite",
  async ({ inviteeId, projectId }, { rejectWithValue }) => {
    try {
      return await createProjectInviteService({ inviteeId, projectId });
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to send invite");
    }
  }
);
export const createInviteThunk = createProjectInviteThunk;
export const inviteMember = createProjectInviteThunk;

const initialState = {
  all: null,
  managing: null,
  contributing: null,
  archived: null,
  current: null,
  members: null,
  loading: false,
  inflight: 0, // several thunks can run at once, so loading = inflight > 0
  error: null,
};

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    clearProjects: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllProjects.fulfilled, (state, action) => {
        state.all = action.payload;
      })
      .addCase(getManagingProjects.fulfilled, (state, action) => {
        state.managing = action.payload;
      })
      .addCase(getContributingProjects.fulfilled, (state, action) => {
        state.contributing = action.payload;
      })
      .addCase(getArchivedProjects.fulfilled, (state, action) => {
        state.archived = action.payload;
      })
      .addCase(getProjectById.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(getProjectMembers.fulfilled, (state, action) => {
        state.members = action.payload;
      })
      .addCase(clearUser, () => initialState)
      .addMatcher(
        (a) => a.type.startsWith("projects/") && a.type.endsWith("/pending"),
        (state) => {
          state.inflight += 1;
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (a) => a.type.startsWith("projects/") && a.type.endsWith("/fulfilled"),
        (state) => {
          state.inflight = Math.max(0, state.inflight - 1);
          state.loading = state.inflight > 0;
        }
      )
      .addMatcher(
        (a) => a.type.startsWith("projects/") && a.type.endsWith("/rejected"),
        (state, action) => {
          state.inflight = Math.max(0, state.inflight - 1);
          state.loading = state.inflight > 0;
          state.error =
            (typeof action.payload === "string" ? action.payload : action.payload?.message) ||
            action.error?.message ||
            "Request failed";
        }
      );
  },
});

export const { clearProjects } = projectsSlice.actions;
export default projectsSlice.reducer;
