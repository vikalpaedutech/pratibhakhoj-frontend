import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import OfficialShell from "../components/OfficialShell";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

const ACTIVITIES = [
  "Coordination with Principal / School Nodal Officer",
  "Assembly / interaction with eligible students",
  "Awareness session on Mission Buniyaad & Haryana Super 100",
  "Screening of approved awareness videos",
  "Display / sharing of campaign posters",
  "Student queries and interaction",
  "Awareness survey (FAQs) conducted",
  "Registration",
];
const PROGRAMMES = [
  { programme: "Mission Buniyaad", eligibleClass: "Class 8" },
  { programme: "Haryana Super 100", eligibleClass: "Class 10" },
];

const emptyForm = (name = "") => ({
  schoolCampaign: { centreCoordinator: name },
  activities: ACTIVITIES.map((activity) => ({ activity, status: "", remarks: "" })),
  studentRegistrationStatus: PROGRAMMES.map((p) => ({ programme: p.programme, eligibleClass: p.eligibleClass, totalStudents: "", studentsAbove60: "", studentsBelow60: "", studentsPresent: "", studentsAbsent: "", registrationsCompleted: "", registrationsPending: "" })),
  pendingFollowUp: PROGRAMMES.map((p) => ({ programme: p.programme, pendingRegistrations: "", reasonRemarks: "", committedDate: "" })),
  signOff: { centreCoordinatorName: name, schoolHeadName: "" },
});

function downloadBlob(response, fileName) {
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function buildQuery({ startDate, endDate, status, page = 1 } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return params.toString();
}

function CreateVisitModal({ onClose, onCreated }) {
  const [districts, setDistricts] = useState([]), [blocks, setBlocks] = useState([]), [schools, setSchools] = useState([]);
  const [form, setForm] = useState({ visitDate: "", districtId: "", blockId: "", schoolId: "", description: "" });
  const [error, setError] = useState(""), [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/regions/my-districts").then((r) => setDistricts(unwrap(r) || [])).catch((e) => setError(e.response?.data?.message || "Unable to load districts."));
  }, []);

  const district = async (e) => {
    const districtId = e.target.value;
    setForm((f) => ({ ...f, districtId, blockId: "", schoolId: "" }));
    setSchools([]); setBlocks([]);
    if (!districtId) return;
    try { setBlocks(unwrap(await api.get(`/regions/my-blocks?districtId=${districtId}`)) || []); }
    catch (err) { setError(err.response?.data?.message || "Unable to load blocks."); }
  };

  const block = async (e) => {
    const blockId = e.target.value;
    setForm((f) => ({ ...f, blockId, schoolId: "" }));
    setSchools([]);
    if (!blockId || !form.districtId) return;
    try { setSchools(unwrap(await api.get(`/regions/my-schools?districtId=${form.districtId}&blockId=${blockId}`)) || []); }
    catch (err) { setError(err.response?.data?.message || "Unable to load schools."); }
  };

  const submit = async (e) => {
    e.preventDefault(); setError(""); setSaving(true);
    try { const visit = unwrap(await api.post("/school-visits", form)); onCreated(visit); }
    catch (err) { setError(err.response?.data?.message || "Unable to create visit."); }
    finally { setSaving(false); }
  };

  return <div className="modal-backdrop"><div className="modal-card school-visit-modal"><div className="modal-head"><div><div className="eyebrow">SCHOOL VISIT</div><h2>Create Your Visit</h2></div><button className="icon-button" onClick={onClose}>×</button></div><form onSubmit={submit}><div className="form-grid"><label className="field"><span>Visit Date *</span><input type="date" value={form.visitDate} onChange={(e)=>setForm({...form,visitDate:e.target.value})} required/></label><label className="field"><span>District *</span><select value={form.districtId} onChange={district} required><option value="">Select district</option>{districts.map(d=><option key={d._id} value={d._id}>{d.districtName}</option>)}</select></label><label className="field"><span>Block *</span><select value={form.blockId} onChange={block} disabled={!form.districtId} required><option value="">Select block</option>{blocks.map(b=><option key={b._id} value={b._id}>{b.blockName}</option>)}</select></label><label className="field"><span>School *</span><select value={form.schoolId} onChange={(e)=>setForm({...form,schoolId:e.target.value})} disabled={!form.blockId} required><option value="">Select school</option>{schools.map(s=><option key={s._id} value={s._id}>{s.schoolName}{s.schoolCode ? ` · ${s.schoolCode}` : ""}</option>)}</select></label><label className="field field-full"><span>Description</span><textarea rows="3" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} placeholder="Purpose / plan for this school visit"/></label></div>{error&&<div className="error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving?"Creating…":"Create"}</button></div></form></div></div>;
}

