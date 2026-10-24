import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);
let currentUserRequest;

function loadCurrentUser() {
  if (!currentUserRequest)
    currentUserRequest = api("/auth/me").finally(() => {
      currentUserRequest = null;
    });
  return currentUserRequest;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("fixnearme_user") || "null");
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!sessionStorage.getItem("fixnearme_token")) {
      setReady(true);
      return () => {
        active = false;
      };
    }
    loadCurrentUser()
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch((error) => {
        if (!active || error.status !== 401) return;
        sessionStorage.removeItem("fixnearme_token");
        sessionStorage.removeItem("fixnearme_user");
        setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user) sessionStorage.setItem("fixnearme_user", JSON.stringify(user));
    else sessionStorage.removeItem("fixnearme_user");
  }, [user]);

  const signIn = useCallback(async (email, password) => {
    const { data } = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    sessionStorage.setItem("fixnearme_token", data.token);
    setUser(data.user);
    return data.user;
  }, []);
  const register = useCallback(async (name, email, password) => {
    const { data } = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    sessionStorage.setItem("fixnearme_token", data.token);
    setUser(data.user);
    return data.user;
  }, []);
  const signOut = useCallback(() => {
    sessionStorage.removeItem("fixnearme_token");
    sessionStorage.removeItem("fixnearme_user");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, register, signOut }),
    [user, ready, signIn, register, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
