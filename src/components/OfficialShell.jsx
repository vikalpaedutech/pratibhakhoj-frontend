import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LEVEL1_DASHBOARDS, ALL_REGISTRATION_DASHBOARDS } from "../config/dashboardAccess";

export default function OfficialShell({ children }) {
  const { user, role, logout, verificationAccess = [], dashboardAccess = [] } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const accessibleDashboards = role?.code === "ADMIN"
    ? LEVEL1_DASHBOARDS
    : LEVEL1_DASHBOARDS.filter((item) => dashboardAccess.includes(item.code));

  const accessibleAllRegistrations = role?.code === "ADMIN"
    ? ALL_REGISTRATION_DASHBOARDS
    : ALL_REGISTRATION_DASHBOARDS.filter((item) => dashboardAccess.includes(item.code));

  const nav = [
    ["Dashboard", "/official"],
    ["Level 1 Registration Class 8", "/official/register/MB"],
    ["Level 1 Registration Class 10", "/official/register/HS100"],
    ["Bulk Registration", "/official/bulk"],
    ["Mission Buniyaad Level 1 Dashboard", "/official/dashboard/MB"],
    ["Haryana Super 100 Level 1 Dashboard", "/official/dashboard/HS100"],
    ...(accessibleAllRegistrations.length
      ? [["Registration Management", null], ...accessibleAllRegistrations.map((item) => [item.label, item.path])]
      : []),
    ...(accessibleDashboards.length
      ? [["Level 1 Dashboards", null], ...accessibleDashboards.map((item) => [item.label, item.path])]
      : []),
    ...(verificationAccess.length ? [["Verification", "/official/verification"]] : []),
  ];

  const closeOnMobile = () => setSidebarOpen(false);

  return (
    <div className="portal-workspace">
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="Toggle sidebar"
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((value) => !value)}
      >
        <span></span><span></span><span></span>
      </button>
      {sidebarOpen && <button type="button" className="sidebar-overlay" aria-label="Close sidebar" onClick={closeOnMobile} />}

      <aside className={`portal-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <img src="/Buniyaad.png" alt="Pratibha Khoj" />
          <div><strong>Pratibha Khoj</strong><span>2028-29</span></div>
        </div>

        <div className="sidebar-user">
          {user?.name}
          <small>{role?.name}</small>
        </div>

        <nav>
          {nav.map(([label, to], index) => (
            to ? (
              <NavLink key={to} to={to} end={to === "/official"} onClick={closeOnMobile}>
                {label}
              </NavLink>
            ) : (
              <div key={`${label}-${index}`} className="sidebar-nav-section-title">{label}</div>
            )
          ))}
        </nav>

        <button className="sidebar-logout" onClick={logout}>Logout</button>
      </aside>

      <main className="portal-workspace-main">{children}</main>
    </div>
  );
}
