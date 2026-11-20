import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { updateProfile, updatePassword } from "@/services/auth.service";

export const updateProfileThunk = createAsyncThunk(
  "auth/updateProfile",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await updateProfile(formData);
      return res.data; // updated user
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to update profile");
    }
  }
);

export const updatePasswordThunk = createAsyncThunk(
  "auth/updatePassword",
  async (data, { rejectWithValue }) => {
    try {
      return await updatePassword(data);
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to update password");
    }
  }
);

const initialState = {
  user: null,
  loading: true, // true until AuthInitializer finishes the first /auth/me check
  updatingProfile: false,
  profileError: null,
  updatingPassword: false,
  passwordError: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    updateUser: (state, action) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    clearAuthErrors: (state) => {
      state.profileError = null;
      state.passwordError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateProfileThunk.pending, (state) => {
        state.updatingProfile = true;
        state.profileError = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.updatingProfile = false;
        state.user = action.payload;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.updatingProfile = false;
        state.profileError = action.payload || action.error?.message || "Failed to update profile";
      })
      .addCase(updatePasswordThunk.pending, (state) => {
        state.updatingPassword = true;
        state.passwordError = null;
      })
      .addCase(updatePasswordThunk.fulfilled, (state) => {
        state.updatingPassword = false;
        state.user = null; // server clears cookies on success
      })
      .addCase(updatePasswordThunk.rejected, (state, action) => {
        state.updatingPassword = false;
        state.passwordError = action.payload || action.error?.message || "Failed to update password";
      });
  },
});

export const { setUser, clearUser, setLoading, updateUser, clearAuthErrors } = authSlice.actions;
export default authSlice.reducer;
