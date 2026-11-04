import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchCompanyMembers } from "@/services/company.service";
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

const initialState = { data: null, loading: false, error: null };

const membersSlice = createSlice({
  name: "members",
  initialState,
  reducers: {
    clearMembers: () => initialState,
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
      .addCase(clearUser, () => initialState);
  },
});

export const { clearMembers } = membersSlice.actions;
export default membersSlice.reducer;
