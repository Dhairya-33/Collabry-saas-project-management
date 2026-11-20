import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getCurrentUser } from "../services/auth.service";
import { setUser, clearUser, setLoading } from "../store/authSlice";

export default function AuthInitializer({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUser = async () => {
      dispatch(setLoading(true));
      try {
        const res = await getCurrentUser();
        dispatch(setUser(res.data));
      } catch {
        dispatch(clearUser());
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchUser();
  }, [dispatch]);

  return children;
}