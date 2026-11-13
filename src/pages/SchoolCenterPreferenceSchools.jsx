import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminShell from "../components/AdminShell";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function SchoolCenterPreferenceSchools() {
  const { permissions = [], role } = useAuth();
  const canAccess = role?.code === "ADMIN" || permissions.includes("SCHOOL_CENTER_PREFERENCE");
  const { centerId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setBusy(true);
    api.get(`/examination-centers/centers/${centerId}/schools`)
      .then(response => { if (active) setData(unwrap(response)); })
      .catch(e => { if (active) setError(e.response?.data?.message || "Unable to load preferred schools"); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [centerId]);

  if (!canAccess) return <AdminShell><section className="admin-page"><h1>Access denied</h1><p>You do not have permission to view school preferences.</p></section></AdminShell>;

  return <AdminShell><section className="admin-page">
    <div className="admin-page-head">
      <div><div className="eyebrow">EXAMINATION MANAGEMENT</div><h1>Preferred Schools</h1>
        <p>{data?.center?.examinationCenter || "Examination Center"} {data?.center?.examinationCenterCode ? `– ${data.center.examinationCenterCode}` : ""}</p>
        {state?.blockName && <p>Block: {state.blockName}</p>}
      </div>
      <button type="button" onClick={() => navigate("/school-center-preference", { state: state?.districtId ? { districtId: state.districtId } : null })}>Back to School Center Preference</button>
    </div>
    {busy && <div className="panel">Loading schools…</div>}
    {error && <div className="error">{error}</div>}
    {!busy && !error && <div className="panel">
      <div className="panel-head"><h3>{data?.center?.examinationCenter || "Center"} – Preferred Schools</h3><span>{data?.schools?.length || 0} schools</span></div>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>School Name</th><th>School Code</th><th>8th Expected Count</th><th>10th Expected Count</th></tr></thead>
        <tbody>{(data?.schools || []).map((row, i) => <tr key={row._id || `${row.schoolCode}-${i}`}><td>{i + 1}</td><td>{row.schoolName}</td><td>{row.schoolCode}</td><td>{row.expectedRegistrationCount8 ?? 0}</td><td>{row.expectedRegistrationCount10 ?? 0}</td></tr>)}
          {!(data?.schools || []).length && <tr><td colSpan="5">No preferred schools added.</td></tr>}
        </tbody></table></div>
    </div>}
  </section></AdminShell>;
}
