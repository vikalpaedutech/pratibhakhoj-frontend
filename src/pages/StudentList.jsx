import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, unwrap, API_BASE_URL } from "../api/client";
import OfficialShell from "../components/OfficialShell";

export default function StudentList() {
  const [data, setData] = useState({ students: [], pagination: {} });
  const [search, setSearch] = useState("");
  const [examType, setExamType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (examType) params.set("examType", examType);

      setData(unwrap(await api.get(`/students?${params.toString()}`)));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <OfficialShell>
      <section className="dashboard">
      <div className="dash-head">
        <div>
          <div className="eyebrow">STUDENTS</div>
          <h2>Registration management</h2>
          <p>Only students within your assigned region access are shown.</p>
        </div>
        <Link className="secondary" to="/official">Dashboard</Link>
      </div>

      <div className="toolbar">
        <input
          placeholder="Search SRN, name or acknowledgement ID"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={examType} onChange={(event) => setExamType(event.target.value)}>
          <option value="">All examinations</option>
          <option value="MB">Mission Buniyaad</option>
          <option value="HS100">Haryana Super 100</option>
        </select>
        <button className="primary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Search"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SRN</th>
              <th>Name</th>
              <th>Exam</th>
              <th>Class</th>
              <th>Status</th>
              <th>Acknowledgement</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((student) => (
              <tr key={student._id}>
                <td>{student.studentSrn}</td>
                <td>{student.name}</td>
                <td>{student.examType}</td>
                <td>{student.classOfStudent}</td>
                <td>
                  <span className={`status ${student.isVerified ? "ok" : "pending"}`}>
                    {student.isVerified ? "Verified" : "Pending"}
                  </span>
                </td>
                <td>
                  <a
                    href={`${API_BASE_URL}/students/acknowledgement/${student.slipId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}

            {!data.students.length && (
              <tr>
                <td colSpan="6" className="empty-row">No students found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </section>
    </OfficialShell>
  );
}
