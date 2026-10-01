import { useEffect,useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api,unwrap } from "../../api/client";
export default function AdminUsers(){
 const [users,setUsers]=useState([]),[roles,setRoles]=useState([]),[form,setForm]=useState({name:"",contact:"",password:"",roleId:""}),[msg,setMsg]=useState(""),[err,setErr]=useState("");
 const load=async()=>{try{const [u,r]=await Promise.all([api.get("/admin/users"),api.get("/admin/users/roles")]);setUsers(unwrap(u)||[]);setRoles(unwrap(r)||[])}catch(e){setErr(e.response?.data?.message||"Unable to load users.")}};
 useEffect(()=>{load()},[]);
 const create=async e=>{e.preventDefault();setMsg("");setErr("");try{await api.post("/admin/users",form);setMsg("User created successfully.");setForm({name:"",contact:"",password:"",roleId:""});load()}catch(e){setErr(e.response?.data?.message||"Unable to create user.")}};
 const toggle=async u=>{try{await api.patch(`/admin/users/${u._id}`,{isActive:!u.isActive});load()}catch(e){setErr(e.response?.data?.message||"Unable to update user.")}};
 return <AdminShell><section className="dashboard"><div className="dash-head"><div><div className="eyebrow">ADMINISTRATION</div><h2>User</h2><p>Create, activate and deactivate portal users.</p></div></div>
 <form className="panel" onSubmit={create}><div className="form-grid"><label className="field"><span>Name *</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label className="field"><span>Mobile / Admin ID *</span><input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} required/></label><label className="field"><span>Password *</span><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/></label><label className="field"><span>Role *</span><select value={form.roleId} onChange={e=>setForm({...form,roleId:e.target.value})} required><option value="">Select role</option>{roles.map(r=><option key={r._id} value={r._id}>{r.name}</option>)}</select></label></div>{err&&<div className="error">{err}</div>}{msg&&<div className="success-message">{msg}</div>}<button className="primary">Create User</button></form>
 <div className="panel"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Contact</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map(u=><tr key={u._id}><td>{u.name}</td><td>{u.contact}</td><td>{u.roleId?.name||"-"}</td><td>{u.isActive?"Active":"Inactive"}</td><td><button className="secondary" onClick={()=>toggle(u)}>{u.isActive?"Deactivate":"Activate"}</button></td></tr>)}</tbody></table></div></div>
 </section></AdminShell>
}
