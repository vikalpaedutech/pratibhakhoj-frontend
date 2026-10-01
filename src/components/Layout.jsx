import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, role, logout } = useAuth();
  const location = useLocation();
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
