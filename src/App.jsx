import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import StudentRegister from "./pages/StudentRegister";
import OfficialLogin from "./pages/OfficialLogin";
import OfficialRegister from "./pages/OfficialRegister";
import VerifyOtp from "./pages/VerifyOtp";
import VerifyEmail from "./pages/VerifyEmail";
import CreatePassword from "./pages/CreatePassword";
import OfficialDashboard from "./pages/OfficialDashboard";
import StudentList from "./pages/StudentList";
import Level1Dashboard from "./pages/Level1Dashboard";
import BulkStudentUpload from "./pages/BulkStudentUpload";
import Success from "./pages/Success";
import AdminRegions from "./pages/admin/AdminRegions";
import AdminVerificationUsers from "./pages/admin/AdminVerificationUsers";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserRegionAccess from "./pages/admin/AdminUserRegionAccess";
import AdminDashboardAccess from "./pages/admin/AdminDashboardAccess";
import VerificationPage from "./pages/VerificationPage";
import PublicLevel1Dashboard from "./pages/PublicLevel1Dashboard";
import AllRegistrationsDashboard from "./pages/AllRegistrationsDashboard";
import SchoolVisit from "./pages/SchoolVisit";
import AdminPermissions from "./pages/admin/AdminPermissions";
import RegistrationsByUsers from "./pages/RegistrationsByUsers";
import VerificationByUsers from "./pages/VerificationByUsers";
import SchoolVisitDashboard from "./pages/SchoolVisitDashboard";
import { useAuth } from "./context/AuthContext";
import ForgotPassword from "./pages/ForgotPassword";
import ExamController from "./pages/admin/ExamController";
import ExaminationCenters from "./pages/admin/ExaminationCenters";
import SchoolCenterPreference from "./pages/SchoolCenterPreference";
import SchoolCenterPreferenceForm from "./pages/SchoolCenterPreferenceForm";
import SchoolCenterPreferenceSchools from "./pages/SchoolCenterPreferenceSchools";
import AttendanceSheetDlc from "./pages/AttendanceSheetDlc";
import AdminDownloadStudentsData from "./pages/admin/AdminDownloadStudentsData";

