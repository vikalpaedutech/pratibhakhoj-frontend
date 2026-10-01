import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Field from "../components/Field";
import { api } from "../api/client";

export default function CreatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const contact = sessionStorage.getItem("registrationContact") || "";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const registrationToken = sessionStorage.getItem("registrationToken");
    if (!registrationToken) return setError("Registration session expired. Please start again.");
    if (password.length < 6) return setError("Password must contain at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      await api.post("/auth/create-password", { registrationToken, password, confirmPassword });
      sessionStorage.removeItem("registrationToken");
      sessionStorage.removeItem("registrationContact");
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create account.");
    } finally { setLoading(false); }
  };

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="eyebrow">COMPLETE REGISTRATION</div>
        <h2>Create your password</h2>
        <p className="muted">Mobile number verified: <strong>{contact || "—"}</strong></p>
        <Field label="Create Password *" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        <Field label="Confirm Password *" type="password" minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
        {error && <div className="error">{error}</div>}
        <button className="primary full" disabled={loading}>{loading ? "Creating account…" : "Create Account"}</button>
      </form>
      {success && (
        <div className="modal-backdrop">
          <div className="modal center">
            <div className="success-mark">✓</div>
            <h3>Account created successfully</h3>
            <p>Your official account is now active. Login with your registered mobile number and password.</p>
            <button className="primary full" onClick={() => navigate("/official/login", { replace: true })}>Continue to Login</button>
          </div>
        </div>
      )}
    </section>
  );
}
