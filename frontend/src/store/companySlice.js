import { createSlice } from "@reduxjs/toolkit";
import { clearUser } from "./authSlice";

const initialState = {
  companyId: null,
};

const companySlice = createSlice({
  name: "company",
  initialState,

  reducers: {
    setCompanyContext: (state, action) => {
      const user = action.payload;
      state.companyId = user?.companyId || null;
    },

    clearCompany: (state) => {
      state.companyId = null;
    },
  },

  extraReducers: (builder) => {
    builder.addCase(clearUser, (state) => {
      state.companyId = null;
    });
  },
});

export const { setCompanyContext, clearCompany } = companySlice.actions;
export default companySlice.reducer;