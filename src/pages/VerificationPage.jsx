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
  const [photoStatus, setPhotoStatus] = useState("All");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModal, setBulkModal] = useState(null);
  const [districtId, setDistrictId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ districts: [], blocks: [], schools: [] });
  const [summary, setSummary] = useState({ pending: 0, verified: 0, rejected: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyingStudentId, setVerifyingStudentId] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [rejectStudent, setRejectStudent] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [otherRemark, setOtherRemark] = useState("");
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

  const loadStudents = async ({ append = false } = {}) => {
    if (!examType) return;
    if (append) setLoadingMore(true);
    setError("");
    try {
      const offset = append ? students.length : 0;
      const params = new URLSearchParams({ examType, status, limit: "100", skip: String(offset) });
      if (districtId) params.set("districtId", districtId);
      if (blockId) params.set("blockDistrictId", blockId);
      if (schoolId) params.set("schoolDistrictId", schoolId);
      if (search.trim()) params.set("search", search.trim());
      if (photoStatus !== "All") params.set("photoStatus", photoStatus);
      const data = unwrap(await api.get(`/students/verification?${params.toString()}`));
      const batch = data?.students || [];
      setStudents((current) => append ? [...current, ...batch] : batch);
      setHasMore(batch.length === 100);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load verification registrations.");
      if (!append) setStudents([]);
      setHasMore(false);
    } finally {
      if (append) setLoadingMore(false);
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
    setSelectedIds([]);
  }, [examType, status, photoStatus, districtId, blockId, schoolId]);

  useEffect(() => {
    setSelectedIds([]);
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
    if (nextStatus === "verified") setVerifyingStudentId(student._id);
    try {
      await api.patch(`/students/${student._id}/verification`, {
        status: nextStatus,
        remark,
      });
      setRejectStudent(null);
      setRejectReason("");
      setOtherRemark("");
      setSelectedIds((current) => current.filter((id) => id !== student._id));
      await Promise.all([loadStudents(), loadSummary()]);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to update verification status.");
    } finally {
      setBusy(false);
      if (nextStatus === "verified") setVerifyingStudentId("");
    }
  };

  const submitReject = () => {
    if (!rejectStudent || !rejectReason.length) return;
    if (rejectReason.includes("Other") && !otherRemark.trim()) return;
    const reasons = rejectReason.filter((reason) => reason !== "Other");
    if (rejectReason.includes("Other")) reasons.push(otherRemark.trim());
    updateVerification(rejectStudent, "rejected", reasons.join(", "));
  };


  const submitBulkVerify = async () => {
    const ids = selectedIds.filter((id) => students.some((student) => student._id === id && student.verificationStatus === "Pending"));
    if (!ids.length) return;
    setBulkModal({ status: "processing", total: ids.length, verified: 0, failed: 0 });
    setBusy(true);
    setError("");
    try {
      const response = unwrap(await api.post("/students/verification/bulk-verify", { studentIds: ids }));
      const result = response || {};
      setBulkModal({ status: "done", total: ids.length, verified: Number(result.verifiedCount || 0), failed: Number(result.failedCount || 0) });
      setSelectedIds([]);
      await Promise.all([loadStudents(), loadSummary()]);
    } catch (e) {
      setBulkModal({ status: "error", total: ids.length, verified: 0, failed: ids.length, message: e.response?.data?.message || "Bulk verification failed." });
    } finally {
      setBusy(false);
    }
  };

  const toggleStudent = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

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
            value={photoStatus}
            onChange={setPhotoStatus}
            options={[
              { value: "All", label: "All photos" },
              { value: "WithPhoto", label: "With Photos" },
              { value: "NoPhoto", label: "No Photos" },
            ]}
            placeholder="Photo"
          />
          <ReactSelect
            value={status}
            onChange={setStatus}
            options={[
              { value: "Pending", label: "Pending" },
              { value: "Rejected", label: "Rejected" },
              { value: "Verified", label: "Registration Successful" },
              { value: "All", label: "All statuses" },
            ]}
            placeholder="Status"
          />
        </div>

        {status === "Pending" && (
          <div className="verification-bulk-toolbar">
            <span>{selectedIds.length} pending registration(s) selected</span>
            <button type="button" className="primary" disabled={!selectedIds.length || busy} onClick={submitBulkVerify}>
              Verify Selected ({selectedIds.length})
            </button>
          </div>
        )}

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
                      <button
                        type="button"
                        className="verification-thumb-button"
                        title="Click to view full student photo"
                        onClick={() => setPreviewImage(student.studentImage.previewUrl)}
                      >
                        <img
                          className="verification-student-thumb"
                          src={student.studentImage.previewUrl}
                          alt={`${student.name} student photo`}
                        />
                      </button>
                    ) : "-"}
                  </td>
                  <td><span className={`status ${student.verificationStatus === "Verified" ? "ok" : student.verificationStatus === "Rejected" ? "rejected" : "pending"}`}>{student.verificationStatus === "Verified" ? "Registration Successful" : student.verificationStatus}</span></td>
                  <td>
                    {student.verificationStatus === "Pending" ? (
                      <div className="verification-actions">
                        <button className="secondary" disabled={busy} onClick={() => { setRejectStudent(student); setRejectReason([]); setOtherRemark(""); }}>Reject</button>
                        <button className="primary verification-verify-btn" disabled={busy} onClick={() => updateVerification(student, "verified")}>
                          {verifyingStudentId === student._id ? <><span className="verification-button-spinner" /> Verifying…</> : "Verify"}
                        </button>
                        <label className="verification-row-select" title="Select for bulk verification">
                          <input type="checkbox" checked={selectedIds.includes(student._id)} disabled={busy} onChange={() => toggleStudent(student._id)} />
                        </label>
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

        {hasMore && (
          <div className="verification-load-more">
            <button type="button" className="secondary" disabled={loadingMore || busy} onClick={() => loadStudents({ append: true })}>
              {loadingMore ? "Loading…" : "Load More (100)"}
            </button>
            <span>Showing {students.length} registrations</span>
          </div>
        )}

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
                isMulti
                placeholder="Select one or more reasons"
              />
              {rejectReason.includes("Other") && (
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
                <button className="primary" disabled={busy || !rejectReason.length || (rejectReason.includes("Other") && !otherRemark.trim())} onClick={submitReject}>{busy ? "Rejecting…" : "Reject"}</button>
              </div>
            </div>
          </div>
        )}

        {bulkModal && (
          <div className="modal-backdrop" onClick={() => bulkModal.status !== "processing" && setBulkModal(null)}>
            <div className="modal-card verification-bulk-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{bulkModal.status === "processing" ? "Bulk Verification Processing" : bulkModal.status === "done" ? "Bulk Verification Completed" : "Bulk Verification Failed"}</h3>
              {bulkModal.status === "processing" ? (
                <><p>Verifying selected registrations. Please wait and do not close this window.</p><div className="verification-processing-indicator" /><strong>{bulkModal.total} registrations queued for verification</strong></>
              ) : bulkModal.status === "done" ? (
                <><p>Bulk verification has finished.</p><div className="verification-bulk-count"><strong>{bulkModal.verified}</strong><span>Successfully verified out of {bulkModal.total}</span></div>{bulkModal.failed > 0 && <p>{bulkModal.failed} registration(s) could not be verified.</p>}</>
              ) : <p>{bulkModal.message}</p>}
              {bulkModal.status !== "processing" && <div className="modal-actions"><button className="primary" onClick={() => setBulkModal(null)}>Close</button></div>}
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
