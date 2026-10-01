import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Field from "../components/Field";
import { api, unwrap } from "../api/client";

export default function VerifyOtp() {
  const [params] = useSearchParams();
  const contact = params.get("contact") || "";
  const fromLogin = params.get("fromLogin") === "1";
  const [otp, setOtp] = useState("");
  const [dummyOtp, setDummyOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!contact) setError("Mobile number is missing. Please start registration again.");
  }, [contact]);

  const getOtp = async () => {
    setError(""); setMessage(""); setLoading(true);
    try {
      const data = unwrap(await api.post("/auth/resend-otp", { contact }));
      setDummyOtp(data.otp || "");
      setOtpSent(true);
      setMessage("OTP generated. Enter it below to continue.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate OTP.");
    } finally { setLoading(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = unwrap(await api.post("/auth/verify-otp", { contact, otp }));
      sessionStorage.setItem("registrationToken", data.registrationToken);
      sessionStorage.setItem("registrationContact", contact);
      navigate("/official/create-password", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed.");
    } finally { setLoading(false); }
  };

  return (
    <section className="auth-page auth-register-page">
      <form className="auth-card official-otp-card" onSubmit={submit}>
        <div className="eyebrow register-eyebrow">OFFICIAL REGISTRATION</div>
        <h2>Verify your number</h2>
        <p className="muted">Mobile: <strong>{contact || "—"}</strong></p>
        {fromLogin && <div className="verification-alert"><strong>You need to verify your number before login.</strong><span>Get the OTP below and complete registration.</span></div>}
        {!otpSent ? (
          <button type="button" className="primary full" onClick={getOtp} disabled={loading}>{loading ? "Sending…" : "Get OTP"}</button>
        ) : (
          <>
            {dummyOtp && <div className="otp-display">{dummyOtp}</div>}
            <Field label="OTP *" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required />
            <button className="primary full" disabled={loading}>{loading ? "Verifying…" : "Verify OTP"}</button>
            <button type="button" className="secondary full" onClick={getOtp} disabled={loading}>Resend OTP</button>
          </>
        )}
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error">{error}</div>}
      </form>
    </section>
  );
}
