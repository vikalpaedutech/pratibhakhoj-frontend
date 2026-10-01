import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import OfficialShell from "../components/OfficialShell";
import { api, unwrap, API_BASE_URL } from "../api/client";

const EXAMS = {
  MB: { label: "Mission Buniyaad", classOfStudent: 8 },
  HS100: { label: "Haryana Super 100", classOfStudent: 10 },
};

function allowed(items, access, level) {
  if (!access.length || access.some((item) => item.scope === "global")) return items;
  return items.filter((item) => access.some((rule) => {
    if (level === "district") return String(rule.districtId) === String(item._id) && ["district", "block", "school"].includes(rule.scope);
    const districtOk = String(rule.districtId) === String(item.districtId);
    const blockOk = String(rule.blockId) === String(item.blockId || item._id);
    if (level === "block") return (rule.scope === "district" && districtOk) || (rule.scope === "block" && districtOk && String(rule.blockId) === String(item._id)) || (rule.scope === "school" && districtOk && String(rule.blockId) === String(item._id));
    return (rule.scope === "district" && districtOk) || (rule.scope === "block" && districtOk && blockOk) || (rule.scope === "school" && String(rule.schoolId) === String(item._id));
  }));
}

export default function Level1Dashboard() {
  const { examType = "MB" } = useParams();
  const exam = EXAMS[examType] || EXAMS.MB;
  const [students, setStudents] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [access, setAccess] = useState([]);
  const [filters, setFilters] = useState({ search: "", districtId: "", blockId: "", schoolId: "" });
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const visibleDistricts = useMemo(() => allowed(districts, access, "district"), [districts, access]);
  const visibleBlocks = useMemo(() => allowed(blocks, access, "block"), [blocks, access]);
  const visibleSchools = useMemo(() => allowed(schools, access, "school"), [schools, access]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ examType, classOfStudent: String(exam.classOfStudent), limit: "100" });
      if (filters.search) params.set("search", filters.search);
      if (filters.districtId) params.set("districtId", filters.districtId);
      if (filters.blockId) params.set("blockDistrictId", filters.blockId);
      if (filters.schoolId) params.set("schoolDistrictId", filters.schoolId);
      const data = unwrap(await api.get(`/students?${params.toString()}`));
      setStudents(data.students || []);
      setSelected(new Set());
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get("/regions/my-districts"),
      api.get("/regions/my-access"),
    ]).then(([d, a]) => {
      setDistricts(Array.isArray(unwrap(d)) ? unwrap(d) : []);
      setAccess(Array.isArray(unwrap(a)) ? unwrap(a) : []);
    }).catch((e) => setError(e.response?.data?.message || "Unable to load region access."));
  }, []);

  useEffect(() => { load(); }, [examType]);

  useEffect(() => {
    if (!filters.districtId) {
      setBlocks([]);
      setSchools([]);
      return;
    }
    api.get(`/regions/my-blocks?districtId=${filters.districtId}`).then((r) => setBlocks(Array.isArray(unwrap(r)) ? unwrap(r) : [])).catch(() => setBlocks([]));
  }, [filters.districtId]);

  useEffect(() => {
    if (!filters.blockId || !filters.districtId) {
      setSchools([]);
      return;
    }
    api.get(`/regions/my-schools?districtId=${filters.districtId}&blockId=${filters.blockId}`).then((r) => setSchools(Array.isArray(unwrap(r)) ? unwrap(r) : [])).catch(() => setSchools([]));
  }, [filters.blockId, filters.districtId]);

  const allSelected = students.length > 0 && students.every((s) => selected.has(String(s._id)));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(students.map((s) => String(s._id))));
  const toggleOne = (id) => setSelected((old) => { const next = new Set(old); const key = String(id); if (next.has(key)) next.delete(key); else next.add(key); return next; });

  const bulkAck = async () => {
    if (!selected.size) return;
    try {
      const response = await api.post("/students/bulk/acknowledgements", { studentIds: [...selected], examType }, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a"); a.href = url; a.download = `${examType}-student_acknowledgements.zip`; a.click(); URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to download acknowledgements.");
    }
  };

  return (
    <OfficialShell>
      <section className="official-dashboard level1-dashboard">
        <div className="level1-panel">
          <div className="level1-toolbar-head">
            <div>
              <div className="eyebrow">LEVEL 1 · {exam.label.toUpperCase()}</div>
              <h1>{exam.label} Level 1 Dashboard</h1>
            </div>
            <button className="primary" onClick={bulkAck} disabled={!selected.size}>Download Bulk ACK</button>
          </div>

          <div className="level1-filters">
            <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search name, SRN, father" />
            <select value={filters.districtId} onChange={(e) => setFilters({ ...filters, districtId: e.target.value, blockId: "", schoolId: "" })}>
              <option value="">District</option>
              {visibleDistricts.map((d) => <option key={d._id} value={d._id}>{d.districtName}</option>)}
            </select>
            <select value={filters.blockId} disabled={!filters.districtId} onChange={(e) => setFilters({ ...filters, blockId: e.target.value, schoolId: "" })}>
              <option value="">Block</option>
              {visibleBlocks.map((b) => <option key={b._id} value={b._id}>{b.blockName}</option>)}
            </select>
            <select value={filters.schoolId} disabled={!filters.blockId} onChange={(e) => setFilters({ ...filters, schoolId: e.target.value })}>
              <option value="">School</option>
              {visibleSchools.map((s) => <option key={s._id} value={s._id}>{s.schoolName}</option>)}
            </select>
            <button className="secondary" onClick={load} disabled={loading}>{loading ? "Loading…" : "Search"}</button>
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
                  const district = student.districtId?.districtName || districts.find((d) => String(d._id) === String(student.districtId))?.districtName || "-";
                  const block = student.blockDistrictId?.blockName || blocks.find((b) => String(b._id) === String(student.blockDistrictId))?.blockName || "-";
                  const school = student.schoolDistrictId?.schoolName || schools.find((s) => String(s._id) === String(student.schoolDistrictId))?.schoolName || student.schoolNameManual || "-";
                  return <tr key={student._id}>
                    <td>{index + 1}</td><td>{student.studentSrn}</td><td>{student.name}</td><td>{student.fatherName}</td><td>{district}</td><td>{block}</td><td>{school}</td>
                    <td><Link to={`/official/register/${examType}/edit/${student.studentSrn}`}>Edit</Link></td>
                    <td><a href={`${API_BASE_URL}/students/acknowledgement/${student.slipId}`} target="_blank" rel="noreferrer">Acknowledgement</a></td>
                    <td><input type="checkbox" checked={selected.has(String(student._id))} onChange={() => toggleOne(student._id)} /></td>
                  </tr>;
                })}
                {!students.length && <tr><td colSpan="10" className="empty-row">No registrations found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </OfficialShell>
  );
}
