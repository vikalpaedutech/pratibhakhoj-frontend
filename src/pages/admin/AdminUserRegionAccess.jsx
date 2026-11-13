import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, unwrap } from "../../api/client";
import MultiSelectDropdown from "../../components/MultiSelectDropdown";

export default function AdminUserRegionAccess() {
  const [users, setUsers] = useState([]); const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState(""); const [selectedRoleId, setSelectedRoleId] = useState(""); const [search, setSearch] = useState("");
  const [districts, setDistricts] = useState([]); const [blocks, setBlocks] = useState([]); const [schools, setSchools] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); const [access, setAccess] = useState([]); const [accessMap, setAccessMap] = useState({});
  const [districtIds, setDistrictIds] = useState([]); const [blockIds, setBlockIds] = useState([]); const [schoolIds, setSchoolIds] = useState([]); const [globalAccess, setGlobalAccess] = useState(false);
  const [modal, setModal] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");

  useEffect(() => { Promise.all([api.get("/admin/users"), api.get("/admin/users/roles"), api.get("/regions/districts")]).then(([u,r,d]) => { setUsers(unwrap(u)||[]); setRoles(unwrap(r)||[]); setDistricts(unwrap(d)||[]); }).catch(e => setErr(e.response?.data?.message || "Unable to load data.")); }, []);
  useEffect(() => { if (!roleId) return; const roleUsers=users.filter(u => (u.roleId?._id || u.roleId) === roleId); Promise.all(roleUsers.map(async user=>{ try{return [user._id, unwrap(await api.get(`/admin/user-region-access/${user._id}`))||[]];}catch{return [user._id,[]];} })).then(pairs=>setAccessMap(old=>({...old,...Object.fromEntries(pairs)}))); }, [roleId, users]);
  const filtered = useMemo(() => users.filter(u => (!roleId || (u.roleId?._id || u.roleId) === roleId) && (!search || new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(`${u.name||""} ${u.contact||""}`))), [users, roleId, search]);
  const openManage = async user => {
    setSelectedUser(user); setErr(""); setMsg(""); setBusy(true);
    try {
      const rows = unwrap(await api.get(`/admin/user-region-access/${user._id}`)) || []; setAccess(rows);
      setDistrictIds([...new Set(rows.filter(x => x.scope === "district").map(x => String(x.districtId?._id || x.districtId)).filter(Boolean))]);
      setBlockIds([...new Set(rows.filter(x => x.scope === "block").map(x => String(x.blockId?._id || x.blockId)).filter(Boolean))]);
      setSchoolIds([...new Set(rows.filter(x => x.scope === "school").map(x => String(x.schoolId?._id || x.schoolId)).filter(Boolean))]); setGlobalAccess(rows.some(x=>x.scope==="global"));
      const blockLists = await Promise.all((unwrap(await api.get("/regions/districts")) || []).map(d => api.get("/regions/blocks", {params:{districtId:d._id}}))); setBlocks(blockLists.flatMap(x=>unwrap(x)||[]));
      const allSchools = unwrap(await api.get("/regions/schools")) || []; setSchools(allSchools);
      setModal(true);
    } catch(e) { setErr(e.response?.data?.message || "Unable to load assigned regions."); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!selectedUser) return; setBusy(true); setErr(""); setMsg("");
    const regions = globalAccess ? [{scope:"global"}] : [
      ...districtIds.map(districtId => ({ scope: "district", districtId })),
      ...blockIds.map(blockId => { const b=blocks.find(x=>x._id===blockId); return { scope:"block", blockId, districtId:b?.districtId?._id || b?.districtId }; }),
      ...schoolIds.map(schoolId => { const s=schools.find(x=>x._id===schoolId); return { scope:"school", schoolId, blockId:s?.blockId?._id || s?.blockId, districtId:s?.districtId?._id || s?.districtId }; }),
    ];
    try { await api.put(`/admin/user-region-access/${selectedUser._id}`, { regions }); setMsg("User region access updated."); const rows=unwrap(await api.get(`/admin/user-region-access/${selectedUser._id}`))||[]; setAccess(rows); setAccessMap(old=>({...old,[selectedUser._id]:rows})); }
    catch(e) { setErr(e.response?.data?.message || "Unable to update access."); }
    finally { setBusy(false); }
  };
  const assignedText = rows => rows.length ? rows.map(x => x.schoolId?.schoolName || x.blockId?.blockName || x.districtId?.districtName || (x.scope === "global" ? "All Regions" : "—")).join(", ") : "Not assigned";
  const currentScope = rows => rows.length ? [...new Set(rows.map(x => x.scope))].map(x => x[0].toUpperCase()+x.slice(1)).join(", ") : "Not assigned";
  const districtOptions = districts.map(x=>({value:x._id,label:x.districtName}));
  const blockOptions = blocks.filter(x => !districtIds.length || districtIds.includes(String(x.districtId?._id || x.districtId))).map(x=>({value:x._id,label:`${x.blockName} · ${x.districtName || districts.find(d=>d._id===(x.districtId?._id||x.districtId))?.districtName || ""}`}));
  const schoolOptions = schools.filter(x => (!districtIds.length || districtIds.includes(String(x.districtId?._id || x.districtId))) && (!blockIds.length || blockIds.includes(String(x.blockId?._id || x.blockId)))).map(x=>({value:x._id,label:x.schoolName}));

  return <AdminShell><section className="dashboard"><div className="dash-head"><div><div className="eyebrow">ADMINISTRATION</div><h2>User Region Access</h2><p>Filter users by role and manage multiple district, block and school assignments.</p></div></div>
    <div className="panel"><div className="form-grid" style={{alignItems:"end"}}><label className="field"><span>Role Filter</span><select value={selectedRoleId} onChange={e=>setSelectedRoleId(e.target.value)}><option value="">Select role</option>{roles.map(r=><option key={r._id} value={r._id}>{r.name}</option>)}</select></label><button type="button" className="primary" onClick={()=>{setRoleId(selectedRoleId);setSearch("");}}>Submit</button></div>
      {roleId && <label className="field" style={{marginTop:14}}><span>Search by Name / Contact</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Type name or contact number" /></label>}
    </div>
    {roleId && <div className="panel"><div className="panel-head"><h3>Users</h3><span>{filtered.length} users</span></div><div className="table-wrap"><table><thead><tr><th>S.No.</th><th>Name</th><th>Role</th><th>Scope</th><th>Assigned</th><th>Action</th></tr></thead><tbody>{filtered.map((u,i)=>{ const rows=accessMap[u._id] || []; return <tr key={u._id}><td>{i+1}</td><td>{u.name}<small style={{display:"block"}}>{u.contact}</small></td><td>{u.roleId?.name || "—"}</td><td>{currentScope(rows)}</td><td>{assignedText(rows)}</td><td><button type="button" onClick={()=>openManage(u)}>Manage</button></td></tr>; })}{!filtered.length&&<tr><td colSpan="6">No users found for this role.</td></tr>}</tbody></table></div></div>}
    {err&&<div className="error">{err}</div>}{msg&&<div className="success-message">{msg}</div>}
    {modal&&<div className="modal-backdrop"><div className="modal-card" style={{width:"min(850px,100%)",maxHeight:"90vh",overflowY:"auto"}}><div className="panel-head"><div><h3>Manage Region Access</h3><p>{selectedUser?.name} · {selectedUser?.contact}</p></div><button type="button" onClick={()=>setModal(false)}>Close</button></div>
      <p>Current access: {currentScope(access)} — {assignedText(access)}</p>
      <label style={{display:"flex",gap:8,alignItems:"center",margin:"12px 0"}}><input type="checkbox" checked={globalAccess} onChange={e=>setGlobalAccess(e.target.checked)} /> Grant Global Access (all regions)</label><div className="form-grid"><MultiSelectDropdown label="Districts" options={districtOptions} value={globalAccess?[]:districtIds} onChange={setDistrictIds} placeholder="Select multiple districts"/><MultiSelectDropdown label="Blocks" options={blockOptions} value={globalAccess?[]:blockIds} onChange={setBlockIds} placeholder="Select multiple blocks"/><MultiSelectDropdown label="Schools" options={schoolOptions} value={globalAccess?[]:schoolIds} onChange={setSchoolIds} placeholder="Select multiple schools"/></div>
      <div className="modal-actions"><button type="button" onClick={()=>{setDistrictIds([]);setBlockIds([]);setSchoolIds([]);setGlobalAccess(false);}}>Clear All</button><button type="button" className="primary" onClick={save} disabled={busy}>{busy?"Saving…":"Save Access"}</button></div>{err&&<div className="error">{err}</div>}{msg&&<div className="success-message">{msg}</div>}
    </div></div>}
  </section></AdminShell>;
}
