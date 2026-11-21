import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Select from "react-select";
import AdminShell from "../components/AdminShell";
import OfficialShell from "../components/OfficialShell";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

// Region values can arrive as an ObjectId string or a populated object
// (for example, through router navigation state). Always send only the ID.
const getId = (value) => {
  if (value && typeof value === "object") {
    return value._id || value.id || value.value || value.districtId?._id || value.districtId || "";
  }
  return value == null ? "" : String(value);
};

const blankCenter = { examinationCenter: "", examinationCenterCode: "", examinationCenterCapacity: "", examType: "MB", examLevel: 1, paperCount: null };
const blankSchool = () => ({ schoolId: "", schoolName: "", schoolCode: "", isManual: false, expectedRegistrationCount8: "", expectedRegistrationCount10: "" });

const selectStyles = {
  control: (base, state) => ({ ...base, minHeight: 48, borderRadius: 11, borderColor: state.isFocused ? "#5265b8" : "#cbd5e1", boxShadow: state.isFocused ? "0 0 0 3px rgba(82,101,184,.13)" : "none", fontSize: 15, fontWeight: 600, "&:hover": { borderColor: "#5265b8" } }),
  valueContainer: base => ({ ...base, padding: "4px 12px" }),
  option: (base, state) => ({ ...base, fontSize: 14, fontWeight: state.isSelected ? 700 : 600, padding: "11px 13px", backgroundColor: state.isSelected ? "#29366b" : state.isFocused ? "#eef2ff" : "#fff", color: state.isSelected ? "#fff" : "#1e293b" }),
  menu: base => ({ ...base, zIndex: 9999, borderRadius: 12, overflow: "hidden", boxShadow: "0 14px 35px rgba(15,23,42,.16)" }),
  menuPortal: base => ({ ...base, zIndex: 99999 }),
  placeholder: base => ({ ...base, color: "#94a3b8", fontWeight: 500 }),
};


