import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import companyReducer from "./companySlice";
import overviewReducer from "./overviewSlice";
import projectReducer from "./projectSlice";
import memberReducer from "./memberSlice";
import inviteReducer from "./projectInviteSlice";

const store = configureStore({
 reducer: {
    auth: authReducer,
    company: companyReducer,
    overview: overviewReducer,
    projects: projectReducer,
    members: memberReducer,
    invites: inviteReducer,
  },
});
export default store;

