import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchAllProjects,
  fetchManagingProjects,
  fetchContributingProjects,
  fetchArchivedProjects,
  createProject as createProjectService,
  archiveProject as archiveProjectService,
  fetchProjectEmployees as fetchProjectEmployeesService,
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

const initialState = {
  all: null,
  managing: null,
  contributing: null,
  archived: null,
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
          state.error = action.payload || action.error?.message || "Request failed";
        }
      );
  },
});

export const { clearProjects } = projectsSlice.actions;
export default projectsSlice.reducer;
