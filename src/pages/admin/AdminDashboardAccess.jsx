import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, unwrap } from "../../api/client";
import { LEVEL1_DASHBOARDS, ALL_REGISTRATION_DASHBOARDS, REPORT_DASHBOARDS } from "../../config/dashboardAccess";

export default function AdminDashboardAccess() {
  const [mode, setMode] = useState("user");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [targetId, setTargetId] = useState("");
  const [selected, setSelected] = useState([]);
  const [roleInherited, setRoleInherited] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const allDashboardOptions = [...LEVEL1_DASHBOARDS, ...ALL_REGISTRATION_DASHBOARDS, ...REPORT_DASHBOARDS];

  const selectableUsers = useMemo(() => users.filter((u) => u.roleId?.code !== "ADMIN" && u.userId !== "admin"), [users]);
  const selectableRoles = useMemo(() => roles.filter((r) => r.code !== "ADMIN"), [roles]);

  useEffect(() => {
    Promise.all([api.get("/admin/users"), api.get("/admin/users/roles")])
      .then(([usersResponse, rolesResponse]) => {
        setUsers(unwrap(usersResponse) || []);
        setRoles(unwrap(rolesResponse) || []);
      })
      .catch((error) => setErr(error.response?.data?.message || "Unable to load users and roles."));
  }, []);

  const switchMode = (nextMode) => {
    setMode(nextMode); setTargetId(""); setSelected([]); setRoleInherited([]); setErr(""); setMsg("");
  };

  const loadAccess = async (id) => {
    setTargetId(id); setSelected([]); setRoleInherited([]); setErr(""); setMsg("");
    if (!id) return;
    setLoading(true);
    try {
      const endpoint = mode === "role" ? `/admin/dashboard-access/role/${id}` : `/admin/dashboard-access/${id}`;
      const data = unwrap(await api.get(endpoint)) || {};
      setSelected(Array.isArray(data.dashboards) ? data.dashboards : []);
      if (mode === "user") setRoleInherited(Array.isArray(data.roleDashboards) ? data.roleDashboards : []);
    } catch (error) {
      setErr(error.response?.data?.message || "Unable to load dashboard access.");
    } finally { setLoading(false); }
  };

  const toggle = (code) => setSelected((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);

  const save = async () => {
    if (!targetId) return;
    setSaving(true); setErr(""); setMsg("");
    try {
      const endpoint = mode === "role" ? `/admin/dashboard-access/role/${targetId}` : `/admin/dashboard-access/${targetId}`;
      await api.put(endpoint, { dashboards: selected });
      setMsg(mode === "role" ? "Role dashboard access updated successfully." : "User dashboard access updated successfully.");
    } catch (error) {
      setErr(error.response?.data?.message || "Unable to update dashboard access.");
    } finally { setSaving(false); }
  };

  return (
    <AdminShell>
      <section className="dashboard">
        <div className="dash-head"><div><div className="eyebrow">ADMINISTRATION</div><h2>Dashboard Access</h2><p>Grant dashboards directly to a user or once to an entire role. Every granted dashboard includes the same download facility available to Admin wherever that dashboard supports download.</p></div></div>

        <div className="panel">
          <div className="dashboard-access-mode-tabs">
            <button type="button" className={mode === "user" ? "primary" : "secondary"} onClick={() => switchMode("user")}>User Dashboard Access</button>
            <button type="button" className={mode === "role" ? "primary" : "secondary"} onClick={() => switchMode("role")}>Role Dashboard Access</button>
          </div>
          <label className="field">
            <span>{mode === "role" ? "Role *" : "User *"}</span>
            <select value={targetId} onChange={(event) => loadAccess(event.target.value)}>
              <option value="">Select {mode}</option>
              {mode === "user" ? selectableUsers.map((user) => <option key={user._id} value={user._id}>{user.name} · {user.contact} · {user.roleId?.name || "No role"}</option>) : selectableRoles.map((role) => <option key={role._id} value={role._id}>{role.name} · {role.code}</option>)}
            </select>
          </label>
        </div>

        {targetId && <div className="panel">
          <div className="dashboard-access-toolbar"><div><h3>{mode === "role" ? "Dashboards for this role" : "Direct dashboards for this user"}</h3><p>{loading ? "Loading current access…" : `${selected.length} of ${allDashboardOptions.length} dashboards directly selected`}</p>{mode === "user" && roleInherited.length > 0 && <p className="dashboard-access-inherited-note">This user's role already grants {roleInherited.length} dashboard(s). Role-granted dashboards remain available even if they are not directly selected here.</p>}</div><div className="dashboard-access-actions"><button type="button" className="secondary" onClick={() => setSelected(allDashboardOptions.map((item) => item.code))} disabled={loading}>Select All</button><button type="button" className="secondary" onClick={() => setSelected([])} disabled={loading}>Clear All</button></div></div>
          <div className="dashboard-access-grid">
            {allDashboardOptions.map((dashboard) => {
              const inherited = mode === "user" && roleInherited.includes(dashboard.code);
              return <label key={dashboard.code} className={`dashboard-access-card ${selected.includes(dashboard.code) ? "selected" : ""} ${inherited ? "inherited" : ""}`}><input type="checkbox" checked={selected.includes(dashboard.code)} onChange={() => toggle(dashboard.code)} disabled={loading || saving}/><span><strong>{dashboard.label}</strong><small>{dashboard.title}</small>{inherited && <small>Also granted by role</small>}</span></label>;
            })}
          </div>
          {err && <div className="error">{err}</div>}{msg && <div className="success-message">{msg}</div>}
          <div className="dashboard-access-save-row"><button type="button" className="primary" onClick={save} disabled={loading || saving}>{saving ? "Saving…" : mode === "role" ? "Save Role Dashboard Access" : "Save User Dashboard Access"}</button></div>
        </div>}
      </section>
    </AdminShell>
  );
}