export default function SchoolCenterPreference() {
  const { permissions = [], role } = useAuth();
  const WorkspaceShell = role?.code === "ADMIN" ? AdminShell : OfficialShell;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
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
    api.get("/regions/my-districts")
      .then(r => setDistricts(unwrap(r) || []))
      .catch(e => setError(e.response?.data?.message || "Unable to load your assigned districts"));
  }, []);

  useEffect(() => {
    const queryDistrictId = searchParams.get("districtId");
    const navigationDistrictId = getId(location.state?.districtId);
    const restoreId = queryDistrictId || navigationDistrictId;
    if (restoreId) {
      setDistrictId(restoreId);
      loadBlocks(restoreId);
      if (!queryDistrictId) setSearchParams({ districtId: restoreId }, { replace: true });
    }
  }, [location.key, searchParams]);

  const loadBlocks = async (selectedDistrict = districtId) => {
    const selectedDistrictId = getId(selectedDistrict);
    if (!selectedDistrictId) { setError("Please select a district."); return; }
    setDistrictId(selectedDistrictId);
    if (searchParams.get("districtId") !== selectedDistrictId) {
      setSearchParams({ districtId: selectedDistrictId }, { replace: true });
    }
    setBusy(true); setError(""); setMessage(""); setEditor(null); setViewing(null);
    try {
      const rows = unwrap(await api.get("/examination-centers/requirements", { params: { districtId: selectedDistrictId } })) || [];
      setBlocks(rows.map(row => ({ ...row,
        expectedRegistrationsMB: row.expectedRegistrationsMB ?? "",
        centersRequiredMB: row.centersRequiredMB ?? "",
        expectedRegistrationsHS100: row.expectedRegistrationsHS100 ?? "",
        centersRequiredHS100: row.centersRequiredHS100 ?? "",
      })));
      const pairs = await Promise.all(rows.flatMap(block => ["MB", "HS100"].map(async program => {
        const centers = unwrap(await api.get(`/examination-centers/blocks/${block.blockId}/centers`, { params: { program } })) || [];
        return [`${block.blockId}_${program}`, centers];
      })));
      setCentersByBlock(Object.fromEntries(pairs));
    } catch (e) { setError(e.response?.data?.message || "Unable to load blocks"); }
    finally { setBusy(false); }
  };

  const updateBlock = (blockId, key, value) => setBlocks(old => old.map(row => row.blockId === blockId ? { ...row, [key]: value } : row));
  const saveBlock = async block => {
    if ([block.expectedRegistrationsMB, block.centersRequiredMB, block.expectedRegistrationsHS100, block.centersRequiredHS100].some(v => v === "" || v === null || v === undefined)) { setError("Please fill all program-wise requirement counts before submitting."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await api.put(`/examination-centers/blocks/${block.blockId}/requirements`, {
        expectedRegistrationsMB: Number(block.expectedRegistrationsMB),
        centersRequiredMB: Number(block.centersRequiredMB),
        expectedRegistrationsHS100: Number(block.expectedRegistrationsHS100),
        centersRequiredHS100: Number(block.centersRequiredHS100),
      });
      setBlocks(old => old.map(row => row.blockId === block.blockId ? {
        ...row, isSubmitted: true,
        expectedRegistrationsMB: Number(block.expectedRegistrationsMB),
        centersRequiredMB: Number(block.centersRequiredMB),
        expectedRegistrationsHS100: Number(block.expectedRegistrationsHS100),
        centersRequiredHS100: Number(block.centersRequiredHS100),
      } : row));
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
      const rows = unwrap(await api.get(`/examination-centers/blocks/${block.blockId}/centers`, { params: { program: form.examType || "MB" } })) || [];
      setCentersByBlock(old => ({ ...old, [`${block.blockId}_${form.examType || "MB"}`]: rows }));
      setEditor(null);
      setMessage(centerId ? "Center and school preferences updated." : "Center and school preferences submitted successfully.");
    } catch (e) { setError(e.response?.data?.message || "Unable to submit center and school preferences"); }
    finally { setBusy(false); }
  };

  if (!canAccess) return <WorkspaceShell><section className="admin-page"><h1>Access denied</h1><p>You do not have permission to use School Center Preference.</p></section></WorkspaceShell>;

  return <WorkspaceShell><section className="admin-page">
    <div className="admin-page-head"><div><div className="eyebrow">EXAMINATION MANAGEMENT</div><h1>School Center Preference</h1><p>Configure block-wise registration estimates and allocate preferred schools to examination centers.</p></div></div>

    <div className="panel">
      <div className="form-grid" style={{ alignItems: "end" }}>
        <label className="field"><span>District Filter</span><Select
          className="scp-district-select"
          classNamePrefix="scp-select"
          value={districts.map(d => ({ value: getId(d), label: d.districtName })).find(o => o.value === districtId) || null}
          onChange={option => setDistrictId(option?.value || "")}
          options={districts.map(d => ({ value: getId(d), label: d.districtName }))}
          placeholder="Search and select district…"
          isClearable
          isSearchable
          menuPortalTarget={document.body}
          styles={selectStyles}
        /></label>
        <div className="scp-district-submit"><button type="button" className="primary" onClick={() => loadBlocks(districtId)} disabled={busy || !districtId}>{busy ? "Please wait…" : "Load Blocks"}</button></div>
      </div>
    </div>

    {blocks.length > 0 && <div className="panel" style={{background:"transparent",boxShadow:"none",padding:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,margin:"8px 0 16px",flexWrap:"wrap"}}>
        <div><h2 style={{margin:"0 0 4px",color:"#1e293b"}}>Block-wise Requirements</h2><p style={{margin:0,color:"#64748b"}}>Enter and save the registration estimates and center requirements for each block.</p></div>
        <span style={{fontSize:13,fontWeight:700,color:"#475569",background:"#eaf0ff",padding:"7px 12px",borderRadius:20}}>{blocks.length} Blocks</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(310px,1fr))",gap:16}}>
        {blocks.map((block,index) => <div key={block.blockId} className="scp-block-card" style={{background:"#fff",border:"1.5px solid #202020",borderRadius:18,padding:22,boxShadow:"0 8px 24px rgba(15,23,42,.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:16}}>
            <div><div style={{fontSize:11,fontWeight:800,letterSpacing:".08em",color:"#64748b"}}>BLOCK {String(index+1).padStart(2,"0")}</div><h3 style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:"#1e293b"}}>{block.blockName}</h3></div>
            <span style={{fontSize:11,fontWeight:800,padding:"6px 9px",borderRadius:20,background:block.isSubmitted?"#dcfce7":"#fff7ed",color:block.isSubmitted?"#166534":"#9a3412"}}>{block.isSubmitted?"SAVED":"PENDING"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
            {[
              ["expectedRegistrationsMB","Expected Registrations – Mission Buniyaad"],
              ["centersRequiredMB","Centers Required For Mission Buniyaad"],
              ["expectedRegistrationsHS100","Expected Registrations – Haryana Super 100"],
              ["centersRequiredHS100","Centers Required For Haryana Super 100"],
            ].map(([key,label])=><label key={key} className="field" style={{margin:0}}><span style={{fontSize:14,fontWeight:800,minHeight:48}}>{label}</span><input type="number" min="0" step="1" placeholder="Enter value" value={block[key] ?? ""} onChange={e=>updateBlock(block.blockId,key,e.target.value)} style={{width:"100%",boxSizing:"border-box",borderRadius:10}} /></label>)}
          </div>
          <button type="button" className="primary" onClick={()=>saveBlock(block)} disabled={busy} style={{width:"100%",marginTop:16,minHeight:46,borderRadius:11,fontSize:14,fontWeight:800}}>Save Requirements</button>
          {["MB","HS100"].map(program => {
            const label = program === "MB" ? "MB" : "HS100";
            const list = centersByBlock[`${block.blockId}_${program}`] || [];
            const required = Number(program === "MB" ? block.centersRequiredMB || 0 : block.centersRequiredHS100 || 0);
            return <div key={program} style={{marginTop:14,paddingTop:12,borderTop:"1px solid #e2e8f0"}}>
              <button type="button" onClick={()=>navigate("/school-center-preference/form",{state:{block:{...block, program, totalCentersRequired:required},districtId,program}})} disabled={!block.isSubmitted||busy} style={{width:"100%",minHeight:44,borderRadius:10,fontWeight:800}}>Add Examination Centers – {label} ({list.length}/{required})</button>
              <button type="button" onClick={()=>navigate(`/school-center-preference/blocks/${block.blockId}/schools?program=${program}`,{state:{districtId,blockName:block.blockName,program,returnTo:`/school-center-preference?districtId=${districtId}`}})} disabled={!block.isSubmitted||required<=0||list.length<required||busy} style={{width:"100%",marginTop:8,minHeight:44,borderRadius:10,fontWeight:800}}>Add School Preference – {list.length}/{required} {label}</button>
            </div>;
          })}
        </div>)}
      </div>
    </div>}

    {blocks.filter(block => ["MB","HS100"].some(program => (centersByBlock[`${block.blockId}_${program}`] || []).length > 0)).map(block => <div className="panel" key={block.blockId}>
      <div className="panel-head"><h3>{block.blockName} – Created Centers</h3></div>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>Center Name</th><th>Center Code</th><th>Center Capacity</th><th>Total Preferred Schools</th></tr></thead><tbody>
        {["MB","HS100"].flatMap(program => (centersByBlock[`${block.blockId}_${program}`] || []).map(center => ({...center, _program:program}))).map((center, i) => <tr key={center._id}><td>{i + 1}</td><td>{center._program} · {center.examinationCenter}</td><td>{center.examinationCenterCode}</td><td>{center.examinationCenterCapacity}</td><td>{center.totalPreferredSchools || 0}</td></tr>)}
      </tbody></table></div>
    </div>)}

    {viewing && <div className="panel"><div className="panel-head"><div><h3>{viewing.center.examinationCenter} – Preferred Schools</h3><p>{viewing.center.examinationCenterCode}</p></div><button type="button" onClick={() => setViewing(null)}>Close</button></div>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>School Name</th><th>School Code</th><th>8th Expected Count</th><th>10th Expected Count</th></tr></thead><tbody>
        {viewing.schools.map((row, i) => <tr key={row._id}><td>{i + 1}</td><td>{row.schoolName}</td><td>{row.schoolCode}</td><td>{row.expectedRegistrationCount8}</td><td>{row.expectedRegistrationCount10}</td></tr>)}
        {!viewing.schools.length && <tr><td colSpan="5">No preferred schools added.</td></tr>}
      </tbody></table></div>
    </div>}

    {error && <div className="error">{error}</div>}{message && <div className="success-message">{message}</div>}
  </section></WorkspaceShell>;
}
