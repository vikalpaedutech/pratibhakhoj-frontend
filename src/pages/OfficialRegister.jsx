import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Field from "../components/Field";
import ReactSelect from "../components/ReactSelect";
import PortalHeader from "../components/PortalHeader";
import PortalFooter from "../components/PortalFooter";
import { api, unwrap } from "../api/client";

const ROLE_SCOPE = {
  ACI: "district",
  CENTER_COORDINATOR: "block",
  HKRN: "block",
  ABRC: "block",
  PRINCIPAL: "school",
  TEACHER: "school",
  SCHOOL_STAFF: "school",
  VIKALPA_STAFF: "global",
};

export default function OfficialRegister() {
  const [roles, setRoles] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [blocksByDistrict, setBlocksByDistrict] = useState({});
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({ name: "", contact: "", roleId: "" });
  const [districtIds, setDistrictIds] = useState([]);
  const [blockIds, setBlockIds] = useState([]);
  const [schoolSelection, setSchoolSelection] = useState({ districtId: "", blockId: "", schoolId: "" });
  const [stage, setStage] = useState("details");
  const [otp, setOtp] = useState("");
  const [dummyOtp, setDummyOtp] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get("/auth/roles"), api.get("/regions/districts")])
      .then(([rolesResponse, districtsResponse]) => {
        setRoles(unwrap(rolesResponse));
        setDistricts(unwrap(districtsResponse));
      })
      .catch((err) => setError(err.response?.data?.message || "Unable to load registration data."));
  }, []);

  const selectedRole = useMemo(
    () => roles.find((role) => role._id === form.roleId),
    [roles, form.roleId]
  );

  const scope = selectedRole ? ROLE_SCOPE[selectedRole.code] : null;

  const loadBlocks = async (districtId) => {
    if (blocksByDistrict[districtId]) return blocksByDistrict[districtId];
    const data = unwrap(await api.get(`/regions/blocks?districtId=${districtId}`));
    setBlocksByDistrict((current) => ({ ...current, [districtId]: data }));
    return data;
  };

  const loadSchools = async (districtId, blockId) => {
    const data = unwrap(await api.get(`/regions/schools?districtId=${districtId}&blockId=${blockId}`));
    setSchools(data);
    return data;
  };

  const handleRole = (roleId) => {
    setForm((current) => ({ ...current, roleId }));
    setDistrictIds([]);
    setBlockIds([]);
    setBlockIdsByDistrict({});
    setSchoolSelection({ districtId: "", blockId: "", schoolId: "" });
    setSchools([]);
    setError("");
  };

  // Kept as a small map for compatibility with the existing region-building
  // structure; the visible selector itself is a single multi-select for blocks.
  const [blockIdsByDistrict, setBlockIdsByDistrict] = useState({});

  const handleDistricts = async (ids) => {
    setDistrictIds(ids);

    const nextMap = {};
    ids.forEach((id) => {
      nextMap[id] = blockIdsByDistrict[id] || [];
    });
    setBlockIdsByDistrict(nextMap);

    const allowedBlockIds = Object.values(nextMap).flat();
    setBlockIds((current) =>
      current.filter((blockId) => allowedBlockIds.some((id) => String(id) === String(blockId)))
    );

    if (scope === "block") {
      try {
        await Promise.all(ids.map(loadBlocks));
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load blocks.");
      }
    }
  };

  const handleBlocks = (ids) => {
    setBlockIds(ids);

    const nextMap = {};
    ids.forEach((blockId) => {
      const districtId = Object.entries(blocksByDistrict).find(([, blocks]) =>
        blocks.some((block) => String(block._id) === String(blockId))
      )?.[0];
      if (districtId) {
        nextMap[districtId] = [...(nextMap[districtId] || []), blockId];
      }
    });
    setBlockIdsByDistrict(nextMap);
  };

  const handleSchoolDistrict = async (districtId) => {
    setSchoolSelection({ districtId, blockId: "", schoolId: "" });
    setSchools([]);
    if (!districtId) return;
    try {
      await loadBlocks(districtId);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load blocks.");
    }
  };

  const handleSchoolBlock = async (blockId) => {
    const districtId = schoolSelection.districtId;
    setSchoolSelection((current) => ({ ...current, blockId, schoolId: "" }));
    setSchools([]);
    if (!districtId || !blockId) return;

    try {
      await loadSchools(districtId, blockId);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load schools.");
    }
  };

  const blockOptions = useMemo(() => {
    return districtIds.flatMap((districtId) => {
      const district = districts.find((item) => String(item._id) === String(districtId));
      return (blocksByDistrict[districtId] || []).map((block) => ({
        value: block._id,
        label: `${block.blockName} (${district?.districtName || "District"})`,
      }));
    });
  }, [districtIds, districts, blocksByDistrict]);

  const buildRegions = () => {
    if (scope === "global") return [{ scope: "global" }];

    if (scope === "district") {
      return districtIds.map((districtId) => ({ scope, districtId }));
    }

    if (scope === "block") {
      return Object.entries(blockIdsByDistrict).flatMap(([districtId, blockIdsForDistrict]) =>
        blockIdsForDistrict.map((blockId) => ({
          scope,
          districtId,
          blockId,
        }))
      );
    }

    if (scope === "school") {
      const { districtId, blockId, schoolId } = schoolSelection;
      return districtId && blockId && schoolId
        ? [{ scope, districtId, blockId, schoolId }]
        : [];
    }

    return [];
  };

  const requestOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim()) return setError("Enter your name.");
    if (!/^\d{10}$/.test(form.contact)) return setError("Enter a valid 10 digit mobile number.");
    if (!selectedRole || !scope) return setError("Select your designation.");

    const regions = buildRegions();
    if (scope !== "global" && !regions.length) {
      return setError("Select the region required for your designation.");
    }

    if (scope === "block" && !blockIds.length) {
      return setError("Select at least one block.");
    }

    setLoading(true);
    try {
      const data = unwrap(await api.post("/auth/register", { ...form, regions }));
      setDummyOtp(data.otp || "");
      setStage("otp");
      setMessage("OTP has been generated. Enter the OTP to verify your mobile number.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to start registration.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = unwrap(await api.post("/auth/verify-otp", {
        contact: form.contact,
        otp,
      }));
      setRegistrationToken(data.registrationToken);
      setStage("password");
      setMessage("Mobile number verified. Create your password to finish registration.");
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const createPassword = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) return setError("Password must contain at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);

    try {
      await api.post("/auth/create-password", {
        registrationToken,
        password,
        confirmPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create your password.");
    } finally {
      setLoading(false);
    }
  };

  const resetRegistration = () => {
    setStage("details");
    setOtp("");
    setDummyOtp("");
    setRegistrationToken("");
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setError("");
  };

  return (
    <div className="public-page auth-public-page">
      <PortalHeader />
      <div className="public-home-bar auth-home-bar"><Link className="public-home-text-link" to="/">← Home</Link></div>
      <section className="auth-page auth-register-page">
      <form
        className="auth-card wide official-register-card"
        onSubmit={
          stage === "details"
            ? requestOtp
            : stage === "otp"
              ? verify
              : createPassword
        }
      >
        <div className="eyebrow register-eyebrow">OFFICIAL REGISTRATION</div>

        <h2>
          {stage === "details"
            ? "Create official account"
            : stage === "otp"
              ? "Verify your mobile number"
              : "Create your password"}
        </h2>

        {stage === "otp" && (
          <p className="muted register-stage-text">
            OTP verification for <strong>{form.contact}</strong>
          </p>
        )}

        {stage === "password" && (
          <p className="muted register-stage-text">
            Your mobile number is verified. Set a secure password to complete your account.
          </p>
        )}

        {stage === "details" && (
          <>
            <div className="form-grid">
              <Field
                label="Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />

              <label className="field">
                <span>Role *</span>
                <select
                  value={form.roleId}
                  onChange={(e) => handleRole(e.target.value)}
                  required
                >
                  <option value="">Select designation</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedRole && (
              <div className="section-panel official-region-panel">
                <div className="section-title">Select your region</div>

                {scope === "global" && (
                  <div className="info-box">
                    Vikalpa Staff has global access. No region selection is required.
                  </div>
                )}

                {scope === "district" && (
                  <ReactSelect
                    label="District *"
                    placeholder="Select one or more districts"
                    options={districts.map((district) => ({
                      value: district._id,
                      label: district.districtName,
                    }))}
                    value={districtIds}
                    onChange={handleDistricts}
                    isMulti
                  />
                )}

                {scope === "block" && (
                  <div className="official-block-region-grid">
                    <ReactSelect
                      label="District *"
                      placeholder="Select one or more districts"
                      options={districts.map((district) => ({
                        value: district._id,
                        label: district.districtName,
                      }))}
                      value={districtIds}
                      onChange={handleDistricts}
                      isMulti
                    />

                    <ReactSelect
                      label="Blocks *"
                      placeholder={
                        districtIds.length
                          ? "Select one or more blocks"
                          : "Select district(s) first"
                      }
                      options={blockOptions}
                      value={blockIds}
                      onChange={handleBlocks}
                      isMulti
                      isDisabled={!districtIds.length}
                    />
                  </div>
                )}

                {scope === "school" && (
                  <div className="form-grid">
                    <ReactSelect
                      label="District *"
                      placeholder="Select district"
                      options={districts.map((district) => ({
                        value: district._id,
                        label: district.districtName,
                      }))}
                      value={schoolSelection.districtId}
                      onChange={handleSchoolDistrict}
                    />

                    <ReactSelect
                      label="Block *"
                      placeholder="Select block"
                      options={(blocksByDistrict[schoolSelection.districtId] || []).map((block) => ({
                        value: block._id,
                        label: block.blockName,
                      }))}
                      value={schoolSelection.blockId}
                      onChange={handleSchoolBlock}
                      isDisabled={!schoolSelection.districtId}
                    />

                    <ReactSelect
                      label="School *"
                      placeholder="Select school"
                      options={schools.map((school) => ({
                        value: school._id,
                        label: school.schoolName,
                      }))}
                      value={schoolSelection.schoolId}
                      onChange={(schoolId) =>
                        setSchoolSelection((current) => ({ ...current, schoolId }))
                      }
                      isDisabled={!schoolSelection.blockId}
                    />
                  </div>
                )}
              </div>
            )}

            <Field
              label="Mobile *"
              value={form.contact}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) =>
                setForm({
                  ...form,
                  contact: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              required
            />

            <button className="primary full" disabled={loading}>
              {loading ? "Sending OTP…" : "Get OTP"}
            </button>
          </>
        )}

        {stage === "otp" && (
          <>
            {dummyOtp && <div className="otp-display">{dummyOtp}</div>}

            <Field
              label="OTP *"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />

            <button className="primary full" disabled={loading}>
              {loading ? "Verifying…" : "Verify OTP"}
            </button>

            <button
              type="button"
              className="secondary full"
              onClick={resetRegistration}
            >
              Back
            </button>
          </>
        )}

        {stage === "password" && (
          <>
            <Field
              label="Create Password *"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Field
              label="Confirm Password *"
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <button className="primary full" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </>
        )}

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error">{error}</div>}

        <p className="muted center register-login-link">
          Already registered? <Link to="/official/login">Login</Link>
        </p>
      </form>

      {success && (
        <div className="modal-backdrop">
          <div className="modal center">
            <div className="success-mark">✓</div>
            <h3>Account created successfully</h3>
            <p>
              Your account has been created successfully. You can now login with your registered mobile number and password.
            </p>
            <button
              className="primary full"
              onClick={() => navigate("/official/login", { replace: true })}
            >
              Continue to Login
            </button>
          </div>
        </div>
      )}
      </section>
      <PortalFooter />
    </div>
  );
}
