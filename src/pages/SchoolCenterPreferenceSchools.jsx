import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Select from "react-select";
import AdminShell from "../components/AdminShell";
import OfficialShell from "../components/OfficialShell";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

const idOf = value => value && typeof value === "object" ? String(value._id || value.id || "") : String(value || "");
const selectStyles = {
  control: (base, state) => ({ ...base, minHeight: 42, borderRadius: 9, borderColor: state.isFocused ? "#5265b8" : "#cbd5e1", boxShadow: state.isFocused ? "0 0 0 3px rgba(82,101,184,.12)" : "none", fontSize: 13, fontWeight: 600, "&:hover": { borderColor: "#5265b8" } }),
  valueContainer: base => ({ ...base, padding: "3px 9px" }),
  option: (base, state) => ({ ...base, fontSize: 13, fontWeight: state.isSelected ? 700 : 600, padding: "10px 12px", backgroundColor: state.isSelected ? "#29366b" : state.isFocused ? "#eef2ff" : "#fff", color: state.isSelected ? "#fff" : "#1e293b" }),
  menu: base => ({ ...base, zIndex: 9999, borderRadius: 10, overflow: "hidden", boxShadow: "0 14px 35px rgba(15,23,42,.16)" }),
  menuPortal: base => ({ ...base, zIndex: 99999 }),
  placeholder: base => ({ ...base, color: "#94a3b8", fontWeight: 500 }),
};

export default function SchoolCenterPreferenceSchools() {
  const { permissions = [], role } = useAuth();
  const WorkspaceShell = role?.code === "ADMIN" ? AdminShell : OfficialShell;
  const canAccess = role?.code === "ADMIN" || permissions.includes("SCHOOL_CENTER_PREFERENCE");
  const { blockId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const program = searchParams.get("program") || state?.program || "MB";
  const [data, setData] = useState({ block: null, schools: [], centers: [], otherBlockCenters: [] });
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setBusy(true); setError("");
    try { setData(unwrap(await api.get(`/examination-centers/blocks/${blockId}/schools`, { params: { program } })) || { block: null, schools: [], centers: [] }); }
    catch (e) { setError(e.response?.data?.message || "Unable to load block schools and centers"); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, [blockId, program]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.schools || [];
    return (data.schools || []).filter(s => `${s.schoolName || ""} ${s.schoolCode || ""}`.toLowerCase().includes(q));
  }, [data.schools, search]);

  const options = useMemo(() => data.centers.map(c => ({
    value: c._id,
    label: `${c.examinationCenter} (${c.examinationCenterCode})`,
  })), [data.centers]);
  const otherBlockOptions = useMemo(() => (data.otherBlockCenters || []).map(c => ({
    value: c._id,
    label: `${c.blockName || "Other Block"} – ${c.examinationCenter} (${c.examinationCenterCode})`,
  })), [data.otherBlockCenters]);
  const change = (schoolId, key, option) => setData(old => ({
    ...old,
    schools: old.schools.map(s => {
      if (s._id !== schoolId) return s;
      const selectedValue = option?.value || "";
      // A school can have only one center preference per program:
      // selecting an own-block center clears the other-block center, and vice versa.
      if (key === "preference1" && selectedValue) {
        return { ...s, preference1: selectedValue, otherBlockPreference: "" };
      }
      if (key === "otherBlockPreference" && selectedValue) {
        return { ...s, otherBlockPreference: selectedValue, preference1: "" };
      }
      return { ...s, [key]: selectedValue };
    }),
  }));
  const save = async school => {
    setSaving(old => ({ ...old, [school._id]: true })); setError(""); setMessage("");
    try {
      await api.put(`/examination-centers/blocks/${blockId}/schools/${school._id}/preferences`, {
        preference1: idOf(school.otherBlockPreference) ? null : (idOf(school.preference1) || null),
        otherBlockPreference: idOf(school.otherBlockPreference) || null,
        program,
      });
      setMessage(`Preferences saved for ${school.schoolName}.`);
    } catch (e) { setError(e.response?.data?.message || `Unable to save preference for ${school.schoolName}`); }
    finally { setSaving(old => ({ ...old, [school._id]: false })); }
  };

  const goBack = () => {
    if (state?.returnTo) navigate(state.returnTo);
    else navigate(`/school-center-preference${state?.districtId ? `?districtId=${state.districtId}` : ""}`);
  };

  if (!canAccess) return <WorkspaceShell><section className="admin-page"><h1>Access denied</h1><p>You do not have permission to manage school preferences.</p></section></WorkspaceShell>;
  return <WorkspaceShell><section className="admin-page scp-school-page">
    <div className="admin-page-head scp-school-heading"><div><div className="eyebrow">EXAMINATION MANAGEMENT</div><h1>Add School Preference – {program}</h1><p>{data.block?.blockName || state?.blockName || "Selected Block"} · {data.schools.length} schools · {data.centers.length} {program} examination centers</p></div>
      <button type="button" className="scp-secondary-btn" onClick={goBack}>← Back to Requirements</button>
    </div>
    {error && <div className="error">{error}</div>}{message && <div className="success-message">{message}</div>}
    <div className="panel scp-school-toolbar">
      <label className="field"><span>Search School by Name or Code</span><input className="scp-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Type school name or code…" /></label>
      <div className="scp-result-count">Showing <strong>{filtered.length}</strong> of <strong>{data.schools.length}</strong> schools</div>
    </div>
    {busy ? <div className="panel loading">Loading schools…</div> : <div className="panel scp-school-table-panel">
      <div className="scp-table-caption"><div><h2>School-wise Preferences</h2><p>Choose one examination center for each school and save each row individually.</p></div><span>{filtered.length} schools</span></div>
      <div className="table-wrap scp-school-table-wrap"><table className="scp-school-table">
        <thead><tr><th className="scp-sno-col">S.No.</th><th className="scp-school-col">School Name / Code</th><th>Preference</th><th>Other Blocks Centers</th><th className="scp-action-col">Action</th></tr></thead>
        <tbody>
          {filtered.map((school,index) => <tr key={school._id}>
            <td className="scp-sno-col">{index + 1}</td>
            <td className="scp-school-col"><strong>{school.schoolName}</strong><span>{school.schoolCode || "—"}</span></td>
            <td><Select classNamePrefix="scp-select" options={options} value={options.find(o=>o.value===idOf(school.preference1))||null} onChange={option=>change(school._id,"preference1",option)} placeholder="Select center…" isClearable isSearchable menuPortalTarget={document.body} styles={selectStyles} /></td>
            <td><Select classNamePrefix="scp-select" options={otherBlockOptions} value={otherBlockOptions.find(o=>o.value===idOf(school.otherBlockPreference))||null} onChange={option=>change(school._id,"otherBlockPreference",option)} placeholder="Select center from another block…" isClearable isSearchable isDisabled={!otherBlockOptions.length} menuPortalTarget={document.body} styles={selectStyles} /></td>
            <td className="scp-action-col"><button type="button" className="scp-save-btn" disabled={!!saving[school._id]} onClick={()=>save(school)}>{saving[school._id] ? "Saving…" : "Submit"}</button></td>
          </tr>)}
          {!filtered.length && <tr><td colSpan="5" className="scp-empty-state">No schools found. Try another school name or code.</td></tr>}
        </tbody>
      </table></div>
    </div>}
  </section></WorkspaceShell>;
}
