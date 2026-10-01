import { Link, useParams } from "react-router-dom";
import PublicLevel1Dashboard from "./PublicLevel1Dashboard";
import OfficialShell from "../components/OfficialShell";
import { useAuth } from "../context/AuthContext";

const VALID_VIEWS = new Set(["district-block", "block-school", "school"]);

export default function PermissionedLevel1Dashboard() {
  const { examType, view } = useParams();
  const { hasPermission } = useAuth();
  const exam = String(examType || "").toUpperCase();
  const currentView = VALID_VIEWS.has(view) ? view : "district-block";
  const suffix = currentView === "district-block" ? "DISTRICT_BLOCK" : currentView === "block-school" ? "BLOCK_SCHOOL" : "SCHOOL";
  const permission = `${exam}_${suffix}`;

  if (!hasPermission(permission)) {
    return (
      <OfficialShell>
        <section className="official-dashboard">
          <div className="error">You do not have permission to access this dashboard.</div>
          <Link className="secondary" to="/official">← Back to Dashboard</Link>
        </section>
      </OfficialShell>
    );
  }

  return <PublicLevel1Dashboard />;
}
