import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import OfficialShell from "../components/OfficialShell";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

const emptyForm = { examinationCenter: "", examinationCenterCode: "", examinationCenterCapacity: "" };

export default function SchoolCenterPreferenceForm() {
  const { permissions = [], role } = useAuth();
  const WorkspaceShell = role?.code === "ADMIN" ? AdminShell : OfficialShell;
  const canAccess = role?.code === "ADMIN" || permissions.includes("SCHOOL_CENTER_PREFERENCE");
  const { state } = useLocation();
  const navigate = useNavigate();
  const block = state?.block;
  const districtId = state?.districtId;
  const [centers, setCenters] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCenters = async () => {
    if (!block?.blockId) return;
    try { setCenters(unwrap(await api.get(`/examination-centers/blocks/${block.blockId}/centers`)) || []); }
    catch (e) { setError(e.response?.data?.message || "Unable to load examination centers"); }
  };
  useEffect(() => { if (!block?.blockId) navigate("/school-center-preference", { replace: true }); else loadCenters(); }, [block?.blockId]);

  if (!canAccess) return <WorkspaceShell><section className="admin-page"><h1>Access denied</h1></section></WorkspaceShell>;
  if (!block?.blockId) return <WorkspaceShell><section className="admin-page"><div className="loading">Loading…</div></section></WorkspaceShell>;

  const required = Number(block.totalCentersRequired || 0);
  const canAdd = centers.length < required;
  const startEdit = center => {
    setEditingId(center._id);
    setForm({ examinationCenter: center.examinationCenter || "", examinationCenterCode: center.examinationCenterCode || "", examinationCenterCapacity: String(center.examinationCenterCapacity || "") });
    setError(""); setMessage("");
  };
  const resetForm = () => { setEditingId(""); setForm(emptyForm); };
  const submit = async () => {
    if (!form.examinationCenter.trim() || !form.examinationCenterCode.trim() || !Number.isInteger(Number(form.examinationCenterCapacity)) || Number(form.examinationCenterCapacity) < 1) {
      setError("Please enter center name, center code and a valid capacity (minimum 1)."); return;
    }
    if (!editingId && !canAdd) { setError(`You can add only ${required} active examination centers. Remove a center before adding another.`); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const payload = { examinationCenter: form.examinationCenter.trim(), examinationCenterCode: form.examinationCenterCode.trim(), examinationCenterCapacity: Number(form.examinationCenterCapacity) };
      if (editingId) await api.put(`/examination-centers/centers/${editingId}`, payload);
      else await api.post(`/examination-centers/blocks/${block.blockId}/centers`, payload);
      await loadCenters(); resetForm();
      setMessage(editingId ? "Examination center updated successfully." : "Examination center created successfully.");
    } catch (e) { setError(e.response?.data?.message || "Unable to save examination center"); }
    finally { setBusy(false); }
  };
  const remove = async center => {
    if (!window.confirm(`Remove ${center.examinationCenter}? Any school preferences assigned to this center will automatically be cleared.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api.delete(`/examination-centers/blocks/${block.blockId}/centers/${center._id}`);
      await loadCenters();
      if (editingId === center._id) resetForm();
      setMessage("Center removed. Any school preferences assigned to it have been cleared automatically.");
    } catch (e) { setError(e.response?.data?.message || "Unable to remove examination center"); }
    finally { setBusy(false); }
  };

  return <WorkspaceShell><section className="admin-page">
    <div className="admin-page-head"><div><div className="eyebrow">EXAMINATION MANAGEMENT</div><h1>Examination Centers</h1><p>{block.blockName} · Manage the centers required for this block</p></div><button type="button" onClick={() => navigate("/school-center-preference", { state: { districtId } })}>Back</button></div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:14, marginBottom:18 }}>
      {[{label:"Centers Created",value:centers.length},{label:"Centers Required",value:required},{label:"Remaining",value:Math.max(0,required-centers.length)}].map(item=><div key={item.label} className="panel" style={{padding:18,borderRadius:16,margin:0}}><div style={{fontSize:13,color:"#64748b",fontWeight:700}}>{item.label}</div><div style={{fontSize:28,fontWeight:800,color:"#29366b",marginTop:5}}>{item.value}</div></div>)}
    </div>
    <div className="panel" style={{borderRadius:16}}>
      <div className="panel-head"><div><h3>{editingId ? "Edit Examination Center" : "Add Examination Center"}</h3><p style={{margin:0,color:"#64748b"}}>{editingId ? "Update the selected center details." : canAdd ? "Add centers one at a time until the required count is reached." : "Required count reached. You can still edit or remove existing centers."}</p></div></div>
      {(!editingId && !canAdd) ? <div style={{padding:"12px 0",color:"#64748b"}}>All required centers have been added. Use Edit or Remove below to manage them.</div> : <div className="form-grid">
        <label className="field"><span>Examination Center Name *</span><input value={form.examinationCenter} onChange={e => setForm(old=>({...old,examinationCenter:e.target.value}))} /></label>
        <label className="field"><span>Examination Center Code *</span><input value={form.examinationCenterCode} onChange={e => setForm(old=>({...old,examinationCenterCode:e.target.value}))} /></label>
        <label className="field"><span>Examination Center Capacity *</span><input type="number" min="1" step="1" value={form.examinationCenterCapacity} onChange={e => setForm(old=>({...old,examinationCenterCapacity:e.target.value}))} /></label>
      </div>}
      {(!editingId && !canAdd) ? null : <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap"}}><button type="button" className="primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : editingId ? "Update Center" : "Submit Center"}</button>{editingId && <button type="button" onClick={resetForm} disabled={busy}>Cancel Edit</button>}</div>}
      {error && <div className="error">{error}</div>}{message && <div className="success-message">{message}</div>}
    </div>
    <div className="panel" style={{borderRadius:16}}>
      <div className="panel-head"><div><h3>Created Examination Centers</h3><p style={{margin:0,color:"#64748b"}}>{centers.length} of {required} required centers</p></div></div>
      {centers.length ? <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:14}}>
        {centers.map((center,index)=><div key={center._id} style={{border:"1px solid #e2e8f0",borderRadius:14,padding:16,background:"linear-gradient(145deg,#fff,#f8faff)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"start"}}><span style={{fontSize:12,fontWeight:800,color:"#64748b"}}>CENTER {index+1}</span><span style={{fontSize:12,fontWeight:700,color:"#334155",background:"#eef2ff",padding:"4px 8px",borderRadius:20}}>Capacity: {center.examinationCenterCapacity}</span></div>
          <h3 style={{margin:"10px 0 4px",color:"#1e293b"}}>{center.examinationCenter}</h3><div style={{fontSize:13,color:"#64748b"}}>Code: {center.examinationCenterCode}</div>
          <div style={{display:"flex",gap:8,marginTop:16}}><button type="button" onClick={()=>startEdit(center)} disabled={busy}>Edit</button><button type="button" onClick={()=>remove(center)} disabled={busy} style={{color:"#b91c1c"}}>Remove</button></div>
        </div>)}
      </div> : <div style={{padding:18,textAlign:"center",color:"#64748b"}}>No examination centers added yet.</div>}
    </div>
  </section></WorkspaceShell>;
}
