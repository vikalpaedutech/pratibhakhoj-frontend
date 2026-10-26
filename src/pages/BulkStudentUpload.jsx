import { useEffect, useState } from "react";
import OfficialShell from "../components/OfficialShell";
import { api, unwrap } from "../api/client";
import SearchableSelect from "../components/SearchableSelect";
import * as XLSX from "xlsx";

const EXAMS = {
  MB: { label: "Mission Buniyaad", classOfStudent: 8 },
  HS100: { label: "Haryana Super 100", classOfStudent: 10 },
};

function filterRegionItems(items, access, level, parentId = "") {
  if (!access.length || access.some((item) => item.scope === "global")) return items;
  return items.filter((item) => access.some((rule) => {
    if (level === "district") return rule.scope === "district" && String(rule.districtId) === String(item._id);
    if (level === "block") {
      const districtOk = String(rule.districtId) === String(item.districtId);
      return (rule.scope === "district" && districtOk) ||
        (rule.scope === "block" && districtOk && String(rule.blockId) === String(item._id));
    }
    if (level === "school") {
      const districtOk = String(rule.districtId) === String(item.districtId);
      const blockOk = String(rule.blockId) === String(item.blockId);
      return (rule.scope === "district" && districtOk) ||
        (rule.scope === "block" && districtOk && blockOk) ||
        (rule.scope === "school" && String(rule.schoolId) === String(item._id));
    }
    return true;
  }));
}

