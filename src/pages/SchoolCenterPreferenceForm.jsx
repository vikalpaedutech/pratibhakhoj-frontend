import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

const blankSchool = () => ({ schoolId: "", schoolName: "", schoolCode: "", isManual: false, expectedRegistrationCount8: "", expectedRegistrationCount10: "" });

export default function SchoolCenterPreferenceForm() {
  const { permissions = [], role } = useAuth();
  const canAccess = role?.code === "ADMIN" || permissions.includes("SCHOOL_CENTER_PREFERENCE");
  const { state } = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(state || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!state) navigate("/school-center-preference", { replace: true });
  }, [state, navigate]);

  if (!canAccess) return <AdminShell><section className="admin-page"><h1>Access denied</h1><p>You do not have permission to use School Center Preference.</p></section></AdminShell>;
  if (!data) return <AdminShell><section className="admin-page"><div className="loading">Loading…</div></section></AdminShell>;
  const { block, centerId, districtId } = data;
  const form = data.form || { examinationCenter: "", examinationCenterCode: "", examinationCenterCapacity: "", examType: "MB" };
  const rows = data.preferenceRows || [blankSchool()];
  const examType = form.examType || "MB";
  const updateForm = (key, value) => setData(old => ({ ...old, form: { ...old.form, [key]: value } }));
  const updateSchool = (index, key, value) => setData(old => ({ ...old, preferenceRows: old.preferenceRows.map((row, i) => i === index ? { ...row, [key]: value, ...(key === "schoolId" ? (() => { const school = old.schools.find(x => x._id === value); return { schoolName: school?.schoolName || "", schoolCode: school?.schoolCode || "" }; })() : {}) } : row) }));

  const submit = async () => {
    if (!form.examinationCenter?.trim() || !form.examinationCenterCode?.trim() || Number(form.examinationCenterCapacity) < 1) { setError("Center name, center code and capacity are required."); return; }
    const schools = rows.filter(row => row.isManual ? row.schoolName.trim() && row.schoolCode.trim() : row.schoolId).map(row => ({
      schoolId: row.isManual ? null : row.schoolId, isManual: row.isManual, schoolName: row.schoolName, schoolCode: row.schoolCode,
      expectedRegistrationCount8: examType === "MB" ? Number(row.expectedRegistrationCount8 || 0) : 0,
      expectedRegistrationCount10: examType === "HS100" ? Number(row.expectedRegistrationCount10 || 0) : 0,
    }));
    if (!schools.length) { setError("Add at least one school preference."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const payload = { examinationCenter: form.examinationCenter, examinationCenterCode: form.examinationCenterCode, examinationCenterCapacity: Number(form.examinationCenterCapacity), examType, examLevel: 1, paperCount: null, adjustments: null, schools };
      if (centerId) await api.put(`/examination-centers/centers/${centerId}`, payload);
      else await api.post(`/examination-centers/blocks/${block.blockId}/centers`, payload);
      setMessage("Center and school preferences submitted successfully.");
      setTimeout(() => navigate("/school-center-preference", { state: { districtId, refresh: true } }), 500);
    } catch (e) { setError(e.response?.data?.message || "Unable to submit center and school preferences"); }
    finally { setBusy(false); }
  };

  return <AdminShell><section className="admin-page">
    <div className="admin-page-head"><div><div className="eyebrow">EXAMINATION MANAGEMENT</div><h1>{centerId ? "Update Center & School Preference" : "Add Center & School Preference"}</h1><p>{block.blockName}</p></div><button type="button" onClick={() => navigate("/school-center-preference")}>Back</button></div>
    <div className="panel"><div className="form-grid">
      <label className="field"><span>Center Name *</span><input value={form.examinationCenter || ""} onChange={e => updateForm("examinationCenter", e.target.value)} /></label>
      <label className="field"><span>Center Code *</span><input value={form.examinationCenterCode || ""} onChange={e => updateForm("examinationCenterCode", e.target.value)} /></label>
      <label className="field"><span>Center Capacity *</span><input type="number" min="1" value={form.examinationCenterCapacity ?? ""} onChange={e => updateForm("examinationCenterCapacity", e.target.value)} /></label>
      <label className="field"><span>Exam Type *</span><select value={examType} onChange={e => updateForm("examType", e.target.value)}><option value="MB">Mission Buniyaad</option><option value="HS100">Haryana Super 100</option></select></label>
    </div>
    <div className="panel-head" style={{ marginTop: 20 }}><h3>School Preferences</h3></div>
    {rows.map((row, index) => <div key={index} className="panel" style={{ marginBottom: 12, background: "var(--surface, #f8fafc)" }}>
      <div className="panel-head"><strong>School {index + 1}</strong><button type="button" onClick={() => setData(old => ({ ...old, preferenceRows: old.preferenceRows.length > 1 ? old.preferenceRows.filter((_, i) => i !== index) : [blankSchool()] }))}>Remove</button></div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><input type="checkbox" checked={!!row.isManual} onChange={e => updateSchool(index, "isManual", e.target.checked)} /> Add school manually (school not available in dropdown)</label>
      {row.isManual ? <div className="form-grid"><label className="field"><span>School Name *</span><input value={row.schoolName} onChange={e => updateSchool(index, "schoolName", e.target.value)} /></label><label className="field"><span>School Code *</span><input value={row.schoolCode} onChange={e => updateSchool(index, "schoolCode", e.target.value)} /></label></div> : <label className="field"><span>School Name *</span><select value={row.schoolId || ""} onChange={e => updateSchool(index, "schoolId", e.target.value)}><option value="">Select school from {block.blockName}</option>{data.schools.map(s => <option key={s._id} value={s._id}>{s.schoolName} {s.schoolCode ? `(${s.schoolCode})` : ""}</option>)}</select></label>}
      <div className="form-grid">{examType === "MB" ? <label className="field"><span>8th Expected Count</span><input type="number" min="0" value={row.expectedRegistrationCount8 ?? ""} onChange={e => updateSchool(index, "expectedRegistrationCount8", e.target.value)} /></label> : <label className="field"><span>10th Expected Count</span><input type="number" min="0" value={row.expectedRegistrationCount10 ?? ""} onChange={e => updateSchool(index, "expectedRegistrationCount10", e.target.value)} /></label>}</div>
    </div>)}
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}><button type="button" onClick={() => setData(old => ({ ...old, preferenceRows: [...old.preferenceRows, blankSchool()] }))}>Add Preferred Schools</button><button type="button" className="primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Submit Center and School Preference"}</button></div>
    {error && <div className="error">{error}</div>}{message && <div className="success-message">{message}</div>}</div>
  </section></AdminShell>;
}
