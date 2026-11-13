import { useEffect, useState } from "react";
import { api, unwrap } from "../api/client";
import SearchableSelect from "../components/SearchableSelect";

const SCHOOL_TYPE_OPTIONS = [
  { value: "Middle School", label: "Middle School" },
  {
    value: "OTHER_SCHOOL_TYPES",
    label: "High School, Senior Secondary School, Model Sanskriti School, Aarohi School, Other",
  },
];

export default function AttendanceSheetDlc() {
  const [districts, setDistricts] = useState([]);
  const [districtId, setDistrictId] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/attendance-sheet-dlc/districts")
      .then((response) => {
        if (active) setDistricts(unwrap(response) || []);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || "Unable to load district list.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!districtId || !schoolType) {
      setError("Please select both District and School Type.");
      return;
    }
    setDownloading(true);
    try {
      const response = await api.get("/attendance-sheet-dlc/download", {
        params: { districtId, schoolType },
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `attendance-sheets-${districts.find((d) => d._id === districtId)?.districtName || "district"}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      let message = "Unable to generate attendance sheet.";
      if (err.response?.data instanceof Blob) {
        try {
          const body = JSON.parse(await err.response.data.text());
          message = body.message || message;
        } catch {}
      } else {
        message = err.response?.data?.message || message;
      }
      setError(message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="attendance-sheet-public">
      <div className="attendance-sheet-card">
        <div className="attendance-sheet-brand">
          <img src="/haryana.png" alt="Haryana Government" />
          <div>
            <span>PRATIBHA KHOJ</span>
            <h1>Student Attendance Sheet</h1>
            <p>Mission Buniyaad / Haryana Super 100 · District Level Campaign 2027-29</p>
          </div>
          <img src="/Buniyaad.png" alt="Mission Buniyaad" />
        </div>

        <div className="attendance-sheet-intro">
          <h2>Download Attendance Sheet</h2>
          <p>Select the district and school category to download a ZIP containing a separate printable PDF for each block.</p>
        </div>

        <form onSubmit={submit} className="attendance-sheet-form">
          <label className="field">
            <span>District *</span>
            <SearchableSelect value={districtId} onChange={(event) => setDistrictId(event.target.value)} disabled={loading} required>
              <option value="">Select District</option>
              {districts.map((district) => (
                <option key={district._id} value={district._id}>{district.districtName}</option>
              ))}
            </SearchableSelect>
          </label>

          <label className="field">
            <span>School Type *</span>
            <SearchableSelect value={schoolType} onChange={(event) => setSchoolType(event.target.value)} required>
              <option value="">Select School Type</option>
              {SCHOOL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SearchableSelect>
          </label>

          {error && <div className="error attendance-sheet-error">{error}</div>}
          <button type="submit" className="primary attendance-sheet-submit" disabled={loading || downloading || !districtId || !schoolType}>
            {loading ? "Loading districts…" : downloading ? "Generating block-wise PDFs…" : "Submit & Download ZIP"}
          </button>
        </form>
        <p className="attendance-sheet-note">Student names and signatures are to be filled in manually on the printed sheet.</p>
      </div>
    </section>
  );
}
