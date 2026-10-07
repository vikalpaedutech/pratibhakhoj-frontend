import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, unwrap } from "../api/client";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email address…");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Keep the same verification request across React StrictMode's development
  // effect re-run. The backend intentionally consumes the token after success,
  // so a second HTTP request with the same token must not be made.
  const verificationRequestRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    if (!token) {
      setStatus("error");
      setError("Verification link is missing.");
      return () => {
        mountedRef.current = false;
      };
    }

    if (!verificationRequestRef.current) {
      verificationRequestRef.current = api.get(
        `/auth/verify-email?token=${encodeURIComponent(token)}`
      );
    }

    const verificationRequest = verificationRequestRef.current;

    verificationRequest
      .then((response) => {
        if (!mountedRef.current) return;

        const data = unwrap(response);

        if (data?.registrationToken) {
          sessionStorage.setItem("registrationToken", data.registrationToken);
        }
        sessionStorage.setItem("registrationContact", data?.contact || "");
        sessionStorage.setItem("registrationEmail", data?.email || "");

        setStatus("success");
        setMessage(
          "Your email has been verified. Redirecting you to finish account setup…"
        );

        setTimeout(() => {
          if (mountedRef.current) {
            navigate("/official/create-password", { replace: true });
          }
        }, 1200);
      })
      .catch((err) => {
        if (!mountedRef.current) return;

        setStatus("error");
        setError(
          err.response?.data?.message ||
            "This verification link is invalid or has expired."
        );
      });

    return () => {
      mountedRef.current = false;
    };
  }, [token, navigate]);

  return (
    <section className="auth-page">
      <div className="auth-card center">
        <div className="eyebrow">OFFICIAL REGISTRATION</div>
        <h2>
          {status === "loading"
            ? "Verifying your email"
            : status === "success"
              ? "Email verified"
              : "Verification failed"}
        </h2>

        {status === "loading" && (
          <div className="loading">Please wait…</div>
        )}

        {status === "success" && (
          <div className="success-message">{message}</div>
        )}

        {status === "error" && (
          <>
            <div className="error">{error}</div>
            <Link
              className="primary full"
              to="/official/register"
            >
              Start registration again
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
