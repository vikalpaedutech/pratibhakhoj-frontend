import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import OfficialShell from "../components/OfficialShell";
import { api, unwrap, API_BASE_URL } from "../api/client";
import { allRegistrationCodeFor } from "../config/dashboardAccess";
import { useAuth } from "../context/AuthContext";
import SearchableSelect from "../components/SearchableSelect";

const EXAMS = {
  MB: { label: "Mission Buniyaad", classOfStudent: 8 },
  HS100: { label: "Haryana Super 100", classOfStudent: 10 },
};

export default function AllRegistrationsDashboard() {
  const { examType = "MB" } = useParams();
  const location = useLocation();
  const code = String(examType).toUpperCase();
  const exam = EXAMS[code] || EXAMS.MB;
  const requiredAccess = allRegistrationCodeFor(code);
  const { role, dashboardAccess = [], loading: authLoading } = useAuth();
  const isAllowed = role?.code === "ADMIN" || dashboardAccess.includes(requiredAccess);

  const [students, setStudents] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState(() => location.state?.returnFilters || { search: "", districtId: "", blockId: "", schoolId: "" });
  const [selected, setSelected] = useState(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => location.state?.returnPage || 1);
  const pageSize = 50;
  const [deletingId, setDeletingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkAckLoading, setBulkAckLoading] = useState(false);
  const [error, setError] = useState("");

  const districtMap = useMemo(() => new Map(districts.map((item) => [String(item._id), item])), [districts]);
  const blockMap = useMemo(() => new Map(blocks.map((item) => [String(item._id), item])), [blocks]);
  const schoolMap = useMemo(() => new Map(schools.map((item) => [String(item._id), item])), [schools]);

  const load = async (activeFilters = filters) => {
    if (!isAllowed) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ examType: code, limit: String(pageSize), page: String(page) });
      if (activeFilters.search.trim()) params.set("search", activeFilters.search.trim());
      if (activeFilters.districtId) params.set("districtId", activeFilters.districtId);
      if (activeFilters.blockId) params.set("blockDistrictId", activeFilters.blockId);
      if (activeFilters.schoolId) params.set("schoolDistrictId", activeFilters.schoolId);

      const data = unwrap(await api.get(`/students/all-registrations/${code}?${params.toString()}`)) || {};
      setStudents(data.students || []);
      setTotal(data.pagination?.total || 0);
      setSelected(new Set());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load all registrations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.returnFilters) {
      setFilters(location.state.returnFilters);
      setPage(location.state.returnPage || 1);
    }
  }, [location.key]);

  useEffect(() => {
    if (authLoading || !isAllowed) return;
    api.get("/regions/districts")
      .then((districtResponse) => {
        setDistricts(Array.isArray(unwrap(districtResponse)) ? unwrap(districtResponse) : []);
      })
      .catch((err) => setError(err.response?.data?.message || "Unable to load region filters."));
  }, [authLoading, isAllowed]);

  useEffect(() => {
    if (!authLoading && isAllowed) load();
  }, [authLoading, isAllowed, code, page]);

  useEffect(() => {
    if (!filters.districtId) {
      setBlocks([]);
      setSchools([]);
      return;
    }
    api.get(`/regions/blocks?districtId=${filters.districtId}`)
      .then((response) => setBlocks(Array.isArray(unwrap(response)) ? unwrap(response) : []))
      .catch(() => setBlocks([]));
  }, [filters.districtId]);

  useEffect(() => {
    if (!filters.districtId || !filters.blockId) {
      setSchools([]);
      return;
    }
    api.get(`/regions/schools?districtId=${filters.districtId}&blockId=${filters.blockId}`)
      .then((response) => setSchools(Array.isArray(unwrap(response)) ? unwrap(response) : []))
      .catch(() => setSchools([]));
  }, [filters.districtId, filters.blockId]);

  const allSelected = students.length > 0 && students.every((student) => selected.has(String(student._id)));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(students.map((student) => String(student._id))));
  const toggleOne = (id) => setSelected((current) => {
    const next = new Set(current);
    const key = String(id);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const deleteRegistration = async (student) => {
    const confirmed = window.confirm(`Delete registration for ${student.name} (SRN: ${student.studentSrn})?`);
    if (!confirmed) return;
    setDeletingId(String(student._id));
    setError("");
    try {
      await api.delete(`/students/all-registrations/${student._id}?examType=${code}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete registration.");
    } finally { setDeletingId(""); }
  };


  const bulkAck = async () => {
    if (!selected.size || bulkAckLoading) return;
    setBulkAckLoading(true);
    setError("");
    try {
      const response = await api.post(
        "/students/bulk/acknowledgements",
        { studentIds: [...selected], examType: code, allRegistrations: true },
        { responseType: "blob", timeout: 120000 }
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${code}-student_acknowledgements.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      let message = "Unable to download acknowledgements.";
      if (err.response?.data instanceof Blob) { try { const payload = JSON.parse(await err.response.data.text()); message = payload.message || message; } catch {} }
      else message = err.response?.data?.message || message;
      setError(message);
    } finally { setBulkAckLoading(false); }
  };

  if (authLoading) return <div className="loading">Loading dashboard access…</div>;

  return (
    <OfficialShell>
      <section className="official-dashboard level1-dashboard">
        <div className="level1-panel">
          <div className="level1-toolbar-head">
            <div>
              <div className="eyebrow">{exam.label.toUpperCase()} · ALL REGISTRATIONS</div>
              <h1>{exam.label} Registrations</h1>
              {/* <p className="dashboard-access-inherited-note">This screen is independent of region access and shows all active registrations for this examination.</p> */}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="primary" onClick={bulkAck} disabled={!selected.size || !isAllowed || bulkAckLoading}>
                {bulkAckLoading ? <><span className="button-spinner" aria-hidden="true" />Preparing slips…</> : "Download All Slip"}
              </button>
            </div>
          </div>

          {!isAllowed ? (
            <div className="panel">
              <div className="eyebrow">ACCESS CONTROL</div>
              <h2>Registration screen access required</h2>
              <p>You do not currently have access to all {exam.label} registrations. Please contact an administrator.</p>
            </div>
          ) : (
            <>
              <div className="level1-filters">
                <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search name, SRN, father" />
                <SearchableSelect value={filters.districtId} onChange={(e) => setFilters({ ...filters, districtId: e.target.value, blockId: "", schoolId: "" })}>
                  <option value="">District</option>
                  {districts.map((district) => <option key={district._id} value={district._id}>{district.districtName}</option>)}
                </SearchableSelect>
                <SearchableSelect value={filters.blockId} disabled={!filters.districtId} onChange={(e) => setFilters({ ...filters, blockId: e.target.value, schoolId: "" })}>
                  <option value="">Block</option>
                  {blocks.map((block) => <option key={block._id} value={block._id}>{block.blockName}</option>)}
                </SearchableSelect>
                <SearchableSelect value={filters.schoolId} disabled={!filters.blockId} onChange={(e) => setFilters({ ...filters, schoolId: e.target.value })}>
                  <option value="">School</option>
                  {schools.map((school) => <option key={school._id} value={school._id}>{school.schoolName}</option>)}
                </SearchableSelect>
                <button className="secondary" onClick={() => { if (page === 1) load(); else setPage(1); }} disabled={loading}>{loading ? "Loading…" : "Search"}</button>
                <button className="secondary" onClick={() => {
                  const cleared = { search: "", districtId: "", blockId: "", schoolId: "" };
                  setFilters(cleared); setPage(1);
                  if (page === 1) load(cleared);
                }} disabled={loading}>Clear Filters</button>
              </div>

              <div className="dashboard-access-inherited-note" style={{ marginBottom: "12px" }}>
                Total registrations: <strong>{total}</strong>
              </div>

              {error && <div className="error">{error}</div>}

              <div className="table-wrap level1-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>SRN</th><th>STUDENT</th><th>FATHER</th><th>DISTRICT</th><th>BLOCK</th><th>SCHOOL</th><th>ACTION</th><th>DOWNLOAD</th><th><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const district = student.districtId?.districtName || districtMap.get(String(student.districtId))?.districtName || "-";
                      const block = student.blockDistrictId?.blockName || blockMap.get(String(student.blockDistrictId))?.blockName || "-";
                      const school = student.schoolDistrictId?.schoolName || schoolMap.get(String(student.schoolDistrictId))?.schoolName || student.schoolNameManual || "-";
                      return (
                        <tr key={student._id}>
                          <td>{(page - 1) * pageSize + index + 1}</td>
                          <td>{student.studentSrn}</td>
                          <td>{student.name}</td>
                          <td>{student.fatherName}</td>
                          <td>{district}</td>
                          <td>{block}</td>
                          <td>{school}</td>
                          <td>
                            <><Link to={`/official/registrations/${code}/edit/${student._id}`} state={{ returnFilters: filters, returnPage: page }}>Edit</Link>{" "}<button type="button" className="danger" disabled={deletingId === String(student._id)} onClick={() => deleteRegistration(student)}>{deletingId === String(student._id) ? "Deleting…" : "Delete"}</button></>
                          </td>
                          <td>
                            <a href={`${API_BASE_URL}/students/acknowledgement/${student.slipId}`} target="_blank" rel="noreferrer">Acknowledgement</a>
                          </td>
                          <td><input type="checkbox" checked={selected.has(String(student._id))} onChange={() => toggleOne(student._id)} /></td>
                        </tr>
                      );
                    })}
                    {!loading && !students.length && <tr><td colSpan="10" className="empty-row">No registrations found.</td></tr>}
                    {loading && <tr><td colSpan="10" className="empty-row">Loading registrations…</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="level1-toolbar-head" style={{ marginTop: "14px", alignItems: "center" }}>
                <span>Showing {total ? ((page - 1) * pageSize + 1) : 0}–{Math.min(page * pageSize, total)} of {total} registrations</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button type="button" className="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
                  <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
                  <button type="button" className="secondary" disabled={page >= Math.ceil(total / pageSize) || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </OfficialShell>
  );
}
