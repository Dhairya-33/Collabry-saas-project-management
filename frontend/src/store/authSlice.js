import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  loading: true, // true until AuthInitializer finishes the first /auth/me check
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
  },
});

export const { setUser, clearUser, setLoading, updateUser } = authSlice.actions;
export default authSlice.reducer;
