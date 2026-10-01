import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import OfficialShell from "../components/OfficialShell";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

const EXAMS = {
  MB: { name: "Mission Buniyaad", classOfStudent: 8 },
  HS100: { name: "Haryana Super 100", classOfStudent: 10 },
};

export default function OfficialDashboard() {
  const { examType } = useParams();
  const { verificationAccess = [] } = useAuth();
  const selectedExam = EXAMS[examType] ? examType : "";
  const [data, setData] = useState(null);
  const [verificationSummary, setVerificationSummary] = useState(null);
  const [error, setError] = useState("");

  const hasVerificationAccess = verificationAccess.length > 0;

  useEffect(() => {
    let active = true;
    api.get("/students/dashboard")
      .then((response) => {
        if (active) setData(unwrap(response));
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || "Unable to load dashboard.");
      });

    if (hasVerificationAccess) {
      api.get("/students/verification/summary")
        .then((response) => {
          if (active) setVerificationSummary(unwrap(response));
        })
        .catch(() => {});
    }

    return () => { active = false; };
  }, [hasVerificationAccess]);

  const counts = useMemo(() => {
    const byExamType = data?.byExamType || [];
    return {
      MB: byExamType.find((item) => item._id === "MB")?.count || 0,
      HS100: byExamType.find((item) => item._id === "HS100")?.count || 0,
    };
  }, [data]);

  const cards = selectedExam ? [selectedExam] : ["MB", "HS100"];

  return (
    <OfficialShell>
      <section className="official-dashboard">
        {error && <div className="error">{error}</div>}

        {hasVerificationAccess && verificationSummary && (
          <div className="verification-dashboard-section">
            <div className="eyebrow">VERIFICATION</div>
            <h2>Verification Summary</h2>
            <div className="verification-summary-grid dashboard-verification-grid">
              <div className="count-card"><span>Pending</span><strong>{verificationSummary.pending || 0}</strong><small>Waiting for verification</small></div>
              <div className="count-card"><span>Verified by You</span><strong>{verificationSummary.verified || 0}</strong><small>Registrations verified by you</small></div>
              <div className="count-card"><span>Rejected by You</span><strong>{verificationSummary.rejected || 0}</strong><small>Registrations rejected by you</small></div>
            </div>
          </div>
        )}

        <div className="dashboard-count-grid official-level-grid">
          {data && cards.map((type) => (
            <div className="count-card official-level-card" key={type}>
              <span>{EXAMS[type].name} (2028-29)</span>
              <strong>{counts[type]}</strong>
              <small>Level 1 Registration Count · Class {EXAMS[type].classOfStudent}</small>
            </div>
          ))}
        </div>
      </section>
    </OfficialShell>
  );
}
