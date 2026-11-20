import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchOverview } from "@/services/company.service";
import { clearUser } from "./authSlice";

export const getOverview = createAsyncThunk(
  "overview/getOverview",
  async (_, { rejectWithValue }) => {
    try {
      const body = await fetchOverview();
      return body.data; // { roles, admin, manager, employee }
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to load overview");
    }
  }
);

const emptyData = () => ({
  roles: { isAdmin: false, isManager: false, isEmployee: false },
  admin: null,
  manager: null,
  employee: null,
});

const initialState = {
  data: emptyData(),
  loaded: false, // true after the first successful fetch
  loading: false,
  error: null,
};

const overviewSlice = createSlice({
  name: "overview",
  initialState,
  reducers: {
    clearOverview: () => ({ ...initialState, data: emptyData() }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(getOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.data = { ...emptyData(), ...action.payload };
      })
      .addCase(getOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Request failed";
      })
      .addCase(clearUser, () => ({ ...initialState, data: emptyData() }));
  },
});

export const { clearOverview } = overviewSlice.actions;
export default overviewSlice.reducer;
