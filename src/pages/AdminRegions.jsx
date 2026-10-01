import { useEffect, useState } from "react";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import AdminShell from "../components/AdminShell";

export default function AdminRegions(){
  const { user, role } = useAuth();
  const location = useLocation();
  const [districts,setDistricts]=useState([]),[blocks,setBlocks]=useState([]),[schools,setSchools]=useState([]),[form,setForm]=useState({schoolCode:"",schoolName:"",districtId:"",blockId:""}),[message,setMessage]=useState("");
  const load=async()=>{setDistricts(unwrap(await api.get("/regions/districts")));setSchools(unwrap(await api.get("/schools")))};
  useEffect(()=>{if(role?.code==="ADMIN")load().catch(e=>setMessage(e.response?.data?.message||"Unable to load regions"))},[role]);
  const onDistrict=async e=>{const districtId=e.target.value;setForm(f=>({...f,districtId,blockId:""}));setBlocks(districtId?unwrap(await api.get(`/regions/blocks?districtId=${districtId}`)):[])};
  const submit=async e=>{e.preventDefault();try{await api.post("/schools",form);setMessage("School created successfully");setForm({schoolCode:"",schoolName:"",districtId:"",blockId:""});await load()}catch(err){setMessage(err.response?.data?.message||"Unable to create school")}};
  if(role?.code!=="ADMIN") return <section className="auth-page"><div className="auth-card"><h2>Access denied</h2></div></section>;

  if (location.pathname === "/admin") {
    return (
      <AdminShell>
        <section className="admin-home dashboard">
          <div className="admin-welcome-card">
            <div className="eyebrow">ADMIN PANEL</div>
            <h1>{user?.name || "Admin"}</h1>
            <p>{role?.name || "Administrator"}</p>
          </div>
        </section>
      </AdminShell>
    );
  }

  return <AdminShell><section className="dashboard"><div className="dash-head"><div><div className="eyebrow">ADMINISTRATION</div><h2>Examination region mapping</h2><p>Districts and blocks are synced from ERP. Schools are maintained separately for the examination portal.</p></div></div><div className="admin-grid"><form className="auth-card" onSubmit={submit}><h3>Add examination school</h3><label className="field"><span>District *</span><select value={form.districtId} onChange={onDistrict} required><option value="">Select district</option>{districts.map(d=><option key={d._id} value={d._id}>{d.districtName}</option>)}</select></label><label className="field"><span>Block *</span><select value={form.blockId} onChange={e=>setForm({...form,blockId:e.target.value})} required><option value="">Select block</option>{blocks.map(b=><option key={b._id} value={b._id}>{b.blockName}</option>)}</select></label><label className="field"><span>School code</span><input value={form.schoolCode} onChange={e=>setForm({...form,schoolCode:e.target.value})}/></label><label className="field"><span>School name *</span><input value={form.schoolName} onChange={e=>setForm({...form,schoolName:e.target.value})} required/></label><button className="primary">Add School</button>{message&&<div className="message">{message}</div>}</form><div className="panel"><h3>Schools</h3><div className="table-wrap"><table><thead><tr><th>School</th><th>Code</th><th>District</th><th>Block</th></tr></thead><tbody>{schools.map(s=><tr key={s._id}><td>{s.schoolName}</td><td>{s.schoolCode||"—"}</td><td>{s.districtId?.districtName||"—"}</td><td>{s.blockId?.blockName||"—"}</td></tr>)}</tbody></table></div></div></div></section></AdminShell>
}
