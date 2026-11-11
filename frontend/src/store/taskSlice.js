import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  assignTask as assignTaskService,
  editTask as editTaskService,
  deleteTask as deleteTaskService,
  fetchManagerTasks as fetchManagerTasksService,
  fetchMyTasks as fetchMyTasksService,
  respondToTask as respondToTaskService,
} from "@/services/task.service";
import { clearUser } from "./authSlice";

// Thunks
export const managerTasks = createAsyncThunk(
  "tasks/managerTasks",
  async (projectId, { rejectWithValue }) => {
    try {
      const res = await fetchManagerTasksService(projectId);
      return Array.isArray(res?.data?.tasks) ? res.data.tasks : [];
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to load manager tasks");
    }
  }
);
export const getManagerTasks = managerTasks;

export const myTasks = createAsyncThunk(
  "tasks/myTasks",
  async (projectId, { rejectWithValue }) => {
    try {
      const res = await fetchMyTasksService(projectId);
      return Array.isArray(res?.data?.tasks) ? res.data.tasks : [];
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to load employee tasks");
    }
  }
);
export const getMyTasks = myTasks;

export const assign = createAsyncThunk(
  "tasks/assign",
  async (formData, { rejectWithValue }) => {
    try {
      return await assignTaskService(formData);
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to assign task");
    }
  }
);
export const assignTaskThunk = assign;

export const edit = createAsyncThunk(
  "tasks/edit",
  async ({ taskId, formData }, { rejectWithValue }) => {
    try {
      return await editTaskService(taskId, formData);
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to update task");
    }
  }
);
export const editTaskThunk = edit;

export const deleteTask = createAsyncThunk(
  "tasks/delete",
  async (taskId, { rejectWithValue }) => {
    try {
      return await deleteTaskService(taskId);
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to delete task");
    }
  }
);
export const deleteTaskThunk = deleteTask;

export const respond = createAsyncThunk(
  "tasks/respond",
  async ({ taskId, formData }, { rejectWithValue }) => {
    try {
      return await respondToTaskService(taskId, formData);
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to respond to task");
    }
  }
);
export const respondToTaskThunk = respond;

const initialState = {
  managerTasks: [],
  myTasks: [],
  loading: false,
  inflight: 0,
  error: null,
};

const taskSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    clearTasks: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(managerTasks.fulfilled, (state, action) => {
        state.managerTasks = action.payload;
      })
      .addCase(myTasks.fulfilled, (state, action) => {
        state.myTasks = action.payload;
      })
      .addCase(clearUser, () => initialState)
      .addMatcher(
        (a) => a.type.startsWith("tasks/") && a.type.endsWith("/pending"),
        (state) => {
          state.inflight += 1;
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (a) => a.type.startsWith("tasks/") && a.type.endsWith("/fulfilled"),
        (state) => {
          state.inflight = Math.max(0, state.inflight - 1);
          state.loading = state.inflight > 0;
        }
      )
      .addMatcher(
        (a) => a.type.startsWith("tasks/") && a.type.endsWith("/rejected"),
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

export const { clearTasks } = taskSlice.actions;
export default taskSlice.reducer;
