import { createContext, useContext, useEffect, useState } from "react";
import { api, unwrap } from "../api/client";

const AuthContext = createContext(null);

function hasExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ user: null, role: null, regions: [], verificationAccess: [], dashboardAccess: [] });
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem("accessToken");
    setSession({ user: null, role: null, regions: [], verificationAccess: [], dashboardAccess: [] });
  };

  const loadCurrentUser = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || hasExpired(token)) {
      clearSession();
      setLoading(false);
      return;
    }

    try {
      const data = unwrap(await api.get("/auth/current-user"));
      setSession({ user: data.user, role: data.role, regions: data.regions || [], verificationAccess: data.verificationAccess || [], dashboardAccess: data.dashboardAccess || [] });
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) clearSession();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCurrentUser(); }, []);

  const login = async (contact, password) => {
    const data = unwrap(await api.post("/auth/login", { contact, password }));
    localStorage.setItem("accessToken", data.accessToken);
    setSession({ user: data.user, role: data.role, regions: data.regions || [], verificationAccess: data.verificationAccess || [], dashboardAccess: data.dashboardAccess || [] });
    return data;
  };

  const logout = async () => {
    try {
      if (localStorage.getItem("accessToken")) await api.post("/auth/logout");
    } finally {
      clearSession();
    }
  };

  const refreshDashboardAccess = async () => {
    if (!localStorage.getItem("accessToken")) return [];
    const access = unwrap(await api.get("/dashboard-access/me")) || [];
    setSession((current) => ({ ...current, dashboardAccess: Array.isArray(access) ? access : [] }));
    return access;
  };

  return <AuthContext.Provider value={{ ...session, loading, login, logout, reload: loadCurrentUser, refreshDashboardAccess }}>
    {children}
  </AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