export default function SchoolVisit() {
  const { id } = useParams();
  if (id) return <SchoolVisitForm id={id} />;
  return <SchoolVisitList />;
}

function SchoolVisitList() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ startDate: "", endDate: "", status: "YET_TO_VISIT" });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 50 });
  const [exporting, setExporting] = useState(false);

  const load = async (targetPage = page, targetFilters = filters) => {
    setLoading(true); setError("");
    try {
      const data = unwrap(await api.get(`/school-visits?${buildQuery({ ...targetFilters, page: targetPage })}`));
      setVisits(data?.items || []);
      setPagination({ total: data?.total || 0, totalPages: data?.totalPages || 1, limit: data?.limit || 50 });
    } catch (e) { setError(e.response?.data?.message || "Unable to load school visits."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, filters); }, [filters]);

  const updateFilter = (key, value) => { setPage(1); setFilters((f) => ({ ...f, [key]: value })); };
  const resetFilters = () => { setPage(1); setFilters({ startDate: "", endDate: "", status: "YET_TO_VISIT" }); };
  const exportReport = async () => {
    setExporting(true); setError("");
    try {
      const query = buildQuery({ ...filters, page: undefined }).replace("&page=1", "");
      const response = await api.get(`/school-visits/export${query ? `?${query}` : ""}`, { responseType: "blob" });
      downloadBlob(response, "school-visits-report.xlsx");
    } catch (e) { setError(e.response?.data?.message || "Unable to export report."); }
    finally { setExporting(false); }
  };

  return <OfficialShell><section className="school-visit-page"><div className="workspace-title school-visit-title"><div><div className="eyebrow">FIELD ACTIVITY</div><h1>School Visit</h1><p>Create your weekly school visits and complete the awareness campaign form after visiting.</p></div><div className="school-visit-actions"><button className="secondary" onClick={exportReport} disabled={exporting}>{exporting?"Exporting…":"Export Report"}</button><button className="secondary" onClick={async()=>{try{const r=await api.get("/school-visits/template",{responseType:"blob"});downloadBlob(r,"school-awareness-campaign-blank-template.pdf")}catch(e){setError(e.response?.data?.message||"Unable to download template.")}}}>Blank Template</button><button className="primary" onClick={()=>setShowCreate(true)}>Create Your Visits</button></div></div>
    <div className="school-visit-filters panel"><div className="filter-field"><span>Start Date</span><input type="date" value={filters.startDate} onChange={(e)=>updateFilter("startDate",e.target.value)}/></div><div className="filter-field"><span>End Date</span><input type="date" value={filters.endDate} onChange={(e)=>updateFilter("endDate",e.target.value)}/></div><div className="filter-field"><span>Visiting Status</span><select value={filters.status} onChange={(e)=>updateFilter("status",e.target.value)}><option value="YET_TO_VISIT">Yet to visit</option><option value="VISITED">Visited</option></select></div><button className="secondary filter-reset" onClick={resetFilters}>Reset</button></div>
    {error&&<div className="error">{error}</div>}
    <div className="school-visit-list-meta"><strong>{pagination.total} visit{pagination.total===1?"":"s"}</strong><span>Showing maximum 50 per page · sorted oldest to newest</span></div>
    {loading?<div className="panel">Loading visits…</div>:visits.length===0?<div className="panel school-visit-empty"><h3>No visits found</h3><p>Try another date range/status or create a new school visit.</p><button className="primary" onClick={()=>setShowCreate(true)}>Create Your Visits</button></div>:<div className="school-visit-grid">{visits.map(v=><VisitCard key={v._id} visit={v} onVisit={()=>navigate(`/official/school-visits/${v._id}`)}/>)}</div>}
    {pagination.totalPages>1&&<div className="school-visit-pagination"><button className="secondary" disabled={page<=1||loading} onClick={()=>{const p=page-1;setPage(p);load(p,filters)}}>Previous</button><span>Page {page} of {pagination.totalPages}</span><button className="secondary" disabled={page>=pagination.totalPages||loading} onClick={()=>{const p=page+1;setPage(p);load(p,filters)}}>Next</button></div>}
    {showCreate&&<CreateVisitModal onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);setPage(1);load(1,filters)}}/>}</section></OfficialShell>;
}

