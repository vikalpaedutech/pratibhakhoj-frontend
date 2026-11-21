import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LEVEL1_DASHBOARDS, ALL_REGISTRATION_DASHBOARDS, REPORT_DASHBOARDS } from "../config/dashboardAccess";

export default function OfficialShell({ children }) {
  const { user, role, logout, verificationAccess = [], dashboardAccess = [], permissions = [], schoolVisitAccess = false } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDss = role?.code === "DSS";
  const hasNavPermission = (code, fallback = true) => isDss ? permissions.includes(code) : fallback;

  const accessibleDashboards = role?.code === "ADMIN"
    ? LEVEL1_DASHBOARDS
    : LEVEL1_DASHBOARDS.filter((item) =>
        dashboardAccess.includes(item.code) && hasNavPermission("OFFICIAL_LEVEL1_DASHBOARDS")
      );

  const accessibleAllRegistrations = role?.code === "ADMIN"
    ? ALL_REGISTRATION_DASHBOARDS
    : ALL_REGISTRATION_DASHBOARDS.filter((item) =>
        dashboardAccess.includes(item.code) && hasNavPermission("OFFICIAL_REGISTRATION_MANAGEMENT")
      );

  const accessibleReportDashboards = role?.code === "ADMIN"
    ? REPORT_DASHBOARDS
    : REPORT_DASHBOARDS.filter((item) =>
        dashboardAccess.includes(item.code) && hasNavPermission("OFFICIAL_REPORT_DASHBOARDS")
      );

  const nav = [
    ...(hasNavPermission("OFFICIAL_HOME") ? [["Dashboard", "/official"]] : []),
    ...(hasNavPermission("OFFICIAL_MB_REGISTRATIONS") ? [["Mission Buniyaad Registrations", "/official/register/MB"]] : []),
    ...(hasNavPermission("OFFICIAL_HS100_REGISTRATIONS") ? [["Haryana Super 100 Registrations", "/official/register/HS100"]] : []),
    ...(hasNavPermission("OFFICIAL_BULK_REGISTRATION") ? [["Bulk Registration", "/official/bulk"]] : []),
    ...(schoolVisitAccess && hasNavPermission("OFFICIAL_SCHOOL_VISIT") ? [["School Visit", "/official/school-visits"]] : []),
    ...(hasNavPermission("OFFICIAL_MB_DASHBOARD") ? [["Mission Buniyaad Dashboard", "/official/dashboard/MB"]] : []),
    ...(hasNavPermission("OFFICIAL_HS100_DASHBOARD") ? [["Haryana Super 100 Dashboard", "/official/dashboard/HS100"]] : []),
    ...(accessibleAllRegistrations.length
      ? [["Registration Management", null], ...accessibleAllRegistrations.map((item) => [item.label, item.path])]
      : []),
    ...(accessibleDashboards.length
      ? [["Dashboards", null], ...accessibleDashboards.map((item) => [item.label, item.path])]
      : []),
    ...(accessibleReportDashboards.length
      ? [["Reports", null], ...accessibleReportDashboards.map((item) => [item.label, item.path])]
      : []),
    ...(verificationAccess.length && hasNavPermission("OFFICIAL_VERIFICATION")
      ? [["Verification", "/official/verification"]]
      : []),
    ...(role?.code === "ADMIN" || permissions.includes("SCHOOL_CENTER_PREFERENCE")
      ? [["School Center Preference", "/school-center-preference"]]
      : []),
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
          <div><strong>Pratibha Khoj</strong><span>2027-29</span></div>
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
