import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // uploads and free-tier cold starts are slow
});

// main.jsx registers this so a dead session clears the Redux user
let onAuthFailure = null;
export const setAuthFailureHandler = (fn) => {
  onAuthFailure = fn;
};

// never try to refresh for these (a wrong password is not an expired session)
const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/logout", "/auth/refresh"];

// single-flight: parallel 401s share ONE refresh call (the backend revokes
// the refresh token if it is used twice, so two refreshes would log the user out)
let refreshPromise = null;
const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh", null, { _skipRefresh: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// keeps message AND http status (error.status) for callers and the interceptor
const toError = (error) => {
  let message = error?.response?.data?.message;
  if (!message) {
    if (error?.code === "ECONNABORTED") message = "Request timed out. Please try again.";
    else if (error?.request && !error?.response) message = "Cannot reach the server. Check your connection.";
    else message = "Unexpected server error";
  }
  const err = new Error(message);
  err.status = error?.response?.status;
  err.data = error?.response?.data;
  return err;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;

    const canRefresh =
      status === 401 &&
      original &&
      !original._retry &&
      !original._skipRefresh &&
      !NO_REFRESH.some((p) => original.url?.includes(p));

    if (canRefresh) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch (refreshError) {
        // only a rejected refresh token ends the session, not a network blip
        if ([400, 401, 403].includes(refreshError?.status)) onAuthFailure?.();
        return Promise.reject(toError(error));
      }
    }

    return Promise.reject(toError(error));
  }
);

export default api;