export default function BulkStudentUpload() {
  const [examType, setExamType] = useState("MB");
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [access, setAccess] = useState([]);
  const [form, setForm] = useState({ districtId: "", blockId: "", schoolId: "", count: "" });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [countTouched, setCountTouched] = useState(false);

  // Region endpoints are already access-scoped on the backend.
  // Keep the UI as a simple projection of the user's regionAccess.
  const availableDistricts = districts;
  const availableBlocks = blocks;
  const availableSchools = schools;

  useEffect(() => {
    Promise.all([
      api.get("/regions/my-districts"),
      api.get("/regions/my-access"),
    ]).then(([districtResponse, accessResponse]) => {
      setDistricts(Array.isArray(unwrap(districtResponse)) ? unwrap(districtResponse) : []);
      setAccess(Array.isArray(unwrap(accessResponse)) ? unwrap(accessResponse) : []);
    }).catch((e) => setErr(e.response?.data?.message || "Unable to load region access."));
  }, []);

  const onDistrict = async (event) => {
    const districtId = event.target.value;
    setForm((f) => ({ ...f, districtId, blockId: "", schoolId: "" }));
    setBlocks([]);
    setSchools([]);
    if (!districtId) return;
    try {
      const response = await api.get(`/regions/my-blocks?districtId=${districtId}`);
      setBlocks(Array.isArray(unwrap(response)) ? unwrap(response) : []);
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to load blocks.");
    }
  };

  const onBlock = async (event) => {
    const blockId = event.target.value;
    setForm((f) => ({ ...f, blockId, schoolId: "" }));
    setSchools([]);
    if (!blockId || !form.districtId) return;
    try {
      const response = await api.get(`/regions/my-schools?districtId=${form.districtId}&blockId=${blockId}`);
      setSchools(Array.isArray(unwrap(response)) ? unwrap(response) : []);
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to load schools.");
    }
  };

  const download = async () => {
    setErr("");
    setMsg("");
    setCountTouched(true);
    if (!form.count || !Number.isInteger(Number(form.count)) || Number(form.count) < 1 || Number(form.count) > 500) {
      setErr("No. of students is mandatory. Enter a number from 1 to 500.");
      return;
    }
    try {
      const payload = {
        districtId: form.districtId,
        blockId: form.blockId,
        schoolDistrictId: form.schoolId,
        schoolEntry: "db",
        classOfStudent: EXAMS[examType].classOfStudent,
        count: Number(form.count),
      };
      const response = await api.post("/students/bulk/template", payload, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${examType}-class-${EXAMS[examType].classOfStudent}-student-registration-template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Template downloaded successfully.");
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to download template.");
    }
  };

  const downloadFailureLog = () => {
    if (!result?.errors?.length) return;

    // Keep the same columns and order as the uploaded template, with
    // "Failed Reason" added as the first column.
    const templateHeaders = Object.keys(result.errors.find((item) => item.data)?.data || {})
      // A previous failed-log file may itself contain this helper column.
      // Never duplicate it or let its placeholder overwrite the real error.
      .filter((header) => String(header).trim().toLowerCase() !== "failed reason");

    const headers = ["Failed Reason", ...templateHeaders];
    const rows = result.errors.map((item) => {
      const sourceRow = item.data || {};
      const row = { "Failed Reason": item.message || "Validation failed" };
      templateHeaders.forEach((header) => {
        row[header] = sourceRow[header] ?? "";
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    worksheet["!cols"] = [
      { wch: 42 },
      ...templateHeaders.map((header) => ({ wch: Math.max(14, Math.min(30, String(header).length + 3)) })),
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Registrations");
    XLSX.writeFile(workbook, `${examType}-bulk-failed-rows.xlsx`);
  };

  const upload = async () => {
    setErr("");
    setMsg("");
    setResult(null);
    if (!file) return setErr("Select an Excel file.");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("examType", examType);
      const data = unwrap(await api.post("/students/bulk", fd, { headers: { "Content-Type": "multipart/form-data" } }));
      setResult(data);
      setMsg(`Upload completed. Created: ${data.created?.length || 0}, Updated: ${data.updated?.length || 0}, Failed: ${data.errors?.length || 0}.`);
    } catch (e) {
      setErr(e.response?.data?.message || "Bulk upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const readyForTemplate = Boolean(form.districtId && form.blockId && form.schoolId && form.count && Number(form.count) >= 1 && Number(form.count) <= 500);

  return (
    <OfficialShell>
      <section className="bulk-page">\n        <style>{`.input-invalid { border: 1px solid #dc2626 !important; box-shadow: 0 0 0 1px #dc2626; } .field-error { color: #dc2626; display: block; margin-top: 4px; font-size: 12px; }`}</style>
        <div className="workspace-title">
          <div>
            <div className="eyebrow">BULK REGISTRATION</div>
            <h1>Bulk Registration</h1>
            <p>Select the examination first, then select a region and download the prefilled template.</p>
          </div>
        </div>

        <div className="bulk-panel">
          <div className="form-grid">
            <label className="field">
              <span>Examination *</span>
              <SearchableSelect value={examType} onChange={(e) => setExamType(e.target.value)}>
                <option value="MB">Mission Buniyaad · Class 8</option>
                <option value="HS100">Haryana Super 100 · Class 10</option>
              </SearchableSelect>
            </label>
            <label className="field">
              <span>No. of students *</span>
              <input type="number" min="1" max="500" value={form.count} placeholder="Enter number of students" className={countTouched && (!form.count || Number(form.count) < 1 || Number(form.count) > 500 || !Number.isInteger(Number(form.count))) ? "input-invalid" : ""} aria-invalid={countTouched && !form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />{countTouched && !form.count && <small className="field-error">Mandatory field</small>}
            </label>
            <label className="field">
              <span>Select District *</span>
              <SearchableSelect value={form.districtId} onChange={onDistrict}>
                <option value="">Select district</option>
                {availableDistricts.map((d) => <option key={d._id} value={d._id}>{d.districtName}</option>)}
              </SearchableSelect>
            </label>
            <label className="field">
              <span>Select Block *</span>
              <SearchableSelect value={form.blockId} onChange={onBlock} disabled={!form.districtId}>
                <option value="">Select block</option>
                {availableBlocks.map((b) => <option key={b._id} value={b._id}>{b.blockName}</option>)}
              </SearchableSelect>
            </label>
            <label className="field">
              <span>Select School *</span>
              <SearchableSelect value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })} disabled={!form.blockId}>
                <option value="">Select school</option>
                {availableSchools.map((s) => <option key={s._id} value={s._id}>{s.schoolName}</option>)}
              </SearchableSelect>
            </label>
          </div>

          <p className="bulk-note">If school is not in dropdown then contact on helpline number.</p>

          <div className="bulk-actions">
            <button className="secondary" onClick={download} disabled={!(form.districtId && form.blockId && form.schoolId)}>Download Template</button>
            <label className="file-picker">{file ? file.name : "Upload Template"}<input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
            <button className="primary" onClick={upload} disabled={loading}>{loading ? "Submitting…" : "Submit"}</button>
          </div>

          <div className="bulk-note">
            The downloaded template contains district, block and school values prefilled. Enter student details in the rows and upload the same template. Existing registrations created by your account can be updated through bulk upload; verified registrations and registrations created by another user are not overwritten.
          </div>

          {msg && <div className="success-message">{msg}</div>}
          {err && <div className="error">{err}</div>}

          {result?.errors?.length > 0 && (
            <div className="bulk-result-panel">
              <strong>Failed rows: {result.errors.length} — download the report to see each Failed reason.</strong>
              <button className="secondary" type="button" onClick={downloadFailureLog}>Download Failed Log</button>
            </div>
          )}
        </div>
      </section>
    </OfficialShell>
  );
}
