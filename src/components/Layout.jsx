import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, role, logout, loading: authLoading } = useAuth();
  const location = useLocation();
  const [examSettings, setExamSettings] = useState(null);
  useEffect(() => {
    let mounted = true;
    api.get("/exam-controller/public").then((response) => { if (mounted) setExamSettings(unwrap(response) || { examActive: true }); })
      .catch(() => { if (mounted) setExamSettings({ examActive: true }); });
    return () => { mounted = false; };
  }, []);
  const isAdminRoute = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const isAdminLoginRoute = ["/official/login", "/official/forgot-password", "/official/verify-otp", "/official/verify-email", "/official/create-password"].includes(location.pathname);
  if (examSettings && examSettings.examActive === false && location.pathname !== "/" && !isAdminLoginRoute && !(isAdminRoute && (authLoading || role?.code === "ADMIN"))) {
    if (location.pathname === "/official" && role?.code === "ADMIN") return <Navigate to="/admin/exam-controller" replace />;
    return <Navigate to="/" replace />;
  }
  if (examSettings && examSettings.examActive === false && location.pathname === "/official" && role?.code === "ADMIN") {
    return <Navigate to="/admin/exam-controller" replace />;
  }
  if (!examSettings && location.pathname !== "/") return <div className="loading">Loading portal…</div>;
  const publicPortal = location.pathname === "/" || location.pathname.startsWith("/register/") || location.pathname.startsWith("/registration-success/");
  const workspaceRoute = location.pathname === "/official" || location.pathname.startsWith("/official/") || location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const dashboardRoute = location.pathname === "/dashboards-level-1" || location.pathname.startsWith("/dashboards-level-1/");

  return <div className="app-shell">
    {!publicPortal && !workspaceRoute && !dashboardRoute && <header className="app-nav">
      <Link to="/" className="app-brand"><img src="/Buniyaad.png" alt="" /><span>PRATIBHA KHOJ</span></Link>
      <nav>
        {user ? <>
          <Link className={location.pathname === "/official" ? "active" : ""} to="/official">Dashboard</Link>
          <Link className={location.pathname.startsWith("/official/students") ? "active" : ""} to="/official/students">Students</Link>
          {role?.code === "ADMIN" && <Link className={location.pathname === "/admin" ? "active" : ""} to="/admin">Admin</Link>}
          <button className="nav-button" onClick={logout}>Logout</button>
        </> : <Link to="/official/login">Official Login</Link>}
      </nav>
    </header>}
    <main><Outlet /></main>
  </div>;
}
