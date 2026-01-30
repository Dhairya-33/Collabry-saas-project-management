import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true, // important for auth check
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
    },

    clearUser(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
    },

    updateProfile(state, action) {
      state.user = {
        ...state.user,
        ...action.payload,
      };
    },

    setLoading(state, action) {
      state.loading = action.payload;
    },
  },
});

export const { setUser, clearUser, updateProfile, setLoading } =
  authSlice.actions;

export default authSlice.reducer;
