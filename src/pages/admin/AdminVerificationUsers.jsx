import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import ReactSelect from "../../components/ReactSelect";
import { api, unwrap } from "../../api/client";

const EMPTY_FORM = { userId: "", examType: [], region: [] };

export default function AdminVerificationUsers() {
  const [roles, setRoles] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [roleId, setRoleId] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/admin/users/roles"), api.get("/regions/districts")])
      .then(([roleResponse, districtResponse]) => {
        setRoles(unwrap(roleResponse) || []);
        setDistricts(unwrap(districtResponse) || []);
      })
      .catch((err) => setError(err.response?.data?.message || "Unable to load roles and districts."));
  }, []);

  const loadUsers = async () => {
    if (!roleId) {
      setRows([]);
      setError("Please select a role first.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await api.get(`/verification-users/candidates?roleId=${encodeURIComponent(roleId)}&search=${encodeURIComponent(search.trim())}`);
      setRows(unwrap(response) || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  const openManage = (row) => {
    const access = row.verificationAccess;
    setSelectedUser(row.user);
    setForm({
      userId: row.user._id,
      examType: access?.examType || [],
      region: (access?.region || []).map((district) => district._id || district),
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setSelectedUser(null);
    setForm(EMPTY_FORM);
  };

  const toggleExam = (exam) => {
    setForm((current) => ({
      ...current,
      examType: current.examType.includes(exam)
        ? current.examType.filter((item) => item !== exam)
        : [...current.examType, exam],
    }));
  };

  const saveAccess = async () => {
    setError("");
    setMessage("");
    if (!form.examType.length) {
      setError("Select at least one examination.");
      return;
    }
    if (!form.region.length) {
      setError("Select at least one district.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/verification-users", form);
      setMessage("Verification access saved successfully.");
      await loadUsers();
      setTimeout(closeModal, 350);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save verification access.");
    } finally {
      setSaving(false);
    }
  };

  const removeAccess = async () => {
    const assignmentId = rows.find((row) => String(row.user._id) === String(selectedUser?._id))?.verificationAccess?._id;
    if (!assignmentId) {
      closeModal();
      return;
    }
    if (!window.confirm("Remove verification access from this user?")) return;

    setSaving(true);
    setError("");
    try {
      await api.delete(`/verification-users/${assignmentId}`);
      setMessage("Verification access removed successfully.");
      await loadUsers();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove verification access.");
    } finally {
      setSaving(false);
    }
  };

  const districtOptions = districts.map((district) => ({
    value: district._id,
    label: district.districtName,
  }));

  return (
    <AdminShell>
      <section className="admin-page">
        <div className="admin-page-head">
          <div>
            <div className="eyebrow">ADMINISTRATION</div>
            <h1>Verification Users</h1>
            <p>Filter users by role, then manage their examination and district verification access.</p>
          </div>
        </div>

        <div className="panel verification-filter-panel">
          <div className="toolbar verification-user-toolbar">
            <label className="field verification-role-filter">
              <span>Role *</span>
              <select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>{role.name}</option>
                ))}
              </select>
            </label>
            <label className="field verification-search-field">
              <span>Search user</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, mobile or user ID"
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); loadUsers(); } }}
              />
            </label>
            <button type="button" className="primary verification-search-button" onClick={loadUsers} disabled={loading || !roleId}>
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>

        {error && !modalOpen && <div className="error">{error}</div>}
        {message && !modalOpen && <div className="success-message">{message}</div>}

        <div className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Examinations</th>
                  <th>Districts</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!roleId ? (
                  <tr><td colSpan="7" className="empty-row">Select a role and click Search.</td></tr>
                ) : loading ? (
                  <tr><td colSpan="7" className="empty-row">Loading users…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan="7" className="empty-row">No active users found for this role.</td></tr>
                ) : rows.map((row, index) => {
                  const access = row.verificationAccess;
                  return (
                    <tr key={row.user._id}>
                      <td>{index + 1}</td>
                      <td>{row.user.name}</td>
                      <td>{row.user.contact}</td>
                      <td>{row.user.roleId?.name || "—"}</td>
                      <td>{access?.examType?.join(", ") || "Not assigned"}</td>
                      <td>{access?.region?.map((district) => district.districtName).join(", ") || "Not assigned"}</td>
                      <td><button type="button" className="secondary manage-button" onClick={() => openManage(row)}>Manage</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && selectedUser && (
          <div className="verification-modal-backdrop" role="presentation">
            <div className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="verification-modal-title">
              <div className="verification-modal-head">
                <div>
                  <div className="eyebrow">MANAGE ACCESS</div>
                  <h3 id="verification-modal-title">{selectedUser.name}</h3>
                  <p className="muted">{selectedUser.contact} · {selectedUser.roleId?.name}</p>
                </div>
                <button type="button" className="verification-modal-close" onClick={closeModal} disabled={saving}>×</button>
              </div>

              <div className="field">
                <span>Examinations *</span>
                <div className="verification-check-grid">
                  {[
                    ["MB", "Mission Buniyaad"],
                    ["HS100", "Haryana Super 100"],
                  ].map(([value, label]) => (
                    <label key={value}>
                      <input type="checkbox" checked={form.examType.includes(value)} onChange={() => toggleExam(value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <ReactSelect
                label="Districts *"
                options={districtOptions}
                value={form.region}
                onChange={(value) => setForm((current) => ({ ...current, region: value }))}
                placeholder="Select one or more districts"
                isMulti
              />

              {error && <div className="error">{error}</div>}
              {message && <div className="success-message">{message}</div>}

              <div className="verification-modal-actions">
                {rows.find((row) => String(row.user._id) === String(selectedUser._id))?.verificationAccess && (
                  <button type="button" className="secondary" onClick={removeAccess} disabled={saving}>
                    {saving ? "Processing…" : "Remove Verification Access"}
                  </button>
                )}
                <button type="button" className="secondary" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="button" className="primary" onClick={saveAccess} disabled={saving}>
                  {saving ? "Saving…" : "Save Verification Access"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
