import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ALL_REGISTRATION_DASHBOARDS } from "../config/dashboardAccess";

export default function AdminShell({ children }) {
  const { user, role, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navSections = [
    {
      label: "",
      items: [
        ["Dashboard", "/admin"],
        ["Level 1 Registration Class 8", "/official/register/MB"],
        ["Level 1 Registration Class 10", "/official/register/HS100"],
        ["Bulk Registration", "/official/bulk"],
        ["Mission Buniyaad Level 1 Dashboard", "/official/dashboard/MB"],
        ["Haryana Super 100 Level 1 Dashboard", "/official/dashboard/HS100"],
      ],
    },
    {
      label: "Registration Management",
      items: ALL_REGISTRATION_DASHBOARDS.map((item) => [item.label, item.path]),
    },
    {
      label: "Level 1 Dashboards",
      items: [
        ["MB · District-Block", "/dashboards-level-1/MB"],
        ["MB · Block-School", "/dashboards-level-1/MB/block-school"],
        ["MB · School Level", "/dashboards-level-1/MB/school"],
        ["S100 · District-Block", "/dashboards-level-1/HS100"],
        ["S100 · Block-School", "/dashboards-level-1/HS100/block-school"],
        ["S100 · School Level", "/dashboards-level-1/HS100/school"],
      ],
    },
    {
      label: "Administration",
      items: [
        ["Add Region", "/admin/regions"],
        ["User", "/admin/users"],
        ["User Region Access", "/admin/user-region-access"],
        ["Dashboard Access", "/admin/dashboard-access"],
        ["Verification Users", "/admin/verification-users"],
      ],
    },
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
          <div><strong>Pratibha Khoj</strong><span>Admin Panel</span></div>
        </div>
        <div className="sidebar-user">{user?.name}<small>{role?.name}</small></div>
        <nav>
          {navSections.map((section) => (
            <div key={section.label || "main"} className="sidebar-nav-section">
              {section.label && <div className="sidebar-nav-section-title">{section.label}</div>}
              {section.items.map(([label, to]) => (
                <NavLink key={to} to={to} end={to === "/admin"} onClick={closeOnMobile}>
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={logout}>Logout</button>
      </aside>
      <main className="portal-workspace-main">{children}</main>
    </div>
  );
}
