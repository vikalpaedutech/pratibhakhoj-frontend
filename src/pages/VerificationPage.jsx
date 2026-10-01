import { useEffect, useMemo, useState } from "react";
import OfficialShell from "../components/OfficialShell";
import ReactSelect from "../components/ReactSelect";
import { api, unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";

const EXAMS = {
  MB: "Mission Buniyaad",
  HS100: "Haryana Super 100",
};

const REJECTION_REASONS = [
  { value: "Inappropriate Name", label: "Inappropriate Name" },
  { value: "Inappropriate Father", label: "Inappropriate Father" },
  { value: "Invalid mobile", label: "Invalid mobile" },
  { value: "Invalid Whatsapp", label: "Invalid Whatsapp" },
  { value: "Inappropriate Image", label: "Inappropriate Image" },
  { value: "Other", label: "Other" },
];

export default function VerificationPage() {
  const { verificationAccess = [] } = useAuth();
  const allowedExams = useMemo(
    () => [...new Set(verificationAccess.flatMap((item) => item.examType || []))].filter((item) => EXAMS[item]),
    [verificationAccess]
  );

  const [examType, setExamType] = useState(allowedExams[0] || "");
  const [status, setStatus] = useState("Pending");
  const [districtId, setDistrictId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ districts: [], blocks: [], schools: [] });
  const [summary, setSummary] = useState({ pending: 0, verified: 0, rejected: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectStudent, setRejectStudent] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [otherRemark, setOtherRemark] = useState("");
  const [verifyStudent, setVerifyStudent] = useState(null);
  const [verifyRemark, setVerifyRemark] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    if (allowedExams.length && !allowedExams.includes(examType)) {
      setExamType(allowedExams[0]);
    }
  }, [allowedExams, examType]);

  const loadFilters = async () => {
    if (!examType) return;
    try {
      const data = unwrap(await api.get(`/students/verification/filters?examType=${examType}`));
      setFilters(data || { districts: [], blocks: [], schools: [] });
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load verification filters.");
    }
  };

  const loadSummary = async () => {
    if (!examType) return;
    try {
      const data = unwrap(await api.get(`/students/verification/summary?examType=${examType}`));
      setSummary(data || { pending: 0, verified: 0, rejected: 0 });
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load verification summary.");
    }
  };

  const loadStudents = async () => {
    if (!examType) return;
    setError("");
    try {
      const params = new URLSearchParams({ examType, status, limit: "500" });
      if (districtId) params.set("districtId", districtId);
      if (blockId) params.set("blockDistrictId", blockId);
      if (schoolId) params.set("schoolDistrictId", schoolId);
      if (search.trim()) params.set("search", search.trim());
      const data = unwrap(await api.get(`/students/verification?${params.toString()}`));
      setStudents(data?.students || []);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load verification registrations.");
      setStudents([]);
    }
  };

  useEffect(() => {
    if (!examType) return;
    setDistrictId("");
    setBlockId("");
    setSchoolId("");
    loadFilters();
    loadSummary();
  }, [examType]);

  useEffect(() => {
    if (!examType) return;
    loadStudents();
  }, [examType, status, districtId, blockId, schoolId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (examType) loadStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const blockOptions = useMemo(() => {
    if (!districtId) return filters.blocks || [];
    return (filters.blocks || []).filter((item) => String(item.districtId) === String(districtId));
  }, [filters.blocks, districtId]);

  const schoolOptions = useMemo(() => {
    return (filters.schools || []).filter((item) => {
      if (districtId && String(item.districtId) !== String(districtId)) return false;
      if (blockId && String(item.blockId) !== String(blockId)) return false;
      return true;
    });
  }, [filters.schools, districtId, blockId]);

  const updateVerification = async (student, nextStatus, remark = "") => {
    setBusy(true);
    try {
      await api.patch(`/students/${student._id}/verification`, {
        status: nextStatus,
        remark,
      });
      setRejectStudent(null);
      setRejectReason("");
      setOtherRemark("");
      setVerifyStudent(null);
      setVerifyRemark("");
      await Promise.all([loadStudents(), loadSummary()]);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to update verification status.");
    } finally {
      setBusy(false);
    }
  };

  const submitReject = () => {
    if (!rejectStudent || !rejectReason) return;
    if (rejectReason === "Other" && !otherRemark.trim()) return;
    updateVerification(
      rejectStudent,
      "rejected",
      rejectReason === "Other" ? otherRemark.trim() : rejectReason
    );
  };

  const submitVerify = () => {
    if (!verifyStudent) return;
    updateVerification(verifyStudent, "verified", verifyRemark.trim());
  };

  return (
    <OfficialShell>
      <section className="dashboard verification-page">
        <div className="dash-head verification-head">
          <div>
            <div className="eyebrow">VERIFICATION</div>
            <h2>Registration Verification</h2>
            <p>Only examinations and districts assigned to your verification access are shown to you.</p>
          </div>
          <ReactSelect
            value={examType}
            onChange={setExamType}
            options={allowedExams.map((item) => ({ value: item, label: EXAMS[item] }))}
            placeholder="Select examination"
          />
        </div>

        <div className="verification-summary-grid">
          <div className="count-card"><span>Pending</span><strong>{summary.pending}</strong><small>Waiting for your verification</small></div>
          <div className="count-card"><span>Verified by You</span><strong>{summary.verified}</strong><small>Registrations verified by you</small></div>
          <div className="count-card"><span>Rejected by You</span><strong>{summary.rejected}</strong><small>Registrations rejected by you</small></div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="verification-filters">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SRN, district or block"
          />
          <ReactSelect
            value={districtId}
            onChange={(value) => { setDistrictId(value); setBlockId(""); setSchoolId(""); }}
            options={(filters.districts || []).map((item) => ({ value: item._id, label: item.districtName }))}
            placeholder="All districts"
          />
          <ReactSelect
            value={blockId}
            onChange={(value) => { setBlockId(value); setSchoolId(""); }}
            options={blockOptions.map((item) => ({ value: item._id, label: item.blockName }))}
            placeholder="All blocks"
          />
          <ReactSelect
            value={schoolId}
            onChange={setSchoolId}
            options={schoolOptions.map((item) => ({ value: item._id, label: item.schoolName }))}
            placeholder="All schools"
          />
          <ReactSelect
            value={status}
            onChange={setStatus}
            options={[
              { value: "Pending", label: "Pending" },
              { value: "Rejected", label: "Rejected" },
              { value: "Verified", label: "Verified" },
              { value: "All", label: "All statuses" },
            ]}
            placeholder="Status"
          />
        </div>

        <div className="table-wrap verification-table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>Student</th><th>Father</th><th>Mobile</th><th>Whatsapp</th><th>Student Image</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student._id}>
                  <td>{index + 1}</td>
                  <td><strong>{student.name}</strong><small>{student.studentSrn}</small></td>
                  <td>{student.fatherName || "-"}</td>
                  <td>{student.mobile || "-"}</td>
                  <td>{student.whatsapp || "-"}</td>
                  <td>
                    {student.studentImage?.previewUrl ? (
                      <img
                        className="verification-student-thumb"
                        src={student.studentImage.previewUrl}
                        alt={student.name}
                        onClick={() => setPreviewImage(student.studentImage.previewUrl)}
                      />
                    ) : "-"}
                  </td>
                  <td><span className={`status ${student.verificationStatus === "Verified" ? "ok" : student.verificationStatus === "Rejected" ? "rejected" : "pending"}`}>{student.verificationStatus}</span></td>
                  <td>
                    {student.verificationStatus === "Pending" ? (
                      <div className="verification-actions">
                        <button className="secondary" disabled={busy} onClick={() => { setRejectStudent(student); setRejectReason(""); setOtherRemark(""); }}>Reject</button>
                        <button className="primary" disabled={busy} onClick={() => { setVerifyStudent(student); setVerifyRemark(""); }}>Verify</button>
                      </div>
                    ) : (
                      <span className="muted">No action</span>
                    )}
                  </td>
                </tr>
              ))}
              {!students.length && <tr><td colSpan="8" className="empty-row">No registrations found for the selected exam, region and filters.</td></tr>}
            </tbody>
          </table>
        </div>

        {rejectStudent && (
          <div className="modal-backdrop" onClick={() => !busy && setRejectStudent(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Reject Registration</h3>
              <p>Select the reason for rejection.</p>
              <ReactSelect
                label="Rejection Reason *"
                value={rejectReason}
                onChange={setRejectReason}
                options={REJECTION_REASONS}
                placeholder="Select reason"
              />
              {rejectReason === "Other" && (
                <textarea
                  value={otherRemark}
                  onChange={(e) => setOtherRemark(e.target.value)}
                  placeholder="Enter rejection remark"
                  rows={4}
                  required
                />
              )}
              <div className="modal-actions">
                <button className="secondary" disabled={busy} onClick={() => setRejectStudent(null)}>Cancel</button>
                <button className="primary" disabled={busy || !rejectReason || (rejectReason === "Other" && !otherRemark.trim())} onClick={submitReject}>{busy ? "Rejecting…" : "Reject"}</button>
              </div>
            </div>
          </div>
        )}

        {verifyStudent && (
          <div className="modal-backdrop" onClick={() => !busy && setVerifyStudent(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Verify Registration</h3>
              <p>Verification remark is optional.</p>
              <textarea
                value={verifyRemark}
                onChange={(e) => setVerifyRemark(e.target.value)}
                placeholder="Optional verification remark"
                rows={4}
              />
              <div className="modal-actions">
                <button className="secondary" disabled={busy} onClick={() => setVerifyStudent(null)}>Cancel</button>
                <button className="primary" disabled={busy} onClick={submitVerify}>{busy ? "Verifying…" : "Verify"}</button>
              </div>
            </div>
          </div>
        )}

        {previewImage && (
          <div className="modal-backdrop image-modal" onClick={() => setPreviewImage("")}>
            <div className="image-preview-modal" onClick={(e) => e.stopPropagation()}>
              <button className="image-close" onClick={() => setPreviewImage("")}>×</button>
              <img src={previewImage} alt="Student preview" />
            </div>
          </div>
        )}
      </section>
    </OfficialShell>
  );
}
