import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api, unwrap } from "../../api/client";

export default function AdminRegions() {
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({
    districtName: "",
    districtId: "",
    blockName: "",
    blockId: "",
    schoolName: "",
    schoolCode: "",
  });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  const load = async () => {
    try {
      const [d, s] = await Promise.all([
        api.get("/regions/districts"),
        api.get("/schools"),
      ]);
      setDistricts(unwrap(d) || []);
      setSchools(unwrap(s) || []);
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to load region data.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api.post("/admin/regions", form);
      setMsg("Region added successfully.");
      setForm({
        districtName: "",
        districtId: "",
        blockName: "",
        blockId: "",
        schoolName: "",
        schoolCode: "",
      });
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to add region.");
    }
  };

  const bulk = async () => {
    if (!file || uploading) return;

    setErr("");
    setMsg("");
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("Preparing Excel file...");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const response = await api.post("/admin/regions/bulk", fd, {
        timeout: 10 * 60 * 1000,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(Math.min(percent, 100));

          if (percent < 100) {
            setUploadStatus(`Uploading Excel... ${percent}%`);
          } else {
            setUploadStatus("Upload complete. Processing rows on server...");
          }
        },
      });

      const result = unwrap(response) || {};
      setUploadProgress(100);
      setUploadStatus("Bulk region processing completed.");
      setMsg(
        `Bulk update completed. Added/updated: ${
          result.added?.length || 0
        }, Failed: ${result.errors?.length || 0}`
      );
      setFile(null);
      await load();
    } catch (e) {
      setUploadStatus("");
      setErr(e.response?.data?.message || "Bulk upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const template = async () => {
    try {
      const r = await api.get("/admin/regions/template", {
        responseType: "blob",
      });
      const u = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = u;
      a.download = "region-bulk-template.xlsx";
      a.click();
      URL.revokeObjectURL(u);
    } catch (e) {
      setErr("Unable to download template.");
    }
  };

  return (
    <AdminShell>
      <section className="dashboard">
        <div className="dash-head">
          <div>
            <div className="eyebrow">ADMINISTRATION</div>
            <h2>Add Region</h2>
            <p>
              Add district, block and school together. Regions can also be
              updated in bulk through Excel.
            </p>
          </div>
        </div>

        <form className="panel" onSubmit={submit}>
          <div className="form-grid">
            {Object.keys(form).map((key) => (
              <label className="field" key={key}>
                <span>{key} *</span>
                <input
                  value={form[key]}
                  onChange={(e) =>
                    setForm({ ...form, [key]: e.target.value })
                  }
                  required
                />
              </label>
            ))}
          </div>

          {err && <div className="error">{err}</div>}
          {msg && <div className="success-message">{msg}</div>}

          <button className="primary" disabled={uploading}>
            Add / Update Region
          </button>
        </form>

        <div className="panel">
          <h3>Bulk Region Update</h3>
          <p>
            Excel columns: districtName, districtId, blockName, blockId,
            schoolName, schoolCode.
          </p>

          <button
            className="secondary"
            type="button"
            onClick={template}
            disabled={uploading}
          >
            Download Dummy Template
          </button>{" "}

          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={uploading}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setUploadProgress(0);
              setUploadStatus("");
              setErr("");
              setMsg("");
            }}
          />{" "}

          <button
            className="primary"
            type="button"
            disabled={!file || uploading}
            onClick={bulk}
          >
            {uploading ? "Processing..." : "Upload Excel"}
          </button>

          {uploading && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span>{uploadStatus}</span>
                <span>{uploadProgress}%</span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: 10,
                  background: "#e5e7eb",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${uploadProgress}%`,
                    height: "100%",
                    background: "#28356b",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>

              <p className="muted" style={{ marginTop: 8 }}>
                Please do not close or refresh this page until processing is
                complete.
              </p>
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Schools</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>School</th>
                  <th>Code</th>
                  <th>District</th>
                  <th>Block</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((x) => (
                  <tr key={x._id}>
                    <td>{x.schoolName}</td>
                    <td>{x.schoolCode || "-"}</td>
                    <td>{x.districtId?.districtName || "-"}</td>
                    <td>{x.blockId?.blockName || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
