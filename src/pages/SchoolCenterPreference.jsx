import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

const blankCenter = { examinationCenter: "", examinationCenterCode: "", examinationCenterCapacity: "", adjustments: "", examType: "", examLevel: "", paperCount: 0 };
const blankSchool = () => ({ schoolId: "", schoolName: "", schoolCode: "", isManual: false, expectedRegistrationCount8: 0, expectedRegistrationCount10: 0 });

export default function SchoolCenterPreference() {
  const { permissions = [], role } = useAuth();
  const canAccess = role?.code === "ADMIN" || permissions.includes("SCHOOL_CENTER_PREFERENCE");
  const [districts, setDistricts] = useState([]);
  const [districtId, setDistrictId] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [centersByBlock, setCentersByBlock] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editor, setEditor] = useState(null);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    api.get("/regions/districts").then(r => setDistricts(unwrap(r) || [])).catch(e => setError(e.response?.data?.message || "Unable to load districts"));
  }, []);

  const loadBlocks = async () => {
    if (!districtId) { setError("Please select a district."); return; }
    setBusy(true); setError(""); setMessage(""); setEditor(null); setViewing(null);
    try {
      const rows = unwrap(await api.get("/examination-centers/requirements", { params: { districtId } })) || [];
      setBlocks(rows);
      const pairs = await Promise.all(rows.map(async block => {
        const centers = unwrap(await api.get(`/examination-centers/blocks/${block.blockId}/centers`)) || [];
        return [block.blockId, centers];
      }));
      setCentersByBlock(Object.fromEntries(pairs));
    } catch (e) { setError(e.response?.data?.message || "Unable to load blocks"); }
    finally { setBusy(false); }
  };

  const updateBlock = (blockId, key, value) => setBlocks(old => old.map(row => row.blockId === blockId ? { ...row, [key]: value } : row));
  const saveBlock = async block => {
    setBusy(true); setError(""); setMessage("");
    try {
      await api.put(`/examination-centers/blocks/${block.blockId}/requirements`, {
        numberOfSchools: Number(block.numberOfSchools),
        expectedRegistrationCount8: Number(block.expectedRegistrationCount8),
        expectedRegistrationCount10: Number(block.expectedRegistrationCount10),
        totalCentersRequired: Number(block.totalCentersRequired),
      });
      setBlocks(old => old.map(row => row.blockId === block.blockId ? { ...row, isSubmitted: true } : row));
      setMessage(`${block.blockName}: block details saved. School Preference is now active.`);
    } catch (e) { setError(e.response?.data?.message || "Unable to save block details"); }
    finally { setBusy(false); }
  };

  const openEditor = async (block, center = null) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const schools = unwrap(await api.get("/regions/schools", { params: { districtId, blockId: block.blockId } })) || [];
      let form = { ...blankCenter };
      let preferenceRows = [blankSchool()];
      if (center) {
        const data = unwrap(await api.get(`/examination-centers/centers/${center._id}/schools`));
        form = {
          examinationCenter: data.center.examinationCenter,
          examinationCenterCode: data.center.examinationCenterCode,
          examinationCenterCapacity: data.center.examinationCenterCapacity,
          adjustments: data.center.adjustments || "",
          examType: data.center.examType || "",
          examLevel: data.center.examLevel || "",
          paperCount: data.center.paperCount || 0,
        };
        preferenceRows = data.schools.length ? data.schools.map(row => ({
          schoolId: row.schoolId?._id || "",
          schoolName: row.schoolName,
          schoolCode: row.schoolCode,
          isManual: row.isManualSchool,
          expectedRegistrationCount8: row.expectedRegistrationCount8 || 0,
          expectedRegistrationCount10: row.expectedRegistrationCount10 || 0,
        })) : [blankSchool()];
      }
      setEditor({ block, centerId: center?._id || null, form, schools, preferenceRows });
    } catch (e) { setError(e.response?.data?.message || "Unable to open school preference form"); }
    finally { setBusy(false); }
  };

  const updateCenterForm = (key, value) => setEditor(old => ({ ...old, form: { ...old.form, [key]: value } }));
  const updateSchool = (index, key, value) => setEditor(old => ({
    ...old,
    preferenceRows: old.preferenceRows.map((row, i) => i === index ? {
      ...row, [key]: value,
      ...(key === "schoolId" ? (() => { const school = old.schools.find(x => x._id === value); return { schoolName: school?.schoolName || "", schoolCode: school?.schoolCode || "" }; })() : {}),
    } : row),
  }));
  const submitCenter = async () => {
    const { block, centerId, form, preferenceRows } = editor;
    if (!form.examinationCenter.trim() || !form.examinationCenterCode.trim() || Number(form.examinationCenterCapacity) < 1) {
      setError("Center name, center code and capacity are required."); return;
    }
    const schools = preferenceRows.filter(row => row.isManual ? row.schoolName.trim() && row.schoolCode.trim() : row.schoolId).map(row => ({
      schoolId: row.isManual ? null : row.schoolId,
      isManual: row.isManual,
      schoolName: row.schoolName,
      schoolCode: row.schoolCode,
      expectedRegistrationCount8: Number(row.expectedRegistrationCount8 || 0),
      expectedRegistrationCount10: Number(row.expectedRegistrationCount10 || 0),
    }));
    if (!schools.length) { setError("Add at least one school preference."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const payload = { ...form, examinationCenterCapacity: Number(form.examinationCenterCapacity), paperCount: Number(form.paperCount || 0), schools };
      if (centerId) await api.put(`/examination-centers/centers/${centerId}`, payload);
      else await api.post(`/examination-centers/blocks/${block.blockId}/centers`, payload);
      const rows = unwrap(await api.get(`/examination-centers/blocks/${block.blockId}/centers`)) || [];
      setCentersByBlock(old => ({ ...old, [block.blockId]: rows }));
      setEditor(null);
      setMessage(centerId ? "Center and school preferences updated." : "Center and school preferences submitted successfully.");
    } catch (e) { setError(e.response?.data?.message || "Unable to submit center and school preferences"); }
    finally { setBusy(false); }
  };

  if (!canAccess) return <AdminShell><section className="admin-page"><h1>Access denied</h1><p>You do not have permission to use School Center Preference.</p></section></AdminShell>;

  return <AdminShell><section className="admin-page">
    <div className="admin-page-head"><div><div className="eyebrow">EXAMINATION MANAGEMENT</div><h1>School Center Preference</h1><p>Configure block-wise registration estimates and allocate preferred schools to examination centers.</p></div></div>

    <div className="panel">
      <div className="form-grid" style={{ alignItems: "end" }}>
        <label className="field"><span>District Filter</span><select value={districtId} onChange={e => setDistrictId(e.target.value)}><option value="">Select district</option>{districts.map(d => <option key={d._id} value={d._id}>{d.districtName}</option>)}</select></label>
        <div><button type="button" className="primary" onClick={loadBlocks} disabled={busy || !districtId}>{busy ? "Please wait…" : "Submit"}</button></div>
      </div>
    </div>

    {blocks.length > 0 && <div className="panel">
      <div className="panel-head"><h3>Block-wise Requirements</h3><span>{blocks.length} blocks</span></div>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>Block</th><th>No. of Schools</th><th>Expected Registration Count 8</th><th>Expected Registration Count 10</th><th>Total Centers Required</th><th>Action</th></tr></thead>
        <tbody>{blocks.map((block, index) => <tr key={block.blockId}>
          <td>{index + 1}</td><td>{block.blockName}</td>
          {["numberOfSchools", "expectedRegistrationCount8", "expectedRegistrationCount10", "totalCentersRequired"].map(key => <td key={key}><input type="number" min="0" step="1" style={{ width: 110 }} value={block[key] ?? 0} onChange={e => updateBlock(block.blockId, key, e.target.value)} /></td>)}
          <td><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" className="primary" onClick={() => saveBlock(block)} disabled={busy}>Submit</button><button type="button" onClick={() => openEditor(block)} disabled={!block.isSubmitted || busy} title={!block.isSubmitted ? "Submit block details first" : "Add center preferences"}>School Preference</button></div></td>
        </tr>)}</tbody>
      </table></div>
      <small>School Preference becomes active only after the block details are submitted.</small>
    </div>}

    {editor && <div className="panel">
      <div className="panel-head"><div><h3>{editor.centerId ? "Update Center & School Preference" : "Add Center & School Preference"}</h3><p>{editor.block.blockName}</p></div><button type="button" onClick={() => setEditor(null)}>Close</button></div>
      <div className="form-grid">
        <label className="field"><span>Center Name *</span><input value={editor.form.examinationCenter} onChange={e => updateCenterForm("examinationCenter", e.target.value)} /></label>
        <label className="field"><span>Center Code *</span><input value={editor.form.examinationCenterCode} onChange={e => updateCenterForm("examinationCenterCode", e.target.value)} /></label>
        <label className="field"><span>Center Capacity *</span><input type="number" min="1" value={editor.form.examinationCenterCapacity} onChange={e => updateCenterForm("examinationCenterCapacity", e.target.value)} /></label>
        <label className="field"><span>Adjustments</span><input value={editor.form.adjustments} onChange={e => updateCenterForm("adjustments", e.target.value)} /></label>
        <label className="field"><span>Exam Type</span><input value={editor.form.examType} onChange={e => updateCenterForm("examType", e.target.value)} /></label>
        <label className="field"><span>Exam Level</span><input value={editor.form.examLevel} onChange={e => updateCenterForm("examLevel", e.target.value)} /></label>
        <label className="field"><span>Paper Count</span><input type="number" min="0" value={editor.form.paperCount} onChange={e => updateCenterForm("paperCount", e.target.value)} /></label>
      </div>
      <div className="panel-head" style={{ marginTop: 20 }}><h3>School Preferences</h3></div>
      {editor.preferenceRows.map((row, index) => <div key={index} className="panel" style={{ marginBottom: 12, background: "var(--surface, #f8fafc)" }}>
        <div className="panel-head"><strong>School {index + 1}</strong><button type="button" onClick={() => setEditor(old => ({ ...old, preferenceRows: old.preferenceRows.length > 1 ? old.preferenceRows.filter((_, i) => i !== index) : [blankSchool()] }))}>Remove</button></div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><input type="checkbox" checked={row.isManual} onChange={e => updateSchool(index, "isManual", e.target.checked)} /> Add school manually (school not available in dropdown)</label>
        {row.isManual ? <div className="form-grid">
          <label className="field"><span>School Name *</span><input value={row.schoolName} onChange={e => updateSchool(index, "schoolName", e.target.value)} /></label>
          <label className="field"><span>School Code *</span><input value={row.schoolCode} onChange={e => updateSchool(index, "schoolCode", e.target.value)} /></label>
        </div> : <label className="field"><span>School Name *</span><select value={row.schoolId} onChange={e => updateSchool(index, "schoolId", e.target.value)}><option value="">Select school from {editor.block.blockName}</option>{editor.schools.map(s => <option key={s._id} value={s._id}>{s.schoolName} {s.schoolCode ? `(${s.schoolCode})` : ""}</option>)}</select></label>}
        <div className="form-grid">
          <label className="field"><span>8th Expected Count</span><input type="number" min="0" value={row.expectedRegistrationCount8} onChange={e => updateSchool(index, "expectedRegistrationCount8", e.target.value)} /></label>
          <label className="field"><span>10th Expected Count</span><input type="number" min="0" value={row.expectedRegistrationCount10} onChange={e => updateSchool(index, "expectedRegistrationCount10", e.target.value)} /></label>
        </div>
      </div>)}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <button type="button" onClick={() => setEditor(old => ({ ...old, preferenceRows: [...old.preferenceRows, blankSchool()] }))}>Add Preferred Schools</button>
        <button type="button" className="primary" onClick={submitCenter} disabled={busy}>{busy ? "Saving…" : "Submit Center and School Preference"}</button>
      </div>
    </div>}

    {blocks.filter(block => (centersByBlock[block.blockId] || []).length > 0).map(block => <div className="panel" key={block.blockId}>
      <div className="panel-head"><h3>{block.blockName} – Created Centers</h3><span>{(centersByBlock[block.blockId] || []).length} centers</span></div>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>Center Name</th><th>Center Code</th><th>Center Capacity</th><th>Total Preferred Schools</th><th>Action</th></tr></thead><tbody>
        {(centersByBlock[block.blockId] || []).map((center, i) => <tr key={center._id}><td>{i + 1}</td><td>{center.examinationCenter}</td><td>{center.examinationCenterCode}</td><td>{center.examinationCenterCapacity}</td><td>{center.totalPreferredSchools || 0}</td><td><div style={{ display: "flex", gap: 8 }}><button type="button" onClick={async () => { try { const data = unwrap(await api.get(`/examination-centers/centers/${center._id}/schools`)); setViewing(data); } catch (e) { setError(e.response?.data?.message || "Unable to load schools"); } }}>View Schools</button><button type="button" onClick={() => openEditor(block, center)}>Edit</button></div></td></tr>)}
      </tbody></table></div>
    </div>)}

    {viewing && <div className="panel"><div className="panel-head"><div><h3>{viewing.center.examinationCenter} – Preferred Schools</h3><p>{viewing.center.examinationCenterCode}</p></div><button type="button" onClick={() => setViewing(null)}>Close</button></div>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>School Name</th><th>School Code</th><th>8th Expected Count</th><th>10th Expected Count</th></tr></thead><tbody>
        {viewing.schools.map((row, i) => <tr key={row._id}><td>{i + 1}</td><td>{row.schoolName}</td><td>{row.schoolCode}</td><td>{row.expectedRegistrationCount8}</td><td>{row.expectedRegistrationCount10}</td></tr>)}
        {!viewing.schools.length && <tr><td colSpan="5">No preferred schools added.</td></tr>}
      </tbody></table></div>
    </div>}

    {error && <div className="error">{error}</div>}{message && <div className="success-message">{message}</div>}
  </section></AdminShell>;
}
