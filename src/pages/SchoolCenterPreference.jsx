import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

const blankCenter = { examinationCenter: "", examinationCenterCode: "", examinationCenterCapacity: "", examType: "MB", examLevel: 1, paperCount: null };
const blankSchool = () => ({ schoolId: "", schoolName: "", schoolCode: "", isManual: false, expectedRegistrationCount8: "", expectedRegistrationCount10: "" });

export default function SchoolCenterPreference() {
  const { permissions = [], role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    if (location.state?.districtId) { setDistrictId(location.state.districtId); loadBlocks(location.state.districtId); navigate(location.pathname, { replace: true, state: null }); }
  }, [location.key]);

  const loadBlocks = async (selectedDistrictId = districtId) => {
    if (!selectedDistrictId) { setError("Please select a district."); return; }
    setBusy(true); setError(""); setMessage(""); setEditor(null); setViewing(null);
    try {
      const rows = unwrap(await api.get("/examination-centers/requirements", { params: { districtId: selectedDistrictId } })) || [];
      setBlocks(rows.map(row => ({ ...row, numberOfSchools: "", expectedRegistrationCount8: "", expectedRegistrationCount10: "", totalCentersRequired: "" })));
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
    if ([block.numberOfSchools, block.expectedRegistrationCount8, block.expectedRegistrationCount10, block.totalCentersRequired].some(v => v === "" || v === null || v === undefined)) { setError("Please fill all block requirement counts before submitting."); return; }
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
          examType: ["HS100", "HARYANA SUPER 100"].includes(String(data.center.examType || "").toUpperCase()) ? "HS100" : "MB",
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
      navigate("/school-center-preference/form", { state: { block, centerId: center?._id || null, form, schools, preferenceRows, districtId } });
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
          {["numberOfSchools", "expectedRegistrationCount8", "expectedRegistrationCount10", "totalCentersRequired"].map(key => <td key={key}><input type="number" min="0" step="1" style={{ width: 110 }} value={block[key] ?? ""} onChange={e => updateBlock(block.blockId, key, e.target.value)} /></td>)}
          <td><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" className="primary" onClick={() => saveBlock(block)} disabled={busy}>Submit</button><button type="button" onClick={() => openEditor(block)} disabled={!block.isSubmitted || busy} title={!block.isSubmitted ? "Submit block details first" : "Add center preferences"}>School Preference</button></div></td>
        </tr>)}</tbody>
      </table></div>
      <small>School Preference becomes active only after the block details are submitted.</small>
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
