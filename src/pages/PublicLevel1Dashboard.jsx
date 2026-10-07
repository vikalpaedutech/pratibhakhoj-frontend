import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminShell from "../components/AdminShell";
import OfficialShell from "../components/OfficialShell";
import { api, unwrap } from "../api/client";
import PortalHeader from "../components/PortalHeader";
import PortalFooter from "../components/PortalFooter";
import { LEVEL1_DASHBOARDS, dashboardCodeFor } from "../config/dashboardAccess";

const EXAMS = {
  MB: { label: "Mission Buniyaad", classLabel: "Class 8" },
  HS100: { label: "Haryana Super 100", classLabel: "Class 10" },
};

function DashboardAccessDenied({ dashboard }) {
  const { role } = useAuth();
  const Shell = role?.code === "ADMIN" ? AdminShell : OfficialShell;
  const content = (
    <section className="public-level1-page">
      <div className="panel">
        <div className="eyebrow">ACCESS CONTROL</div>
        <h2>Dashboard Access Required</h2>
        <p>You do not currently have access to {dashboard?.title || "this dashboard"}. Please contact an administrator if access is required.</p>
        <Link className="secondary" to="/official">Back to Dashboard</Link>
      </div>
    </section>
  );
  return <Shell>{content}</Shell>;
}

