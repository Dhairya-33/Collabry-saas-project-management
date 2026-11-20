import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchMyProjectInvites } from "@/services/projectInvite.service";
import { clearUser } from "./authSlice";

export const getProjectInvites = createAsyncThunk(
  "projectInvites/getMy",
  async (_, { rejectWithValue }) => {
    try {
      const body = await fetchMyProjectInvites();
      return Array.isArray(body?.data?.invites) ? body.data.invites : [];
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to load project invites");
    }
  }
);

const initialState = { data: null, loading: false, error: null }; // data: invite[] | null

const projectInvitesSlice = createSlice({
  name: "projectInvites",
  initialState,
  reducers: {
    clearProjectInvites: () => initialState,
    // call after accept / decline so the notification disappears at once
    removeProjectInvite: (state, action) => {
      if (state.data) state.data = state.data.filter((i) => i._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getProjectInvites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProjectInvites.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(getProjectInvites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Request failed";
      })
      .addCase(clearUser, () => initialState);
  },
});

export const { clearProjectInvites, removeProjectInvite } = projectInvitesSlice.actions;
export default projectInvitesSlice.reducer;
