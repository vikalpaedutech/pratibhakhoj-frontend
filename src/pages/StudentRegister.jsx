import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Field from "../components/Field";
import PortalHeader from "../components/PortalHeader";
import PortalFooter from "../components/PortalFooter";
import OfficialShell from "../components/OfficialShell";
import { api, unwrap } from "../api/client";

const blank = {
  studentSrn: "",
  name: "",
  fatherName: "",
  motherName: "",
  dob: "",
  gender: "",
  category: "",
  aadhar: "",
  mobile: "",
  whatsapp: "",
  houseNumber: "",
  cityTownVillage: "",
  addressBlock: "",
  addressDistrict: "",
  addressState: "Haryana",
  districtId: "",
  blockDistrictId: "",
  schoolDistrictId: "",
  previousClassAnnualExamPercentage: "",
  schoolEntry: "db",
  studentImage: null,
  previousClassResult: null,
};

export default function StudentRegister({ editMode = false, officialMode = false, allRegistrationsMode = false }) {
  const { type, srn: editSrn, id: editId } = useParams();
  const examType = type === "HS100" ? "HS100" : "MB";
  const examName = examType === "MB" ? "Mission Buniyaad" : "Haryana Super 100";
  const classOfStudent = examType === "MB" ? 8 : 10;

  const navigate = useNavigate();

  const [stage, setStage] = useState(editMode ? "form" : "lookup");
  const [officialStudentId, setOfficialStudentId] = useState(null);
  const [srn, setSrn] = useState(editSrn || "");
  const [form, setForm] = useState({ ...blank, classOfStudent });
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [regionAccess, setRegionAccess] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [formValidationAttempted, setFormValidationAttempted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [existingFiles, setExistingFiles] = useState({
    studentImage: null,
    previousClassResult: null,
  });
  const [manualSchoolName, setManualSchoolName] = useState("");

  const availableDistricts = useMemo(() => {
    if (!officialMode || allRegistrationsMode) return districts;
    if (regionAccess.some((item) => item.scope === "global")) return districts;
    if (!regionAccess.length) return [];
    return districts.filter((district) => regionAccess.some((rule) =>
      (rule.scope === "district" || rule.scope === "block" || rule.scope === "school") &&
      String(rule.districtId) === String(district._id)
    ));
  }, [districts, regionAccess, officialMode, allRegistrationsMode]);

  const availableBlocks = useMemo(() => {
    if (!officialMode || allRegistrationsMode) return blocks;
    if (regionAccess.some((item) => item.scope === "global")) return blocks;
    if (!regionAccess.length) return [];
    return blocks.filter((block) => regionAccess.some((rule) => {
      const districtOk = String(rule.districtId) === String(block.districtId);
      return (rule.scope === "district" && districtOk) ||
        (rule.scope === "block" && districtOk && String(rule.blockId) === String(block._id)) ||
        (rule.scope === "school" && districtOk && String(rule.blockId) === String(block._id));
    }));
  }, [blocks, regionAccess, officialMode, allRegistrationsMode]);

  const availableSchools = useMemo(() => {
    if (!officialMode || allRegistrationsMode) return schools;
    if (regionAccess.some((item) => item.scope === "global")) return schools;
    if (!regionAccess.length) return [];
    return schools.filter((school) => regionAccess.some((rule) => {
      const districtOk = String(rule.districtId) === String(school.districtId);
      const blockOk = String(rule.blockId) === String(school.blockId);
      return (rule.scope === "district" && districtOk) ||
        (rule.scope === "block" && districtOk && blockOk) ||
        (rule.scope === "school" && String(rule.schoolId) === String(school._id));
    }));
  }, [schools, regionAccess, officialMode, allRegistrationsMode]);

  const pageTitle = useMemo(
    () => `${examName} Registration Form`,
    [examName]
  );

  useEffect(() => {
    const districtRequest = officialMode && !allRegistrationsMode
      ? api.get("/regions/my-districts")
      : api.get("/regions/districts");

    const accessRequest = officialMode && !allRegistrationsMode
      ? api.get("/regions/my-access")
      : Promise.resolve(null);

    Promise.all([districtRequest, accessRequest])
      .then(([districtResponse, accessResponse]) => {
        setDistricts(Array.isArray(unwrap(districtResponse)) ? unwrap(districtResponse) : []);
        if (accessResponse) {
          setRegionAccess(Array.isArray(unwrap(accessResponse)) ? unwrap(accessResponse) : []);
        }
      })
      .catch((err) => setError(err.response?.data?.message || "Unable to load districts."));
  }, [officialMode, allRegistrationsMode]);

  useEffect(() => {
    if (!editMode || (!editSrn && !editId)) return;

    const loadStudent = async () => {
      setLoading(true);
      try {
        const student = unwrap(
          await api.get(
            allRegistrationsMode
              ? `/students/all-registrations/record/${editId}?examType=${examType}`
              : officialMode
                ? `/students/official/${editSrn}?examType=${examType}`
                : `/students/public/${editSrn}?examType=${examType}`
          )
        );

        const districtId =
          typeof student.districtId === "object" ? student.districtId?._id : student.districtId;
        const blockId =
          typeof student.blockDistrictId === "object"
            ? student.blockDistrictId?._id
            : student.blockDistrictId;
        const schoolId =
          typeof student.schoolDistrictId === "object"
            ? student.schoolDistrictId?._id
            : student.schoolDistrictId;

        if (officialMode) setOfficialStudentId(student._id);

        setExistingFiles({
          studentImage: student.studentImage || null,
          previousClassResult: student.previousClassResult || null,
        });

        setForm({
          ...blank,
          studentSrn: student.studentSrn || "",
          name: student.name || "",
          fatherName: student.fatherName || "",
          motherName: student.motherName || "",
          dob: student.dob ? String(student.dob).slice(0, 10) : "",
          gender: student.gender || "",
          category: student.category || "",
          aadhar: student.aadhar || "",
          mobile: student.mobile || "",
          whatsapp: student.whatsapp || "",
          houseNumber: student.houseNumber || "",
          cityTownVillage: student.cityTownVillage || "",
          addressBlock: student.addressBlock || "",
          addressDistrict: student.addressDistrict || "",
          addressState: student.addressState || "Haryana",
          districtId: districtId || "",
          blockDistrictId: blockId || "",
          schoolDistrictId: schoolId || "",
          previousClassAnnualExamPercentage:
            student.previousClassAnnualExamPercentage ?? "",
          schoolEntry: student.schoolEntry === "manual" ? "manual" : "db",
          classOfStudent,
          registrationStatus: student.verificationStatus || "Pending",
          registrationRemark: student.registrationFormVerificationRemark || "",
          studentImage: null,
          previousClassResult: null,
        });

        setManualSchoolName(student.schoolEntry === "manual" ? (student.schoolNameManual || "") : "");

        if (districtId) {
          const blockResponse = await api.get(
            `${officialMode && !allRegistrationsMode ? "/regions/my-blocks" : "/regions/blocks"}?districtId=${districtId}`
          );
          setBlocks(Array.isArray(unwrap(blockResponse)) ? unwrap(blockResponse) : []);

          if (student.blockDistrictId) {
            const blockId =
              typeof student.blockDistrictId === "object"
                ? student.blockDistrictId._id
                : student.blockDistrictId;

            const schoolResponse = await api.get(
              `${officialMode && !allRegistrationsMode ? "/regions/my-schools" : "/regions/schools"}?districtId=${districtId}&blockId=${blockId}`
            );
            setSchools(Array.isArray(unwrap(schoolResponse)) ? unwrap(schoolResponse) : []);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load registration.");
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, [editMode, editSrn, editId, examType, classOfStudent, officialMode, allRegistrationsMode]);

  const checkSrn = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{10}$/.test(srn)) {
      setError("SRN must be exactly 10 digits.");
      return;
    }

    setChecking(true);

    try {
      const data = unwrap(
        await api.get(officialMode
          ? `/students/official/check/${srn}?examType=${examType}`
          : `/students/check/${srn}?examType=${examType}`)
      );

      if (data.registered) {
        if (!officialMode) {
          navigate(
            `/registration-success/${data.student.slipId}?srn=${encodeURIComponent(srn)}&examType=${examType}&editable=${data.canEdit ? "1" : "0"}`
          );
          return;
        }

        if (!data.canEdit || !data.student) {
          setError(data.message || "This SRN cannot be edited from your account.");
          return;
        }

        const student = data.student;
        setOfficialStudentId(student._id);
        const districtId = typeof student.districtId === "object" ? student.districtId?._id : student.districtId;
        const blockId = typeof student.blockDistrictId === "object" ? student.blockDistrictId?._id : student.blockDistrictId;
        const schoolId = typeof student.schoolDistrictId === "object" ? student.schoolDistrictId?._id : student.schoolDistrictId;
        setExistingFiles({ studentImage: student.studentImage || null, previousClassResult: student.previousClassResult || null });
        setForm({
          ...blank, studentSrn: student.studentSrn || srn, name: student.name || "", fatherName: student.fatherName || "",
          motherName: student.motherName || "", dob: student.dob ? String(student.dob).slice(0,10) : "", gender: student.gender || "",
          category: student.category || "", aadhar: student.aadhar || "", mobile: student.mobile || "", whatsapp: student.whatsapp || "",
          houseNumber: student.houseNumber || "", cityTownVillage: student.cityTownVillage || "", addressBlock: student.addressBlock || "",
          addressDistrict: student.addressDistrict || "", addressState: student.addressState || "Haryana", districtId: districtId || "",
          blockDistrictId: blockId || "", schoolDistrictId: schoolId || "", previousClassAnnualExamPercentage: student.previousClassAnnualExamPercentage ?? "",
          schoolEntry: student.schoolEntry === "manual" ? "manual" : "db", classOfStudent, registrationStatus: student.verificationStatus || "Pending", registrationRemark: student.registrationFormVerificationRemark || "", studentImage: null, previousClassResult: null,
        });
        setManualSchoolName(student.schoolEntry === "manual" ? (student.schoolNameManual || "") : "");
        if (districtId) {
          const br = await api.get(
            `${officialMode && !allRegistrationsMode ? "/regions/my-blocks" : "/regions/blocks"}?districtId=${districtId}`
          );
          setBlocks(Array.isArray(unwrap(br)) ? unwrap(br) : []);
          if (blockId) {
            const sr = await api.get(
              `${officialMode ? "/regions/my-schools" : "/regions/schools"}?districtId=${districtId}&blockId=${blockId}`
            );
            setSchools(Array.isArray(unwrap(sr)) ? unwrap(sr) : []);
          }
        }
        setStage("form");
        return;
      }

      setForm((current) => ({ ...current, studentSrn: srn, classOfStudent }));
      setExistingFiles({ studentImage: null, previousClassResult: null });
      setOfficialStudentId(null);
      setStage("form");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to check SRN.");
    } finally {
      setChecking(false);
    }
  };

  const onDistrict = async (event) => {
    const districtId = event.target.value;

    setForm((current) => ({
      ...current,
      districtId,
      blockDistrictId: "",
      schoolDistrictId: "",
    }));
    setBlocks([]);
    setSchools([]);

    if (!districtId) return;

    try {
      const response = await api.get(
        `${officialMode && !allRegistrationsMode ? "/regions/my-blocks" : "/regions/blocks"}?districtId=${districtId}`
      );
      setBlocks(Array.isArray(unwrap(response)) ? unwrap(response) : []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load blocks.");
    }
  };

  const onBlock = async (event) => {
    const blockId = event.target.value;

    setForm((current) => ({
      ...current,
      blockDistrictId: blockId,
      schoolDistrictId: "",
    }));
    setSchools([]);

    if (!blockId || !form.districtId) return;

    try {
      const response = await api.get(
        `${officialMode && !allRegistrationsMode ? "/regions/my-schools" : "/regions/schools"}?districtId=${form.districtId}&blockId=${blockId}`
      );
      setSchools(Array.isArray(unwrap(response)) ? unwrap(response) : []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load schools.");
    }
  };

  const [newStudentImagePreview, setNewStudentImagePreview] = useState(null);
  const [newResultPreview, setNewResultPreview] = useState(null);

  useEffect(() => {
    if (!form.studentImage) {
      setNewStudentImagePreview(null);
      return undefined;
    }

    const url = URL.createObjectURL(form.studentImage);
    setNewStudentImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.studentImage]);

  useEffect(() => {
    if (!form.previousClassResult) {
      setNewResultPreview(null);
      return undefined;
    }

    const url = URL.createObjectURL(form.previousClassResult);
    setNewResultPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.previousClassResult]);

  const studentImagePreview =
    newStudentImagePreview ||
    existingFiles.studentImage?.previewUrl ||
    null;

  const resultPreview =
    newResultPreview ||
    existingFiles.previousClassResult?.previewUrl ||
    null;

  const resultMimeType =
    form.previousClassResult instanceof File
      ? form.previousClassResult.type
      : existingFiles.previousClassResult?.mimeType;

  const resultIsPdf = resultMimeType === "application/pdf";

  const toggleManualSchool = (checked) => {
    setForm((current) => ({
      ...current,
      schoolEntry: checked ? "manual" : "db",
      schoolDistrictId: checked ? "" : current.schoolDistrictId,
    }));
    if (!checked) setManualSchoolName("");
  };

  const selectStudentImage = (file) => {
    setForm((current) => ({ ...current, studentImage: file || null }));
  };

  const selectPreviousResult = (file) => {
    setForm((current) => ({ ...current, previousClassResult: file || null }));
  };

  const submit = async (event) => {
    setFormValidationAttempted(true);
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const payload = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value instanceof File) {
          payload.append(key, value);
          return;
        }

        if (
          value !== null &&
          value !== undefined &&
          typeof value !== "object"
        ) {
          payload.append(key, String(value));
        }
      });

      payload.set("studentSrn", srn || form.studentSrn);
      payload.set("examType", examType);
      payload.set("schoolEntry", form.schoolEntry || "db");
      payload.set("schoolNameManual", form.schoolEntry === "manual" ? manualSchoolName.trim() : "");
      payload.set("classOfStudent", String(classOfStudent));

      const response = allRegistrationsMode
        ? await api.patch(`/students/all-registrations/${officialStudentId}`, payload)
        : officialMode
          ? (officialStudentId
            ? await api.patch(`/students/${officialStudentId}`, payload)
            : await api.post("/students/official-register", payload))
          : (editMode
            ? await api.put(`/students/public/${srn}`, payload)
            : await api.post("/students/public-register", payload));

      const student = unwrap(response);

      setMessage(editMode ? "Registration updated successfully." : "Registration submitted successfully.");

      if (allRegistrationsMode) {
        navigate(`/official/registrations/${examType}`, { replace: true });
      } else {
        navigate(
          `/registration-success/${student.slipId}?srn=${encodeURIComponent(student.studentSrn)}&examType=${examType}&editable=1${officialMode ? "&official=1" : ""}&next=${encodeURIComponent(`/official/register/${examType}`)}`,
          { replace: true }
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit registration.");
    } finally {
      setLoading(false);
    }
  };

  if (stage === "lookup") {
    const lookupContent = (
      <section className="srn-page">
          <div className="srn-card">
            <h2>Enter your SRN</h2>
            <p className="srn-helper">Enter your SRN</p>

            <form onSubmit={checkSrn}>
              <Field
                label="SRN * (SRN की जानकारी न होने पर अपने स्कूल से संपर्क करें)"
                value={srn}
                inputMode="numeric"
                maxLength={10}
                autoFocus
                onChange={(event) =>
                  setSrn(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                required
              />

              {error && <div className="error">{error}</div>}

              <button className="primary full" disabled={checking}>
                {checking ? "Checking…" : "Submit"}
              </button>
            </form>
          </div>
        </section>
    );

    return officialMode ? <OfficialShell>{lookupContent}</OfficialShell> : (
      <div className="public-page">
        <PortalHeader examType={examType} />
        {lookupContent}
        <PortalFooter examType={examType} />
      </div>
    );
  }

  const formContent = (
      <section className="student-form-page">
        <div className="form-intro">
          <div className="form-intro-centered">
            <h2>{pageTitle} (2028-29)</h2>
            <p className="form-srn-line">Class {classOfStudent} · SRN <strong>{srn || form.studentSrn}</strong></p>
          </div>
        </div>

        <form
          className={`student-form${formValidationAttempted ? " validation-attempted" : ""}`}
          onSubmit={submit}
          onInvalidCapture={() => setFormValidationAttempted(true)}
        >
          <section className="form-section">
            <h3><span className="form-section-number">1</span><span>Student Details</span></h3>
            <div className="form-grid">
              <Field label="Student Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Field label="Father Name *" value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} required />
              <Field label="Mother Name *" value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} required />
              <Field label="Date of Birth *" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required />

              <label className="field">
                <span>Gender *</span>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} required>
                  <option value="">Select gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="field">
                <span>Category *</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                  <option value="">Select category</option>
                  <option>General</option>
                  <option>SC</option>
                  <option>BC-A</option>
                  <option>BC-B</option>
                  <option>Other</option>
                </select>
              </label>

              <Field label="Aadhar" value={form.aadhar || ""} inputMode="numeric" maxLength={12} onChange={(e) => setForm({ ...form, aadhar: e.target.value.replace(/\D/g, "").slice(0, 12) })} />
              <Field label="Mobile *" value={form.mobile || ""} inputMode="numeric" maxLength={10} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} required />
              <Field label="WhatsApp" value={form.whatsapp || ""} inputMode="numeric" maxLength={10} onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
            </div>
          </section>

          <section className="form-section">
            <h3><span className="form-section-number">2</span><span>Address Details</span></h3>
            <div className="form-grid">
              <Field label="House Number" value={form.houseNumber || ""} onChange={(e) => setForm({ ...form, houseNumber: e.target.value })} />
              <Field label="City / Town / Village" value={form.cityTownVillage || ""} onChange={(e) => setForm({ ...form, cityTownVillage: e.target.value })} />
              <Field label="Address District" value={form.addressDistrict || ""} onChange={(e) => setForm({ ...form, addressDistrict: e.target.value })} />
              <Field label="Address Block" value={form.addressBlock || ""} onChange={(e) => setForm({ ...form, addressBlock: e.target.value })} />
              <Field label="State" value={form.addressState || "Haryana"} onChange={(e) => setForm({ ...form, addressState: e.target.value })} />
            </div>
          </section>

          <section className="form-section">
            <h3><span className="form-section-number">3</span><span>School Details</span></h3>
            <div className="form-grid">
              <Field
                label={`${classOfStudent === 8 ? "7th" : "10th"} Class Annual Exam %`}
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.previousClassAnnualExamPercentage ?? ""}
                onChange={(e) => setForm({ ...form, previousClassAnnualExamPercentage: e.target.value })}
              />

              <label className="field">
                <span>School District *</span>
                <select value={form.districtId || ""} onChange={onDistrict} required>
                  <option value="">Select district</option>
                  {availableDistricts.map((district) => (
                    <option key={district._id} value={district._id}>{district.districtName}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>School Block *</span>
                <select value={form.blockDistrictId || ""} onChange={onBlock} required>
                  <option value="">Select block</option>
                  {availableBlocks.map((block) => (
                    <option key={block._id} value={block._id}>{block.blockName}</option>
                  ))}
                </select>
              </label>

              {!manualSchoolName && form.schoolEntry !== "manual" ? (
                <label className="field">
                  <span>School *</span>
                  <select
                    value={form.schoolDistrictId || ""}
                    onChange={(e) => setForm({ ...form, schoolDistrictId: e.target.value })}
                    required={form.schoolEntry !== "manual"}
                  >
                    <option value="">Select school</option>
                    {availableSchools.map((school) => (
                      <option key={school._id} value={school._id}>{school.schoolName}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="manual-school-toggle-wrap">
                <label className="manual-school-toggle">
                  <input
                    type="checkbox"
                    checked={form.schoolEntry === "manual"}
                    onChange={(e) => toggleManualSchool(e.target.checked)}
                  />
                  <span>
                    If your school is not in the list then check here and fill your school manually
                    <span className="manual-school-hindi"> (यदि आपका स्कूल सूची में नहीं है, तो यहाँ चेक करें और स्कूल का नाम स्वयं भरें।)</span>
                  </span>
                </label>
              </div>

              {form.schoolEntry === "manual" && (
                <div className="manual-school-name-field">
                  <Field
                    label="School Name *"
                    value={manualSchoolName}
                    onChange={(e) => setManualSchoolName(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

          </section>

          <section className="form-section">
            <h3><span className="form-section-number">4</span><span>Documents &amp; Photo</span></h3>
            <div className="form-grid">
              <div className="upload-field">
                <div className="upload-heading">
                  <span>{`Upload ${classOfStudent === 8 ? "7th" : "9th"} Class Annual Result`}</span>
                  <small>JPG, PNG, WEBP or PDF · max 5 MB</small>
                </div>

                {resultPreview && (
                  <div className="file-preview-card">
                    {resultIsPdf ? (
                      <iframe
                        className="document-preview"
                        src={resultPreview}
                        title="Previous class annual result preview"
                      />
                    ) : (
                      <img
                        className="document-image-preview"
                        src={resultPreview}
                        alt="Previous class annual result"
                      />
                    )}

                    <div className="file-preview-meta">
                      <strong>
                        {form.previousClassResult?.name ||
                          existingFiles.previousClassResult?.originalName ||
                          "Current uploaded result"}
                      </strong>
                      <span>
                        {form.previousClassResult
                          ? "New file selected. It will replace the current file when you save."
                          : "Current uploaded file"}
                      </span>
                    </div>
                  </div>
                )}

                <label className="replace-file-button">
                  {form.previousClassResult
                    ? "Choose Different Result"
                    : resultPreview
                      ? "Replace Result"
                      : "Choose Result File"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => selectPreviousResult(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="upload-field">
                <div className="upload-heading">
                  <span>Upload Student Image (Optional)</span>
                  <small>JPG, PNG or WEBP · max 5 MB</small>
                </div>

                {studentImagePreview && (
                  <div className="file-preview-card">
                    <img
                      className="student-image-preview"
                      src={studentImagePreview}
                      alt="Student"
                    />
                    <div className="file-preview-meta">
                      <strong>
                        {form.studentImage?.name ||
                          existingFiles.studentImage?.originalName ||
                          "Current student image"}
                      </strong>
                      <span>
                        {form.studentImage
                          ? "New image selected. It will replace the current image when you save."
                          : "Current uploaded image"}
                      </span>
                    </div>
                  </div>
                )}

                <label className="replace-file-button">
                  {form.studentImage
                    ? "Choose Different Image"
                    : studentImagePreview
                      ? "Replace Student Image"
                      : "Choose Student Image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => selectStudentImage(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div className="document-upload-note">
              <strong>Note:</strong> Please upload the document/photo as soon as possible, otherwise your registration will remain pending.
              <span>(कृपया आवश्यक दस्तावेज़/फोटो जल्द से जल्द अपलोड करें, अन्यथा आपका पंजीकरण लंबित रहेगा।)</span>
            </div>
          </section>

          {form.registrationStatus === "Rejected" && form.registrationRemark && (
            <div className="rejection-form-note">
              <strong>Rejection Reason:</strong> {form.registrationRemark}
            </div>
          )}

          {error && <div className="error">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <div className="form-actions">
            <button type="button" className="secondary" onClick={() => navigate(allRegistrationsMode ? `/official/registrations/${examType}` : (officialMode ? "/official" : "/"))}>
              {officialMode ? "Back to Dashboard" : "Cancel"}
            </button>
            <button className="primary" disabled={loading}>
              {loading
                ? "Submitting…"
                : (editMode || officialStudentId)
                  ? "Update Registration"
                  : "Submit Registration"}
            </button>
          </div>
        </form>
      </section>
    );

  return officialMode ? <OfficialShell>{formContent}</OfficialShell> : (
    <div className="public-page">
      <PortalHeader examType={examType} />
      {formContent}
      <PortalFooter examType={examType} />
    </div>
  );
}
