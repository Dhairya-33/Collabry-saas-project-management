import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";

import App from "./App";
import store from "./store/store.js";
import { clearUser } from "./store/authSlice";
import { setAuthFailureHandler } from "./lib/axios";

import "./styles/app.css";

// when a token refresh is rejected, drop the user so route guards send them to /auth
setAuthFailureHandler(() => store.dispatch(clearUser()));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
