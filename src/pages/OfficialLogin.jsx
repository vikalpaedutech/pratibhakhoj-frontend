import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Field from "../components/Field";
import PortalHeader from "../components/PortalHeader";
import PortalFooter from "../components/PortalFooter";
import { useAuth } from "../context/AuthContext";

export default function OfficialLogin() {
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleContactChange = (event) => {
    setContact(event.target.value.slice(0, 50));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(contact, password);
      navigate(data.role?.code === "ADMIN" ? "/admin" : "/official", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || "";
      if (status === 404) setError("You have not registered. Please create your account first.");
      else if (status === 401) setError("Invalid credentials.");
      else if (status === 403 && err.response?.data?.errors?.[0]?.code === "MOBILE_NOT_VERIFIED") {
        const unverifiedContact = err.response.data.errors[0].contact || contact;
        navigate(`/official/verify-otp?contact=${encodeURIComponent(unverifiedContact)}&fromLogin=1`);
      } else setError(message || "Unable to login right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-page auth-public-page">
      <PortalHeader />
      <div className="public-home-bar auth-home-bar"><Link className="public-home-text-link" to="/">← Home</Link></div>
      <section className="auth-page auth-login-page">
      <form className="auth-card auth-card-login" onSubmit={submit}>
        <div className="eyebrow login-eyebrow">OFFICIALS LOGIN</div>
        <h2>Sign in</h2>

        <Field
          label="Registered Mobile Number *"
          value={contact}
          inputMode="text"
          maxLength={50}
          onChange={handleContactChange}
          required
          autoComplete="username"
        />

        <p className="login-hindi">
          (यदि आपने अपना मोबाइल नंबर अभी तक पंजीकृत नहीं किया है, तो "Create Account" पर क्लिक करके नंबर पंजीकृत करें।)
        </p>

        <Field
          label="Password *"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <button className="primary full" disabled={loading} type="submit">
          {loading ? "Signing in…" : "Login"}
        </button>

        {error && <div className="error">{error}</div>}

        <Link className="secondary full login-create" to="/official/register">
          Create Account
        </Link>
      </form>
      </section>
      <PortalFooter />
    </div>
  );
}
