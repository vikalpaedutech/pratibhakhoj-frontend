import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, unwrap } from "../../api/client";

export default function AdminDownloadStudentsData() {
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState({ examType: "", classOfStudent: "", districtId: "", blockId: "", schoolId: "" });
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("students_data.xlsx");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/regions/districts")
      .then((response) => setDistricts(Array.isArray(unwrap(response)) ? unwrap(response) : []))
      .catch((err) => setError(err.response?.data?.message || "Unable to load districts."));
  }, []);

  useEffect(() => () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  useEffect(() => {
    if (!filters.districtId) { setBlocks([]); return; }
    api.get(`/regions/blocks?districtId=${filters.districtId}`)
      .then((response) => setBlocks(Array.isArray(unwrap(response)) ? unwrap(response) : []))
      .catch(() => setBlocks([]));
  }, [filters.districtId]);

  useEffect(() => {
    if (!filters.districtId || !filters.blockId) { setSchools([]); return; }
    api.get(`/regions/schools?districtId=${filters.districtId}&blockId=${filters.blockId}`)
      .then((response) => setSchools(Array.isArray(unwrap(response)) ? unwrap(response) : []))
      .catch(() => setSchools([]));
  }, [filters.districtId, filters.blockId]);

  const update = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === "districtId" ? { blockId: "", schoolId: "" } : {}),
      ...(field === "blockId" ? { schoolId: "" } : {}),
    }));
    setDownloadUrl("");
    setMessage("");
    setError("");
  };

  const processExport = async (event) => {
    event.preventDefault();
    if (!filters.examType || processing) return;
    setProcessing(true);
    setError("");
    setMessage("");
    setDownloadUrl("");
    try {
      const response = await api.post("/students/admin-data/export", filters, {
        responseType: "blob",
        timeout: 10 * 60 * 1000,
      });
      const url = URL.createObjectURL(response.data);
      setDownloadUrl(url);
      setDownloadName(`${filters.examType}_students_data.xlsx`);
      setMessage("Student data is ready. Click Download Excel to save the file.");
    } catch (err) {
      let text = err.response?.data?.message || "Unable to process student data export.";
      if (err.response?.data instanceof Blob) {
        try { text = JSON.parse(await err.response.data.text()).message || text; } catch { /* retain fallback */ }
      }
      setError(text);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AdminShell>
      <section className="admin-page">
        <div className="page-heading">
          <div><div className="eyebrow">ADMINISTRATION</div><h1>Download Students Data</h1><p>Choose filters, process the records, then download the Excel file.</p></div>
        </div>
        <div className="panel" style={{ maxWidth: 1100 }}>
          <form className="download-students-form" onSubmit={processExport}>
            <div className="form-grid">
              <label>Exam Type *
                <select required value={filters.examType} onChange={(e) => update("examType", e.target.value)}>
                  <option value="">Select Exam Type</option><option value="MB">Mission Buniyaad (MB)</option><option value="HS100">Haryana Super 100 (HS100)</option>
                </select>
              </label>
              <label>Class Of Student
                <select value={filters.classOfStudent} onChange={(e) => update("classOfStudent", e.target.value)}>
                  <option value="">All Classes</option><option value="8">Class 8</option><option value="10">Class 10</option>
                </select>
              </label>
              <label>District
                <select value={filters.districtId} onChange={(e) => update("districtId", e.target.value)}>
                  <option value="">All Districts</option>{districts.map((item) => <option key={item._id} value={item._id}>{item.districtName}</option>)}
                </select>
              </label>
              <label>Block
                <select value={filters.blockId} disabled={!filters.districtId} onChange={(e) => update("blockId", e.target.value)}>
                  <option value="">All Blocks</option>{blocks.map((item) => <option key={item._id} value={item._id}>{item.blockName}</option>)}
                </select>
              </label>
              <label>School
                <select value={filters.schoolId} disabled={!filters.blockId} onChange={(e) => update("schoolId", e.target.value)}>
                  <option value="">All Schools</option>{schools.map((item) => <option key={item._id} value={item._id}>{item.schoolName}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 22 }}>
              <button className="primary" type="submit" disabled={!filters.examType || processing}>{processing ? "Processing…" : "Submit"}</button>
              {downloadUrl && <a className="primary" href={downloadUrl} download={downloadName} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Download Excel</a>}
            </div>
          </form>
          {error && <div className="form-error" role="alert" style={{ marginTop: 16 }}>{error}</div>}
          {message && <div className="form-success" role="status" style={{ marginTop: 16 }}>{message}</div>}
        </div>
      </section>
    </AdminShell>
  );
}
