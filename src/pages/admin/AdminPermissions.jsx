import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, unwrap } from "../../api/client";

const EMPTY = {
  targetType: "role",
  targetId: "",
  rolePermissions: [],
  userPermissions: {},
};

export default function AdminPermissions() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [targetType, setTargetType] = useState("role");
  const [targetId, setTargetId] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [userStates, setUserStates] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadBase = async () => {
    try {
      const [roleResponse, userResponse, permissionResponse] = await Promise.all([
        api.get("/admin/users/roles"),
        api.get("/admin/users"),
        api.get("/admin/permissions"),
      ]);
      setRoles(unwrap(roleResponse) || []);
      setUsers(unwrap(userResponse) || []);
      setPermissions(unwrap(permissionResponse) || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load permissions.");
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  const selectedRole = useMemo(
    () => roles.find((role) => String(role._id) === String(targetId)),
    [roles, targetId]
  );

  const selectedUser = useMemo(
    () => users.find((user) => String(user._id) === String(targetId)),
    [users, targetId]
  );

  const loadTarget = async (type, id) => {
    setTargetType(type);
    setTargetId(id);
    setError("");
    setMessage("");
    setSelected(new Set());
    setUserStates({});

    if (!id) return;

    setLoading(true);
    try {
      const url = type === "role"
        ? `/admin/permissions/roles/${id}`
        : `/admin/permissions/users/${id}`;
      const data = unwrap(await api.get(url));
      const rows = data?.permissions || [];

      if (type === "role") {
        setSelected(
          new Set(
            rows.filter((row) => row.isAllowed !== false).map((row) => row.code)
          )
        );
      } else {
        const next = {};
        rows.forEach((row) => {
          next[row.code] = row.isAllowed === false ? "deny" : "allow";
        });
        setUserStates(next);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load target permissions.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRolePermission = (code) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const cycleUserPermission = (code) => {
    setUserStates((current) => {
      const currentState = current[code] || "inherit";
      const nextState = currentState === "inherit"
        ? "allow"
        : currentState === "allow"
          ? "deny"
          : "inherit";
      const next = { ...current };
      if (nextState === "inherit") delete next[code];
      else next[code] = nextState;
      return next;
    });
  };

  const save = async () => {
    if (!targetId) {
      setError(`Select a ${targetType} first.`);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (targetType === "role") {
        await api.put(`/admin/permissions/roles/${targetId}`, {
          permissions: [...selected].map((code) => ({ code, isAllowed: true })),
        });
      } else {
        await api.put(`/admin/permissions/users/${targetId}`, {
          permissions: Object.entries(userStates).map(([code, state]) => ({
            code,
            isAllowed: state === "allow",
          })),
        });
      }

      setMessage("Permissions updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <section className="admin-page">
        <div className="admin-page-head">
          <div>
            <div className="eyebrow">ADMINISTRATION</div>
            <h1>Permissions</h1>
            <p>Control module and dashboard access through roles and individual users.</p>
          </div>
        </div>

        <div className="panel permission-target-panel">
          <div className="permission-target-tabs">
            <button
              type="button"
              className={targetType === "role" ? "active" : ""}
              onClick={() => {
                setTargetType("role");
                setTargetId("");
                setSelected(new Set());
                setUserStates({});
                setMessage("");
                setError("");
              }}
            >
              Role Permissions
            </button>
            <button
              type="button"
              className={targetType === "user" ? "active" : ""}
              onClick={() => {
                setTargetType("user");
                setTargetId("");
                setSelected(new Set());
                setUserStates({});
                setMessage("");
                setError("");
              }}
            >
              User Permissions
            </button>
          </div>

          <label className="field permission-target-select">
            <span>{targetType === "role" ? "Role *" : "User *"}</span>
            <select
              value={targetId}
              onChange={(event) => loadTarget(targetType, event.target.value)}
            >
              <option value="">
                Select {targetType === "role" ? "role" : "user"}
              </option>
              {(targetType === "role" ? roles : users).map((item) => (
                <option key={item._id} value={item._id}>
                  {targetType === "role"
                    ? `${item.name} (${item.code})`
                    : `${item.name} · ${item.contact}${item.userId ? ` · ${item.userId}` : ""}`}
                </option>
              ))}
            </select>
          </label>

          {targetType === "role" && selectedRole && (
            <div className="permission-target-info">
              {selectedRole.name} · {selectedRole.code}
            </div>
          )}

          {targetType === "user" && selectedUser && (
            <div className="permission-target-info">
              {selectedUser.name} · {selectedUser.contact} · {selectedUser.roleId?.name || "No role"}
            </div>
          )}
        </div>

        <div className="panel permission-list-panel">
          <div className="panel-head">
            <h3>Available Permissions</h3>
            {targetType === "user" && (
              <span>Click: Inherit → Allow → Deny</span>
            )}
          </div>

          {loading ? (
            <div className="empty-row">Loading permissions…</div>
          ) : permissions.length === 0 ? (
            <div className="empty-row">No permissions available.</div>
          ) : (
            <div className="permission-list">
              {permissions.map((permission) => {
                const state = userStates[permission.code] || "inherit";
                const roleChecked = selected.has(permission.code);

                return (
                  <div className="permission-row" key={permission._id}>
                    <div>
                      <strong>{permission.name}</strong>
                      <small>{permission.code} · {permission.module}</small>
                      {permission.description && <p>{permission.description}</p>}
                    </div>

                    {targetType === "role" ? (
                      <label className="permission-check">
                        <input
                          type="checkbox"
                          checked={roleChecked}
                          onChange={() => toggleRolePermission(permission.code)}
                          disabled={!targetId}
                        />
                        <span>Allow</span>
                      </label>
                    ) : (
                      <button
                        type="button"
                        className={`permission-state permission-state-${state}`}
                        onClick={() => cycleUserPermission(permission.code)}
                        disabled={!targetId}
                      >
                        {state === "inherit" ? "Inherit" : state === "allow" ? "Allow" : "Deny"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && <div className="error">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <div className="permission-actions">
            <button type="button" className="primary" onClick={save} disabled={!targetId || loading || saving}>
              {saving ? "Saving…" : "Save Permissions"}
            </button>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