function Protected({ children, admin = false, schoolVisit = false, dashboardCode = "", permissionCode = "", permissionByParam = null }) {
  const { user, role, loading, schoolVisitAccess, dashboardAccess = [], permissions = [] } = useAuth();
  const params = useParams();
  const location = useLocation();
  const resolvedPermissionCode = permissionByParam?.[params.type || params.examType] || permissionCode;
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/official/login" replace />;
  if (role?.code === "DSS" && !permissionCode && !permissionByParam && !admin && !schoolVisit && !dashboardCode && location.pathname === "/official") return <Navigate to="/school-center-preference" replace />;
  if (admin && role?.code !== "ADMIN") return <Navigate to="/official" replace />;
  if (schoolVisit && !schoolVisitAccess) return <Navigate to="/official" replace />;
  if (dashboardCode && role?.code !== "ADMIN" && !dashboardAccess.includes(dashboardCode)) return <Navigate to="/official" replace />;
  if (resolvedPermissionCode && role?.code === "DSS" && !permissions.includes(resolvedPermissionCode)) return <Navigate to="/official" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/attendance-sheet-dlc" element={<AttendanceSheetDlc />} />
        <Route path="/register/:type" element={<StudentRegister />} />
        <Route path="/register/:type/edit/:srn" element={<StudentRegister editMode />} />
        <Route path="/registration-success/:slipId" element={<Success />} />
        <Route path="/dashboards-level-1" element={<PublicLevel1Dashboard />} />
        <Route path="/dashboards-level-1/:examType" element={<PublicLevel1Dashboard />} />
        <Route path="/dashboards-level-1/:examType/:view" element={<PublicLevel1Dashboard />} />
        <Route path="/official/login" element={<OfficialLogin />} />
        <Route path="/official/forgot-password" element={<ForgotPassword />} />
        <Route path="/official/register" element={<OfficialRegister />} />
        <Route path="/official/verify-otp" element={<VerifyOtp />} />
        <Route path="/official/verify-email" element={<VerifyEmail />} />
        <Route path="/official/create-password" element={<CreatePassword />} />
        <Route path="/official" element={<Protected><OfficialDashboard /></Protected>} />
        <Route path="/official/register/:type" element={<Protected permissionByParam={{ MB: "OFFICIAL_MB_REGISTRATIONS", HS100: "OFFICIAL_HS100_REGISTRATIONS" }}><StudentRegister officialMode /></Protected>} />
        <Route path="/official/register/:type/edit/:srn" element={<Protected permissionByParam={{ MB: "OFFICIAL_MB_REGISTRATIONS", HS100: "OFFICIAL_HS100_REGISTRATIONS" }}><StudentRegister officialMode editMode /></Protected>} />
        <Route path="/official/dashboard/:examType" element={<Protected permissionByParam={{ MB: "OFFICIAL_MB_DASHBOARD", HS100: "OFFICIAL_HS100_DASHBOARD" }}><Level1Dashboard /></Protected>} />
        <Route path="/official/registrations/:examType" element={<Protected permissionCode="OFFICIAL_REGISTRATION_MANAGEMENT"><AllRegistrationsDashboard /></Protected>} />
        <Route path="/official/registrations/:examType/edit/:id" element={<Protected permissionCode="OFFICIAL_REGISTRATION_MANAGEMENT"><StudentRegister officialMode allRegistrationsMode editMode /></Protected>} />
        <Route path="/official/students" element={<Protected><StudentList /></Protected>} />
        <Route path="/official/bulk" element={<Protected permissionCode="OFFICIAL_BULK_REGISTRATION"><BulkStudentUpload /></Protected>} />
        <Route path="/official/school-visits" element={<Protected schoolVisit permissionCode="OFFICIAL_SCHOOL_VISIT"><SchoolVisit /></Protected>} />
        <Route path="/official/school-visits/:id" element={<Protected schoolVisit permissionCode="OFFICIAL_SCHOOL_VISIT"><SchoolVisit /></Protected>} />
        <Route path="/official/dashboards/registrations-by-users" element={<Protected dashboardCode="REGISTRATIONS_BY_USERS" permissionCode="OFFICIAL_REPORT_DASHBOARDS"><RegistrationsByUsers /></Protected>} />
        <Route path="/official/dashboards/verification-by-users" element={<Protected dashboardCode="VERIFICATION_BY_USERS" permissionCode="OFFICIAL_REPORT_DASHBOARDS"><VerificationByUsers /></Protected>} />
        <Route path="/official/dashboards/school-visits" element={<Protected dashboardCode="SCHOOL_VISIT_DASHBOARD" permissionCode="OFFICIAL_REPORT_DASHBOARDS"><SchoolVisitDashboard /></Protected>} />
        <Route path="/admin" element={<Protected admin={true}><AdminRegions /></Protected>} />
        <Route path="/admin/regions" element={<Protected admin={true}><AdminRegions /></Protected>} />
        <Route path="/admin/users" element={<Protected admin={true}><AdminUsers /></Protected>} />
        <Route path="/admin/user-region-access" element={<Protected admin={true}><AdminUserRegionAccess /></Protected>} />
        <Route path="/admin/dashboard-access" element={<Protected admin={true}><AdminDashboardAccess /></Protected>} />
        <Route path="/admin/verification-users" element={<Protected admin={true}><AdminVerificationUsers /></Protected>} />
        <Route path="/admin/permissions" element={<Protected admin={true}><AdminPermissions /></Protected>} />
        <Route path="/admin/exam-controller" element={<Protected admin={true}><ExamController /></Protected>} />
        <Route path="/admin/examination-centers" element={<Protected admin={true}><ExaminationCenters /></Protected>} />
        <Route path="/admin/download-students-data" element={<Protected admin={true}><AdminDownloadStudentsData /></Protected>} />
        <Route path="/school-center-preference" element={<Protected permissionCode="SCHOOL_CENTER_PREFERENCE"><SchoolCenterPreference /></Protected>} />
        <Route path="/school-center-preference/form" element={<Protected permissionCode="SCHOOL_CENTER_PREFERENCE"><SchoolCenterPreferenceForm /></Protected>} />
        <Route path="/school-center-preference/blocks/:blockId/schools" element={<Protected permissionCode="SCHOOL_CENTER_PREFERENCE"><SchoolCenterPreferenceSchools /></Protected>} />
        <Route path="/official/verification" element={<Protected permissionCode="OFFICIAL_VERIFICATION"><VerificationPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