function VisitCard({visit,onVisit}) { const visited=visit.status==="VISITED"; return <article className={`school-visit-card ${visited?"visited":""}`}><div className="visit-card-top"><span className={`visit-status ${visited?"visited":"planned"}`}>{visited?"Visited":"Yet to visit"}</span><strong>{new Date(visit.visitDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</strong></div><h3>{visit.schoolId?.schoolName||"School"}</h3><p className="visit-region">{visit.districtId?.districtName} · {visit.blockId?.blockName}</p><p className="visit-description">{visit.description||"No description added."}</p><div className="visit-card-footer"><span>{visited?"Form & attachment submitted":"Visit planned"}</span><button className={visited?"secondary":"primary"} onClick={onVisit}>{visited?"View":"Visit"}</button></div></article> }

function SchoolVisitForm({id}) {
  const navigate=useNavigate(); const {user}=useAuth(); const [visit,setVisit]=useState(null),[form,setForm]=useState(emptyForm(user?.name||"")),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[file,setFile]=useState(null);
  const load=async()=>{setLoading(true);try{const data=unwrap(await api.get(`/school-visits/${id}`));setVisit(data);const blank=emptyForm(user?.name||"");setForm({...blank,...(data.form||{}),schoolCampaign:{...blank.schoolCampaign,...(data.form?.schoolCampaign||{})},activities:data.form?.activities?.length?data.form.activities:blank.activities,studentRegistrationStatus:data.form?.studentRegistrationStatus?.length?data.form.studentRegistrationStatus:blank.studentRegistrationStatus,pendingFollowUp:data.form?.pendingFollowUp?.length?data.form.pendingFollowUp:blank.pendingFollowUp,signOff:{...blank.signOff,...(data.form?.signOff||{})}})}catch(e){setError(e.response?.data?.message||"Unable to load visit.")}finally{setLoading(false)}};
  useEffect(()=>{load()},[id]);
  const updateNested=(section,index,key,value)=>setForm((f)=>({...f,[section]:f[section].map((row,i)=>i===index?{...row,[key]:value}:row)}));
  const save=async()=>{setError("");setMessage("");setSaving(true);try{const data=unwrap(await api.put(`/school-visits/${id}/form`,{form}));setVisit(data);setForm(data.form);setMessage("Visit form saved successfully.")}catch(e){setError(e.response?.data?.message||"Unable to save form.")}finally{setSaving(false)}};
  const download=async()=>{try{const r=await api.get(`/school-visits/${id}/pdf`,{responseType:"blob"});downloadBlob(r,`school-visit-${id}.pdf`)}catch(e){setError(e.response?.data?.message||"Unable to download PDF.")}};
  const upload=async()=>{if(!file)return setError("Select the signed form first.");setError("");setUploading(true);try{const fd=new FormData();fd.append("file",file);const data=unwrap(await api.post(`/school-visits/${id}/upload`,fd,{headers:{"Content-Type":"multipart/form-data"}}));setVisit(data);setMessage("Signed visit form uploaded. Visit marked as Visited.");setFile(null)}catch(e){setError(e.response?.data?.message||"Unable to upload signed form.")}finally{setUploading(false)}};
  const viewAttachment=async()=>{try{const data=unwrap(await api.get(`/school-visits/${id}/attachment`));window.open(data.url,"_blank","noopener,noreferrer")}catch(e){setError(e.response?.data?.message||"Unable to open attachment.")}};
  if(loading)return <OfficialShell><div className="panel">Loading visit…</div></OfficialShell>;
  if(!visit)return <OfficialShell><div className="error">{error||"Visit not found."}</div></OfficialShell>;
  return <OfficialShell><section className="school-visit-form-page"><div className="workspace-title"><div><button className="back-link" onClick={()=>navigate("/official/school-visits")}>← Back to School Visits</button><div className="eyebrow">SCHOOL VISIT FORM</div><h1>{visit.schoolId?.schoolName}</h1><p>{visit.districtId?.districtName} · {visit.blockId?.blockName} · {new Date(visit.visitDate).toLocaleDateString("en-IN")}</p></div><span className={`visit-status large ${visit.status==="VISITED"?"visited":"planned"}`}>{visit.status==="VISITED"?"Visited":"Yet to visit"}</span></div><div className="panel visit-meta"><strong>{visit.description||"School visit"}</strong><span>Centre Coordinator: {user?.name}</span></div><div className="visit-form-panel"><h2>1. School Campaign Details</h2><div className="form-grid"><label className="field"><span>School Name</span><input value={visit.schoolId?.schoolName||""} disabled/></label><label className="field"><span>School Code</span><input value={visit.schoolId?.schoolCode||""} disabled/></label><label className="field"><span>Block</span><input value={visit.blockId?.blockName||""} disabled/></label><label className="field"><span>District</span><input value={visit.districtId?.districtName||""} disabled/></label><label className="field"><span>Date of SLC Visit</span><input value={new Date(visit.visitDate).toLocaleDateString("en-IN")} disabled/></label><label className="field"><span>Centre Coordinator</span><input value={form.schoolCampaign?.centreCoordinator||""} onChange={(e)=>setForm({...form,schoolCampaign:{...form.schoolCampaign,centreCoordinator:e.target.value}})}/></label></div></div><div className="visit-form-panel"><h2>2. Awareness Campaign Activities</h2><div className="visit-table-wrap"><table className="visit-table"><thead><tr><th>S. No.</th><th>Activity</th><th>Status (Yes/No)</th><th>Remarks</th></tr></thead><tbody>{form.activities.map((row,i)=><tr key={i}><td>{i+1}</td><td>{row.activity}</td><td><select value={row.status} onChange={(e)=>updateNested("activities",i,"status",e.target.value)}><option value="">Select</option><option>Yes</option><option>No</option></select></td><td><input value={row.remarks} onChange={(e)=>updateNested("activities",i,"remarks",e.target.value)}/></td></tr>)}</tbody></table></div></div><div className="visit-form-panel"><h2>3. Student Registration Status</h2><div className="visit-table-wrap"><table className="visit-table compact"><thead><tr><th>Programme</th><th>Eligible Class</th><th>Total Students</th><th>Above 60%</th><th>Below 60%</th><th>Present</th><th>Absent</th><th>Registrations Completed</th><th>Registrations Pending</th></tr></thead><tbody>{form.studentRegistrationStatus.map((row,i)=><tr key={i}><td>{row.programme}</td><td>{row.eligibleClass}</td>{["totalStudents","studentsAbove60","studentsBelow60","studentsPresent","studentsAbsent","registrationsCompleted","registrationsPending"].map(k=><td key={k}><input type="number" min="0" value={row[k]??""} onChange={(e)=>updateNested("studentRegistrationStatus",i,k,e.target.value)}/></td>)}</tr>)}</tbody></table></div></div><div className="visit-form-panel"><h2>4. Pending Registration & Follow-up</h2><div className="visit-table-wrap"><table className="visit-table"><thead><tr><th>Programme</th><th>Pending Registrations</th><th>Reason / Remarks</th><th>Committed Date for Completion</th></tr></thead><tbody>{form.pendingFollowUp.map((row,i)=><tr key={i}><td>{row.programme}</td><td><input type="number" min="0" value={row.pendingRegistrations??""} onChange={(e)=>updateNested("pendingFollowUp",i,"pendingRegistrations",e.target.value)}/></td><td><textarea value={row.reasonRemarks} onChange={(e)=>updateNested("pendingFollowUp",i,"reasonRemarks",e.target.value)}/></td><td><input type="date" value={row.committedDate?String(row.committedDate).slice(0,10):""} onChange={(e)=>updateNested("pendingFollowUp",i,"committedDate",e.target.value)}/></td></tr>)}</tbody></table></div></div><div className="visit-form-panel"><h2>6. Sign-Off & Submission</h2><div className="form-grid"><label className="field"><span>Centre Coordinator Name</span><input value={form.signOff?.centreCoordinatorName||""} onChange={(e)=>setForm({...form,signOff:{...form.signOff,centreCoordinatorName:e.target.value}})}/></label><label className="field"><span>School Head Name</span><input value={form.signOff?.schoolHeadName||""} onChange={(e)=>setForm({...form,signOff:{...form.signOff,schoolHeadName:e.target.value}})}/></label></div><div className="visit-signoff-note">Download the filled PDF, print it, get the authorised signatures/stamp, then upload the signed copy below.</div></div>{error&&<div className="error">{error}</div>}{message&&<div className="success-message">{message}</div>}<div className="visit-bottom-actions"><button className="secondary" onClick={save} disabled={saving}>{saving?"Saving…":"Save / Submit Form"}</button><button className="secondary" onClick={download}>Download Filled PDF</button><label className="file-picker">{file?file.name:"Upload Signed PDF / Image"}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e)=>setFile(e.target.files?.[0]||null)}/></label><button className="primary" onClick={upload} disabled={uploading||!file}>{uploading?"Uploading…":"Upload Signed Form"}</button>{visit.attachment?.key&&<button className="secondary" onClick={viewAttachment}>View Attachment</button>}</div></section></OfficialShell>;
}
