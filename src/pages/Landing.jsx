import { Link } from "react-router-dom";
import PortalHeader from "../components/PortalHeader";
import PortalFooter from "../components/PortalFooter";
import { useEffect, useState } from "react";
import { api, unwrap } from "../api/client";

export default function Landing() {
  const [settings, setSettings] = useState({ examActive: true, landingMessage: "Registrations coming soon" });
  useEffect(() => { api.get("/exam-controller/public").then((response) => setSettings((current) => ({ ...current, ...(unwrap(response) || {}) }))).catch(() => {}); }, []);
  return (
    <div className="public-page landing-page">
      <PortalHeader />

      <main className="landing-main">
        {settings.examActive === false ? <section className="registration-options"><div className="registration-option"><strong>{settings.landingMessage || "Registrations coming soon"}</strong></div></section> : <section className="registration-options">
          <Link to="/register/MB" className="registration-option">
            <span className="option-number">01</span>
            <strong>Registration for Mission Buniyaad</strong>
            <small><span className="class-highlight">Class 8</span>  (कक्षा 8 के विद्यार्थी)</small>
            <em>Click here for registration →</em>
          </Link>

          <Link to="/register/HS100" className="registration-option">
            <span className="option-number">02</span>
            <strong>Registration for Haryana Super 100</strong>
            <small><span className="class-highlight">Class 10</span> (कक्षा 10 के विद्यार्थी)</small>
            <em>Click here for registration →</em>
          </Link>
        </section>}

        {settings.examActive !== false && <section className="official-entry landing-official">
          <Link to="/official/login">→ Officials Login - (Bulk Registrations)</Link>
          <span>SCHOOL / ABRC / BRP / DSS</span>
        </section>}
      </main>

      <PortalFooter />
    </div>
  );
}