function DashboardCards() {
  const { user, role, dashboardAccess = [] } = useAuth();
  const visibleDashboards = role?.code === "ADMIN"
    ? LEVEL1_DASHBOARDS
    : LEVEL1_DASHBOARDS.filter((item) => dashboardAccess.includes(item.code));
  const [counts, setCounts] = useState({ MB: 0, HS100: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const canViewExam = (examType) =>
      !user || role?.code === "ADMIN" || visibleDashboards.some((item) => item.examType === examType);

    const requests = ["MB", "HS100"].map((examType) =>
      canViewExam(examType)
        ? api.get(`/students/public-level1-dashboard/${examType}`).then((response) => [examType, unwrap(response) || {}])
        : Promise.resolve([examType, null])
    );

    Promise.all(requests).then((results) => {
      if (cancelled) return;
      const nextCounts = { MB: 0, HS100: 0 };
      results.forEach(([examType, data]) => {
        nextCounts[examType] = data?.totalRegistrations || 0;
      });
      setCounts(nextCounts);
    }).catch(() => {
      if (!cancelled) setCounts({ MB: 0, HS100: 0 });
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, role, dashboardAccess.join(",")]);

  const content = (
    <section className="public-level1-page">
      <div className="public-level1-intro">
        <div className="eyebrow">LEVEL 1 DASHBOARDS</div>
        <h1>Registration Dashboards</h1>
        <p>Choose an examination to view registration data.</p>
      </div>

      {user && role?.code !== "ADMIN" && !visibleDashboards.length ? (
        <div className="panel">
          <div className="eyebrow">ACCESS CONTROL</div>
          <h2>No Level 1 dashboards assigned</h2>
          <p>An administrator must grant dashboard access before these dashboards appear for your account.</p>
        </div>
      ) : (
        <section className="public-dashboard-cards">
          {Object.entries(EXAMS).map(([code, exam], index) => {
            const examDashboards = user && role?.code !== "ADMIN"
              ? visibleDashboards.filter((item) => item.examType === code)
              : LEVEL1_DASHBOARDS.filter((item) => item.examType === code);

            if (user && role?.code !== "ADMIN" && !examDashboards.length) return null;

            return (
              <div key={code} className="public-dashboard-card">
                <span className="public-dashboard-number">0{index + 1}</span>
                <strong>{exam.label}</strong>
                <span>{exam.classLabel}</span>
                <span className="public-dashboard-total">Total Registrations: {loading ? "…" : counts[code]}</span>
                <div className="public-dashboard-card-links">
                  {examDashboards.map((item) => (
                    <Link key={item.code} to={item.path}>
                      {item.view === "district" ? "District-Block Dashboard" : item.view === "block-school" ? "Block-School Dashboard" : "School Level Dashboard"} →
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </section>
  );

  return <DashboardRootShell>{content}</DashboardRootShell>;
}

export default function PublicLevel1Dashboard() {
  const { examType, view } = useParams();
  const { user, role, loading: authLoading, dashboardAccess = [] } = useAuth();
  if (!examType) return <DashboardCards />;

  const code = String(examType).toUpperCase();
  const exam = EXAMS[code];
  if (!exam) return <DashboardCards />;

  if (authLoading && user) return <div className="loading">Loading dashboard access…</div>;

  const requiredAccess = dashboardCodeFor(code, view);
  const hasAccess = !user || role?.code === "ADMIN" || dashboardAccess.includes(requiredAccess);
  if (!hasAccess) {
    return (
      <DashboardAccessDenied dashboard={LEVEL1_DASHBOARDS.find((item) => item.code === requiredAccess)} />
    );
  }

  if (view === "block-school") return <BlockSchoolDashboard examType={code} exam={exam} />;
  if (view === "school") return <SchoolDashboard examType={code} exam={exam} />;
  return <DistrictBlockDashboard examType={code} exam={exam} />;
}

function DashboardNav({ examType, current }) {
  const { user, role, dashboardAccess = [] } = useAuth();
  const allLinks = [
    ["district", "District-Block Dashboard"],
    ["block-school", "Block-School Dashboard"],
    ["school", "School Level Dashboard"],
  ];
  const links = !user || role?.code === "ADMIN"
    ? allLinks
    : allLinks.filter(([view]) => dashboardAccess.includes(dashboardCodeFor(examType, view)));

  return (
    <div className="public-dashboard-nav">
      {links.map(([view, label]) => (
        <Link
          key={view}
          to={view === "district" ? `/dashboards-level-1/${examType}` : `/dashboards-level-1/${examType}/${view}`}
          className={current === view ? "active" : ""}
        >
          {label} →
        </Link>
      ))}
    </div>
  );
}

function DistrictBlockDashboard({ examType, exam }) {
  const [districts, setDistricts] = useState([]);
  const [total, setTotal] = useState(0);
  const [openDistricts, setOpenDistricts] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/students/public-level1-dashboard/${examType}`)
      .then((response) => {
        if (cancelled) return;
        const data = unwrap(response) || {};
        const rows = data.districts || [];
        setDistricts(rows);
        setTotal(data.totalRegistrations || 0);
        setOpenDistricts(new Set());
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "Unable to load dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [examType]);

  const toggleDistrict = (id) => {
    setOpenDistricts((current) => {
      const next = new Set(current);
      const key = String(id);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const expandAll = () => setOpenDistricts(new Set(districts.map((district) => String(district._id))));
  const collapseAll = () => setOpenDistricts(new Set());

  return (
    <DashboardShell examType={examType} exam={exam} current="district">
      <div className="public-level1-summary public-level1-summary-single">
        <div><span>Total Registrations</span><strong>{total}</strong></div>
      </div>

      <div className="public-level1-actions">
        <button className="secondary" onClick={collapseAll} disabled={!districts.length}>District Wise</button>
        <button className="secondary" onClick={expandAll} disabled={!districts.length}>Block Wise</button>
      </div>

      {loading && <div className="loading">Loading dashboard…</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <section className="district-accordion-list">
          {districts.map((district, districtIndex) => {
            const isOpen = openDistricts.has(String(district._id));
            return (
              <div className="district-accordion" key={district._id}>
                <button className="district-accordion-head" onClick={() => toggleDistrict(district._id)}>
                  <span className="district-accordion-title">
                    <span className="district-serial">{districtIndex + 1}</span>
                    <span className="district-accordion-name">
                      <strong>{district.districtName}</strong>
                      <small>Total Registration Count: {district.count}</small>
                    </span>
                  </span>
                  <span className={`district-chevron ${isOpen ? "open" : ""}`}>⌄</span>
                </button>

                {isOpen && (
                  <div className="district-accordion-body">
                    <table className="public-dashboard-table">
                      <thead><tr><th>#</th><th>Block Name</th><th>Count</th></tr></thead>
                      <tbody>
                        {district.blocks.map((block, blockIndex) => (
                          <tr key={block._id}>
                            <td>{blockIndex + 1}</td><td>{block.blockName}</td><td>{block.count}</td>
                          </tr>
                        ))}
                        {!district.blocks.length && <tr><td colSpan="3" className="empty-row">No blocks available.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </DashboardShell>
  );
}

function BlockSchoolDashboard({ examType, exam }) {
  const [blocks, setBlocks] = useState([]);
  const [total, setTotal] = useState(0);
  const [openBlocks, setOpenBlocks] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.get(`/students/public-level1-block-school-dashboard/${examType}`)
      .then((response) => {
        if (cancelled) return;
        const data = unwrap(response) || {};
        const rows = data.blocks || [];
        setBlocks(rows);
        setTotal(data.totalRegistrations || 0);
        setOpenBlocks(new Set());
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "Unable to load dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [examType]);

  const toggle = (id) => setOpenBlocks((current) => {
    const next = new Set(current); const key = String(id);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const expandAll = () => setOpenBlocks(new Set(blocks.map((block) => String(block._id))));
  const collapseAll = () => setOpenBlocks(new Set());

  return (
    <DashboardShell examType={examType} exam={exam} current="block-school">
      <div className="public-level1-summary public-level1-summary-single">
        <div><span>Total Registrations</span><strong>{total}</strong></div>
      </div>
      <div className="public-level1-actions">
        <button className="secondary" onClick={collapseAll} disabled={!blocks.length}>Block Wise</button>
        <button className="secondary" onClick={expandAll} disabled={!blocks.length}>School Wise</button>
      </div>
      {loading && <div className="loading">Loading dashboard…</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <section className="district-accordion-list">
          {blocks.map((block, blockIndex) => {
            const isOpen = openBlocks.has(String(block._id));
            return (
              <div className="district-accordion" key={block._id}>
                <button className="district-accordion-head" onClick={() => toggle(block._id)}>
                  <span className="district-accordion-title">
                    <span className="district-serial">{blockIndex + 1}</span>
                    <span className="district-accordion-name">
                      <strong>{block.blockName}</strong>
                      <small>Total Registration Count: {block.count}</small>
                    </span>
                  </span>
                  <span className={`district-chevron ${isOpen ? "open" : ""}`}>⌄</span>
                </button>
                {isOpen && (
                  <div className="district-accordion-body">
                    <table className="public-dashboard-table">
                      <thead><tr><th>#</th><th>School Name</th><th>Count</th></tr></thead>
                      <tbody>
                        {block.schools.map((school, schoolIndex) => (
                          <tr key={school._id}><td>{schoolIndex + 1}</td><td>{school.schoolName}</td><td>{school.count}</td></tr>
                        ))}
                        {!block.schools.length && <tr><td colSpan="3" className="empty-row">No school registrations.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </DashboardShell>
  );
}

function SchoolDashboard({ examType, exam }) {
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState({ districtId: "", blockId: "", schoolId: "" });
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [error, setError] = useState("");
  const [image, setImage] = useState(null);

  useEffect(() => {
    api.get("/regions/districts")
      .then((response) => setDistricts(unwrap(response) || []))
      .catch((err) => setError(err.response?.data?.message || "Unable to load districts."))
      .finally(() => setLoadingRegions(false));
  }, []);

  useEffect(() => {
    if (!filters.districtId) {
      setBlocks([]); setSchools([]); setFilters((old) => ({ ...old, blockId: "", schoolId: "" })); return;
    }
    api.get(`/regions/blocks?districtId=${filters.districtId}`)
      .then((response) => setBlocks(unwrap(response) || []))
      .catch(() => setBlocks([]));
  }, [filters.districtId]);

  useEffect(() => {
    if (!filters.districtId || !filters.blockId) {
      setSchools([]); setFilters((old) => ({ ...old, schoolId: "" })); return;
    }
    api.get(`/regions/schools?districtId=${filters.districtId}&blockId=${filters.blockId}`)
      .then((response) => setSchools(unwrap(response) || []))
      .catch(() => setSchools([]));
  }, [filters.districtId, filters.blockId]);

  const selectedDistrict = useMemo(() => districts.find((item) => String(item._id) === String(filters.districtId)), [districts, filters.districtId]);
  const selectedBlock = useMemo(() => blocks.find((item) => String(item._id) === String(filters.blockId)), [blocks, filters.blockId]);

  const loadStudents = async () => {
    if (!filters.schoolId) {
      setStudents([]); setTotal(0); return;
    }
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams(filters);
      const data = unwrap(await api.get(`/students/public-level1-school-dashboard/${examType}?${params.toString()}`)) || {};
      setStudents(data.students || []); setTotal(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load school registrations.");
      setStudents([]); setTotal(0);
    } finally { setLoading(false); }
  };

  return (
    <DashboardShell examType={examType} exam={exam} current="school">
      <div className="school-dashboard-filter-card">
        <div className="public-filter-field"><label>District</label><select value={filters.districtId} onChange={(e) => setFilters({ districtId: e.target.value, blockId: "", schoolId: "" })}><option value="">Select District</option>{districts.map((d) => <option key={d._id} value={d._id}>{d.districtName}</option>)}</select></div>
        <div className="public-filter-field"><label>Block</label><select value={filters.blockId} disabled={!filters.districtId} onChange={(e) => setFilters((old) => ({ ...old, blockId: e.target.value, schoolId: "" }))}><option value="">Select Block</option>{blocks.map((b) => <option key={b._id} value={b._id}>{b.blockName}</option>)}</select></div>
        <div className="public-filter-field"><label>School</label><select value={filters.schoolId} disabled={!filters.blockId} onChange={(e) => setFilters((old) => ({ ...old, schoolId: e.target.value }))}><option value="">Select School</option>{schools.map((s) => <option key={s._id} value={s._id}>{s.schoolName}</option>)}</select></div>
        <button className="primary public-filter-button" onClick={loadStudents} disabled={loading || loadingRegions || !filters.schoolId}>{loading ? "Loading…" : "View Students"}</button>
      </div>

      {!filters.schoolId && !loading && <div className="public-dashboard-empty">Select District, Block and School to view registered students.</div>}
      {error && <div className="error">{error}</div>}
      {filters.schoolId && !loading && !error && (
        <>
          <div className="public-level1-summary public-level1-summary-single">
            <div><span>Registered Students</span><strong>{total}</strong><small>{selectedDistrict?.districtName || "-"} · {selectedBlock?.blockName || "-"}</small></div>
          </div>
          <div className="public-table-card">
            <table className="public-dashboard-table public-student-table">
              <thead><tr><th>#</th><th>SRN</th><th>Name</th><th>Father</th><th>District</th><th>Block</th><th>School</th><th>Student Image</th></tr></thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student._id}>
                    <td>{index + 1}</td><td>{student.studentSrn}</td><td>{student.name}</td><td>{student.fatherName}</td><td>{student.districtName}</td><td>{student.blockName}</td><td>{student.schoolName}</td>
                    <td>{student.studentImage ? <button className="image-preview-button" onClick={() => setImage(student.studentImage)}><img src={student.studentImage} alt={student.name} /></button> : <span>-</span>}</td>
                  </tr>
                ))}
                {!students.length && <tr><td colSpan="8" className="empty-row">No registered students found for this school.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {image && <div className="public-image-modal" onClick={() => setImage(null)}><div className="public-image-modal-inner" onClick={(e) => e.stopPropagation()}><button onClick={() => setImage(null)}>×</button><img src={image} alt="Student preview" /></div></div>}
    </DashboardShell>
  );
}

function DashboardRootShell({ children }) {
  const { user, role } = useAuth();

  if (user) {
    const Shell = role?.code === "ADMIN" ? AdminShell : OfficialShell;
    return <Shell>{children}</Shell>;
  }

  return (
    <div className="public-page public-level1-page-shell">
      <PortalHeader />
      <div className="public-home-bar public-dashboard-home-bar">
        <Link className="public-home-text-link" to="/">← Home</Link>
      </div>
      {children}
      <PortalFooter />
    </div>
  );
}

function DashboardShell({ examType, exam, current, children }) {
  const { user, role, dashboardAccess = [] } = useAuth();
  const isAdmin = role?.code === "ADMIN";
  const canExport = Boolean(user && (isAdmin || dashboardAccess.includes(dashboardCodeFor(examType, current))));

  const downloadExport = async () => {
    try {
      const response = await api.get(
        `/students/public-level1-dashboard/${examType}/export?view=${current === "district" ? "district-block" : "block-school"}`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${examType}_${current === "district" ? "district_block" : "block_school"}_report.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error.response?.data?.message || "Unable to download report.";
      alert(message);
    }
  };

  const dashboardLabel =
    current === "district"
      ? "District-Block Dashboard"
      : current === "block-school"
        ? "Block-School Dashboard"
        : "School Level Dashboard";

  const content = (
    <section className="public-level1-page">
      <div className="public-level1-detail-head public-dashboard-detail-head">
        <div>
          <div className="eyebrow">LEVEL 1 · {exam.label.toUpperCase()}</div>
          <h1>{exam.label} · {dashboardLabel}</h1>
          <p>{exam.classLabel} registration dashboard.</p>
        </div>
        <div className="public-dashboard-detail-actions">
          {canExport && current !== "school" && (
            <button className="primary" onClick={downloadExport}>Download Excel</button>
          )}
          <Link className="secondary" to="/dashboards-level-1">← Back</Link>
        </div>
      </div>
      {children}
    </section>
  );

  if (user) {
    const Shell = role?.code === "ADMIN" ? AdminShell : OfficialShell;
    return <Shell>{content}</Shell>;
  }

  return (
    <div className="public-page public-level1-page-shell">
      <PortalHeader />
      <div className="public-home-bar public-dashboard-home-bar">
        <Link className="public-home-text-link" to="/">← Home</Link>
      </div>
      {content}
      <PortalFooter />
    </div>
  );
}
