import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  fetchCompanyMembers,
  removeCompanyMember,
  fetchCompanyInviteToken,
  reassignProjectManager,
} from "@/services/company.service";
import { clearUser } from "./authSlice";

export const getCompanyMembers = createAsyncThunk(
  "members/getCompanyMembers",
  async (_, { rejectWithValue }) => {
    try {
      const body = await fetchCompanyMembers();
      return body.data; // { totalMembers, members[] }
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to load company members");
    }
  }
);

export const removeCompanyMemberThunk = createAsyncThunk(
  "members/removeMember",
  async ({ userId }, { rejectWithValue }) => {
    try {
      return await removeCompanyMember({ userId });
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to remove member");
    }
  }
);
export const removeMember = removeCompanyMemberThunk;

export const generateCompanyInviteThunk = createAsyncThunk(
  "members/generateInvite",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchCompanyInviteToken();
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to generate invite token");
    }
  }
);
export const generateCompanyInvite = generateCompanyInviteThunk;

export const reassignProjectManagerThunk = createAsyncThunk(
  "members/reassignProjectManager",
  async ({ projectId, newManagerUserId }, { rejectWithValue }) => {
    try {
      return await reassignProjectManager({ projectId, newManagerUserId });
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to reassign manager");
    }
  }
);
export const reassignProjectManagerAction = reassignProjectManagerThunk;

const initialState = {
  data: null,
  loading: false,
  error: null,
  actionLoading: false,
  actionError: null,
};

const membersSlice = createSlice({
  name: "members",
  initialState,
  reducers: {
    clearMembers: () => initialState,
    clearMemberActionError: (state) => {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCompanyMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCompanyMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(getCompanyMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Request failed";
      })
      .addCase(removeCompanyMemberThunk.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(removeCompanyMemberThunk.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(removeCompanyMemberThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || action.error?.message || "Failed to remove member";
      })
      .addCase(clearUser, () => initialState);
  },
});

export const { clearMembers, clearMemberActionError } = membersSlice.actions;
export default membersSlice.reducer;
