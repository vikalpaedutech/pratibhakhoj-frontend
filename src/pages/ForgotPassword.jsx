import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Field from "../components/Field";
import PortalHeader from "../components/PortalHeader";
import PortalFooter from "../components/PortalFooter";
import { api } from "../api/client";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestReset = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!identifier.trim()) {
      setError("Enter your email address linked to this account.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", {
        contact: identifier.trim(),
        email: identifier.trim(),
      });
      setMessage(response.data?.message || response.data?.data?.message ||
        "If an account with a registered email exists, a password reset link will be sent to it.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to request a password reset right now.");
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });
      navigate("/official/login", {
        replace: true,
        state: { message: "Password reset successfully. Please login with your new password." },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset your password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-page auth-public-page">
      <PortalHeader />
      <div className="public-home-bar auth-home-bar">
        <Link className="public-home-text-link" to="/official/login">← Back to Login</Link>
      </div>
      <section className="auth-page auth-login-page">
        <form
          className="auth-card auth-card-login"
          onSubmit={token ? submitNewPassword : requestReset}
        >
          <div className="eyebrow login-eyebrow">ACCOUNT RECOVERY</div>
          <h2>{token ? "Set a new password" : "Forgot password?"}</h2>

          {!token ? (
            <>
              <p>Enter your registered email address. We’ll send a password reset link to the email linked to your account.</p>
              <Field
                label="Registered email *"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                autoComplete="username"
              />
              <button className="primary full" disabled={loading} type="submit">
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </>
          ) : (
            <>
              <p>Choose a new password for your account. The reset link expires after 30 minutes.</p>
              <Field
                label="New password *"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
              <Field
                label="Confirm new password *"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                autoComplete="new-password"
              />
              <button className="primary full" disabled={loading} type="submit">
                {loading ? "Updating…" : "Reset password"}
              </button>
            </>
          )}

          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
          <Link className="secondary full login-create" to="/official/login">
            Back to Login
          </Link>
        </form>
      </section>
      <PortalFooter />
    </div>
  );
}
